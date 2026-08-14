import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy/api'
import { describe, expect, it, vi } from 'vitest'
import { ApiProxySwitch } from '../src/api-proxy-switch.js'

describe('ApiProxySwitch', () => {
  it('switches native session calls without replacing the official service identity', async () => {
    const localList = vi.fn(async () => 'local')
    const remoteList = vi.fn(async () => 'remote')
    const local = api(localList)
    const remote = api(remoteList)
    const serviceIdentity = local
    const target = new ApiProxySwitch(local)

    target.install()
    await expect(callList(local, '1')).resolves.toBe('local')
    target.selectRemote(remote, { deviceId: 'host-1', name: 'Remote Host' })
    await expect(callList(local, '2')).resolves.toBe('remote')
    expect(local).toBe(serviceIdentity)
    expect(target.status()).toEqual({ mode: 'remote', target: { deviceId: 'host-1', name: 'Remote Host' } })

    target.selectLocal()
    await expect(callList(local, '3')).resolves.toBe('local')
  })
})

function api(list: (...args: unknown[]) => Promise<unknown>): ApiProxy {
  const empty = {}
  return {
    sessions: { list },
    subagents: empty,
    host: empty,
    workspace: empty,
    skills: empty,
    agentPresets: empty,
    goals: empty,
    settings: empty,
    credentials: empty,
    llm: empty,
    events: empty,
    downloads: empty,
    respond: async () => ({ accepted: true }),
  } as unknown as ApiProxy
}

function callList(api: ApiProxy, rpcId: string): Promise<unknown> {
  const list = api.sessions.list as unknown as (request: unknown) => Promise<unknown>
  return list({ rpcId, payload: {} })
}
