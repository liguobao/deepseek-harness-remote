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
  it('copies legacy user settings once without deleting the rollback section', async () => {
    const replace = vi.fn(async () => undefined)
    const descriptors = [
      { ns: 'ds-harness-remote', user: undefined },
      { ns: 'dsh-remote', user: { role: 'both', serverUrl: 'https://remote.example.com' } },
    ]
    const provider = {
      register: vi.fn(),
      describe: vi.fn(() => descriptors),
    }

    await expect(remotePlugin.migrateLegacySettings(provider as never, { replace } as never)).resolves.toBe('migrated')
    expect(replace).toHaveBeenCalledWith({ role: 'both', serverUrl: 'https://remote.example.com' })
    expect(provider.register).not.toHaveBeenCalled()
    expect(descriptors[1]?.user).toEqual({ role: 'both', serverUrl: 'https://remote.example.com' })
  })

  it('does not overwrite current user settings with a legacy section', async () => {
    const replace = vi.fn(async () => undefined)
    const provider = {
      register: vi.fn(),
      describe: vi.fn(() => [
        { ns: 'ds-harness-remote', user: { role: 'client' } },
        { ns: 'dsh-remote', user: { role: 'host' } },
      ]),
    }

    await expect(remotePlugin.migrateLegacySettings(provider as never, { replace } as never)).resolves.toBe('skipped')
    expect(replace).not.toHaveBeenCalled()
  })

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
      expect(ctx.dshRemote.diagnostics()).toMatchObject({
        loaded: true,
        capabilities: expect.arrayContaining(['harness.api.v1', 'harness.api.transfer.v1']),
      })
    })
    expect(identityReadyWhenControlRegistered).toBe(false)

    await fiber.dispose()
    expect(ctx.get('dshRemote')).toBeUndefined()
    await ctx.fiber.dispose()
  })

  it('loads a TUI Host against the alpha Remote Gateway without a Desktop connection service', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-remote-alpha-cordis-'))
    directories.push(dshHome)
    vi.stubEnv('DSH_HOME', dshHome)

    const ctx = new Context()
    ctx.provide('settings', settings({ deviceName: 'Cordis alpha host' }))
    ctx.provide('typertGateway', {
      invoke: vi.fn(async () => undefined),
      dispatchRpc: vi.fn(async () => ({ ok: true, value: undefined })),
      openWireStream: vi.fn(async () => (async function* () { return })()),
      wireStream: {
        open: vi.fn(async () => (async function* () { return })()),
        failure: vi.fn(() => ({ code: 'internal', message: 'failed', details: {} })),
      },
    } as never)
    const fiber = await ctx.plugin(remotePlugin, { deviceName: 'Cordis alpha host' })

    await vi.waitFor(() => {
      expect(ctx.dshRemote.currentIdentity()).toMatchObject({ name: 'Cordis alpha host' })
      expect(ctx.dshRemote.diagnostics()).toMatchObject({ loaded: true, serverConfigured: true })
    })
    expect(ctx.get('dshRemoteClient')).toBeUndefined()

    await fiber.dispose()
    expect(ctx.get('dshRemote')).toBeUndefined()
    await ctx.fiber.dispose()
  })

  it('keeps the TUI command available when rc.2 has no Component admission', async () => {
    const register = vi.fn((_definition: unknown) => vi.fn())
    const registerCommand = vi.fn((_context: unknown, _definition: unknown) => {
      throw Object.assign(new Error('the calling activation has no verified dsh-plugin.json Component identity'), {
        code: 'COMPONENT_NOT_ADMITTED',
      })
    })
    const ctx = new Context()
    ctx.provide('commands', { register })
    ctx.provide('tuiPluginHost', { registerCommand })
    ctx.provide('tuiCommandTrees', { register: vi.fn(() => vi.fn()) })
    ctx.provide('tuiScenes', { register: vi.fn(() => vi.fn()), open: vi.fn(() => true) })
    ctx.provide('settings', settings({ enabled: false }))
    ctx.provide('typertGateway', typertGateway())

    const fiber = await ctx.plugin(remotePlugin, { enabled: false })

    expect(fiber.state).toBe(2)
    expect(registerCommand).toHaveBeenCalledOnce()
    expect(register).toHaveBeenCalledOnce()
    expect(register.mock.calls[0]?.[0]).toMatchObject({ name: 'remote' })

    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('prefers mediated TUI command registration when Component admission is available', async () => {
    const register = vi.fn((_definition: unknown) => vi.fn())
    const registerCommand = vi.fn((_context: unknown, _definition: unknown) => vi.fn())
    const ctx = new Context()
    ctx.provide('commands', { register })
    ctx.provide('tuiPluginHost', { registerCommand })
    ctx.provide('tuiCommandTrees', { register: vi.fn(() => vi.fn()) })
    ctx.provide('tuiScenes', { register: vi.fn(() => vi.fn()), open: vi.fn(() => true) })
    ctx.provide('settings', settings({ enabled: false }))
    ctx.provide('typertGateway', typertGateway())

    const fiber = await ctx.plugin(remotePlugin, { enabled: false })

    expect(fiber.state).toBe(2)
    expect(registerCommand).toHaveBeenCalledOnce()
    expect(registerCommand.mock.calls[0]?.[1]).toMatchObject({ name: 'remote' })
    expect(register).not.toHaveBeenCalled()

    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('waits for a late legacy ApiProxy instead of activating rc.2 without it', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-remote-late-apiproxy-'))
    directories.push(dshHome)
    vi.stubEnv('DSH_HOME', dshHome)

    const ctx = new Context()
    ctx.provide('settings', settings({ deviceName: 'Cordis delayed rc.2 host' }))
    ctx.provide('typertGateway', typertGateway())
    ctx.provide('connection', connection())
    const fiber = await ctx.plugin(remotePlugin, { deviceName: 'Cordis delayed rc.2 host' })

    expect(ctx.get('dshRemote')).toBeUndefined()
    ctx.provide('apiProxy', apiProxy())
    await vi.waitFor(() => {
      expect(ctx.dshRemote.currentIdentity()).toMatchObject({ name: 'Cordis delayed rc.2 host' })
    })

    await fiber.dispose()
    expect(ctx.get('dshRemote')).toBeUndefined()
    await ctx.fiber.dispose()
  })

  it('starts the retained Client runtime for a saved Client configuration', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-remote-host-only-'))
    directories.push(dshHome)
    vi.stubEnv('DSH_HOME', dshHome)
    const replace = vi.fn(async () => undefined)
    const describeHost = vi.fn(async request => ({
      rpcId: request.rpcId,
      result: {
        ok: true as const,
        value: {
          version: '0.1.0-rc.8',
          cwd: '/workspace',
          attachedSessions: 0,
          home: '/home/tester',
          canOpenPath: false,
        },
      },
    }))
    const ctx = new Context()
    ctx.provide('settings', {
      register: () => ({
        get: () => ({ role: 'client', deviceName: 'Former client', serverUrl: 'https://dsh.r2049.cn' }),
        replace,
      }),
    } as never)
    ctx.provide('apiProxy', apiProxy(describeHost))
    ctx.provide('typertGateway', typertGateway())
    ctx.provide('connection', connection())

    const fiber = await ctx.plugin(remotePlugin, { role: 'client', deviceName: 'Former client' })

    await vi.waitFor(() => {
      expect(ctx.dshRemote.currentIdentity()).toMatchObject({ name: 'Former client' })
      expect(ctx.get('dshRemoteClient')).toBeDefined()
    })
    expect(replace).not.toHaveBeenCalled()
    expect(describeHost).toHaveBeenCalledOnce()

    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('disables legacy loader entries during startup', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-remote-legacy-loader-'))
    directories.push(dshHome)
    vi.stubEnv('DSH_HOME', dshHome)

    const entries = [
      { id: 'legacy-package', options: { name: 'dsh-remote' } },
      { id: 'legacy-workspace', options: { name: '@dsh-remote/plugin' } },
      { id: 'current', options: { name: 'ds-harness-remote' } },
    ]
    const loader = {
      entries: () => entries.values(),
      locate: () => 'current',
      update: vi.fn(async (id: string, options: { disabled?: boolean | null }) => {
        const entry = entries.find(item => item.id === id)
        if (entry !== undefined) Object.assign(entry.options, options)
      }),
    }
    const ctx = new Context()
    ctx.provide('loader', loader)
    ctx.provide('settings', settings({ deviceName: 'Cordis migration host' }))
    ctx.provide('apiProxy', apiProxy())
    ctx.provide('typertGateway', typertGateway())
    ctx.provide('connection', connection())

    const fiber = await ctx.plugin(remotePlugin, { deviceName: 'Cordis migration host' })

    await vi.waitFor(() => {
      expect(ctx.dshRemote.currentIdentity()).toMatchObject({ name: 'Cordis migration host' })
    })
    expect(loader.update).toHaveBeenCalledWith('legacy-package', { disabled: true })
    expect(loader.update).toHaveBeenCalledWith('legacy-workspace', { disabled: true })
    expect(loader.update).not.toHaveBeenCalledWith('current', expect.anything())

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

function apiProxy(describeHost?: ApiProxy['host']['describe']): ApiProxy {
  const empty = {}
  return {
    sessions: empty,
    subagents: empty,
    host: describeHost === undefined ? empty : { describe: describeHost },
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
