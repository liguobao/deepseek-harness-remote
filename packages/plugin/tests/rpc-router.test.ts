import { createRpcRequest } from '@dsh-remote/protocol'
import { describe, expect, it, vi } from 'vitest'
import type { HarnessApiBridge } from '../src/harness-api-bridge.js'
import { RpcRouter } from '../src/rpc-router.js'

describe('RpcRouter', () => {
  it('forwards only native ApiProxy traffic', async () => {
    const call = vi.fn(async () => ({ rpcId: 'native-1', result: { ok: true, value: [] } }))
    const router = createRouter({ call })
    const response = await router.handle(createRpcRequest('harness.api.call', {
      method: 'session.list', rpcId: 'native-1', payload: {},
    }))
    expect(call).toHaveBeenCalledWith({ method: 'session.list', rpcId: 'native-1', payload: {} })
    expect(response).toMatchObject({ type: 'rpc.response', payload: { result: { rpcId: 'native-1' } } })

    const legacy = await router.handle({
      v: 1, id: 'legacy-1', type: 'rpc.request', timestamp: Date.now(), payload: { method: 'sessions.list', params: {} },
    })
    expect(legacy).toMatchObject({ type: 'rpc.error', payload: { code: 'METHOD_NOT_FOUND' } })
    const unknown = await router.handle({
      v: 1, id: 'unknown-1', type: 'rpc.request', timestamp: Date.now(), payload: { method: 'shell.exec', params: {} },
    })
    expect(unknown).toMatchObject({ type: 'rpc.error', payload: { code: 'METHOD_NOT_FOUND' } })
  })

  it('closes native streams with the peer connection', async () => {
    const closeAll = vi.fn(async () => undefined)
    const router = createRouter({ closeAll })
    await router.closePeerStreams()
    expect(closeAll).toHaveBeenCalledOnce()
  })
})

function createRouter(overrides: Record<string, unknown> = {}): RpcRouter {
  return new RpcRouter({
    call: vi.fn(),
    respond: vi.fn(),
    openStream: vi.fn(),
    closeStream: vi.fn(),
    closeAll: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as HarnessApiBridge)
}
