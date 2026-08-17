import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy/api'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as remotePlugin from '../src/index.js'

const directories: string[] = []

afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('Cordis plugin lifecycle', () => {
  it('does not block Harness startup while runtime services are unavailable', async () => {
    const ctx = new Context()
    const fiber = await ctx.plugin(remotePlugin, { deviceName: 'Cordis pending host' })

    expect(fiber.state).toBe(2)
    expect(fiber.inject).toEqual({})
    expect(ctx.get('dshRemote')).toBeUndefined()

    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('loads against ApiProxy and disposes its runtime', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-remote-cordis-'))
    directories.push(dshHome)
    vi.stubEnv('DSH_HOME', dshHome)

    const ctx = new Context()
    let identityReadyWhenControlRegistered: boolean | undefined
    ctx.provide('settings', settings({ deviceName: 'Cordis test host' }))
    ctx.provide('apiProxy', apiProxy())
    ctx.provide('typertGateway', typertGateway())
    ctx.provide('connection', connection(() => {
      try {
        ctx.dshRemote.currentIdentity()
        identityReadyWhenControlRegistered = true
      } catch {
        identityReadyWhenControlRegistered = false
      }
    }))
    const fiber = await ctx.plugin(remotePlugin, { deviceName: 'Cordis test host' })

    await vi.waitFor(() => {
      expect(ctx.dshRemote.currentIdentity()).toMatchObject({ name: 'Cordis test host' })
      expect(ctx.dshRemote.diagnostics()).toMatchObject({ loaded: true })
    })
    expect(identityReadyWhenControlRegistered).toBe(false)

    await fiber.dispose()
    expect(ctx.get('dshRemote')).toBeUndefined()
    await ctx.fiber.dispose()
  })

  it('starts the retained Client runtime for a saved Client configuration', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-remote-host-only-'))
    directories.push(dshHome)
    vi.stubEnv('DSH_HOME', dshHome)
    const replace = vi.fn(async () => undefined)
    const ctx = new Context()
    ctx.provide('settings', {
      register: () => ({
        get: () => ({ role: 'client', deviceName: 'Former client', serverUrl: 'https://dsh.r2049.cn' }),
        replace,
      }),
    } as never)
    ctx.provide('apiProxy', apiProxy())
    ctx.provide('typertGateway', typertGateway())
    ctx.provide('connection', connection())

    const fiber = await ctx.plugin(remotePlugin, { role: 'client', deviceName: 'Former client' })

    await vi.waitFor(() => {
      expect(ctx.dshRemote.currentIdentity()).toMatchObject({ name: 'Former client' })
      expect(ctx.get('dshRemoteClient')).toBeDefined()
    })
    expect(replace).not.toHaveBeenCalled()

    await fiber.dispose()
    await ctx.fiber.dispose()
  })
})

function settings(value: Record<string, unknown>) {
  return {
    register: () => ({
      get: () => value,
      replace: vi.fn(async () => undefined),
    }),
  } as never
}

function connection(onHandle?: () => void) {
  return {
    rpc: {
      handle: vi.fn(() => {
        onHandle?.()
        return async () => undefined
      }),
    },
  } as never
}

function typertGateway() {
  return { invoke: vi.fn(async () => undefined) } as never
}

function apiProxy(): ApiProxy {
  const empty = {}
  return {
    sessions: empty,
    subagents: empty,
    host: empty,
    workspace: empty,
    skills: empty,
    agentPresets: empty,
    goals: empty,
    settings: empty,
    credentials: empty,
    llm: empty,
    events: { mux: async function* () { return }, host: async function* () { return } },
    downloads: empty,
    respond: async () => ({ accepted: true }),
  } as unknown as ApiProxy
}
