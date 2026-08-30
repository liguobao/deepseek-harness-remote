import { beforeEach, describe, expect, it, vi } from 'vitest'

class FakeCore {
  private readonly closeHandlers = new Set<() => void>()
  private readonly eventHandlers = new Set<(event: unknown) => void>()
  readonly rpcCalls: Array<{ method: string; params?: unknown }> = []

  async connect(): Promise<void> {}

  async rpc(method: string, params?: unknown): Promise<unknown> {
    this.rpcCalls.push({ method, params })
    if (method === 'harness.transport.describe') return { capabilities: testState.capabilities }
    if (method === 'harness.api.stream.open') return {}
    if (method === 'harness.api.stream.close') return {}
    if (method === 'harness.remote.stream.open') return {}
    if (method === 'harness.remote.stream.close') return {}
    if (method === 'harness.remote.call') {
      const request = params as { endpoint?: string }
      if (request.endpoint === 'commands/execute') {
        return { ok: true, value: { commandId: 'permission', result: { kind: 'success' } } }
      }
      return { ok: true, value: undefined }
    }
    return {}
  }

  onEvent(handler: (event: unknown) => void): () => void {
    this.eventHandlers.add(handler)
    return () => this.eventHandlers.delete(handler)
  }

  onClose(handler: () => void): () => void {
    this.closeHandlers.add(handler)
    return () => this.closeHandlers.delete(handler)
  }

  getStats() { return { mode: 'Relay', connected: true } }

  async close(): Promise<void> {
    for (const handler of this.closeHandlers) handler()
  }
}

const testState = vi.hoisted(() => ({
  capabilities: ['harness.api.v1'] as string[],
  cores: [] as FakeCore[],
}))

vi.mock('@dsh-remote/client-core', async () => {
  const actual = await vi.importActual<typeof import('@dsh-remote/client-core')>('@dsh-remote/client-core')
  return {
    ...actual,
    RemoteClientCore: class {
      constructor() {
        const core = new FakeCore()
        testState.cores.push(core)
        return core
      }
    },
  }
})

vi.mock('@dsh-remote/webrtc', () => ({ AdaptiveTransport: class {} }))
vi.mock('../src/services/secure-transport', () => ({ SecureTransport: class {} }))

import { AndroidRemoteConnection } from '../src/services/connection'
import type { DeviceIdentity, RemoteDevice } from '../src/types'

const identity: DeviceIdentity = {
  deviceId: 'client-1',
  name: 'Android',
  platform: 'android',
  publicKey: 'client-public',
  privateKey: 'client-private',
}

const host: RemoteDevice = {
  deviceId: 'host-1',
  name: 'Host',
  platform: 'darwin',
  identityKey: 'host-public',
  membershipId: 'membership-1',
  online: true,
  trusted: true,
}

describe('AndroidRemoteConnection Harness transport selection', () => {
  beforeEach(() => {
    testState.capabilities = ['harness.api.v1']
    testState.cores.length = 0
  })

  it('opens the legacy ApiProxy mux for older Hosts', async () => {
    const connection = new AndroidRemoteConnection()
    await connection.connect('https://server.example.com', identity, host, 'access-token', () => undefined, { forceRelay: true })

    expect(testState.cores[0]?.rpcCalls.map(call => call.method)).toContain('harness.api.stream.open')

    await connection.close()
  })

  it('uses alpha Typert Remote without opening the ApiProxy mux', async () => {
    testState.capabilities = ['harness.remote.v1', 'harness.remote.transfer.v1']
    const connection = new AndroidRemoteConnection()
    await connection.connect('https://server.example.com', identity, host, 'access-token', () => undefined, { forceRelay: true })
    const proxy = connection.requireProxy()

    await proxy.sessionSelectPermission('session-1', 'default')

    const methods = testState.cores[0]?.rpcCalls.map(call => call.method) ?? []
    expect(methods).not.toContain('harness.api.stream.open')
    expect(testState.cores[0]?.rpcCalls).toContainEqual({
      method: 'harness.remote.call',
      params: {
        endpoint: 'commands/execute',
        payload: { args: { agentId: 'session-1', line: '/permission default', images: [] } },
      },
    })

    await connection.close()
  })
})
