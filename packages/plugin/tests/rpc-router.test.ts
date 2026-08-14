import { createRpcRequest } from '@dsh-remote/protocol'
import { describe, expect, it, vi } from 'vitest'
import type { AgentAdapter } from '../src/adapters/agent-adapter.js'
import type { SessionAdapter } from '../src/adapters/session-adapter.js'
import { EventSequencer } from '../src/event-sequencer.js'
import { PendingApprovals } from '../src/pending-approvals.js'
import { RpcRouter } from '../src/rpc-router.js'

describe('RpcRouter', () => {
  it('routes sync.from and rejects invalid params without exposing internals', async () => {
    const events = new EventSequencer()
    events.publish('agent.status', { status: 'idle' }, 's1')
    const router = createRouter(events)
    const replay = await router.handle(createRpcRequest('sync.from', { afterSeq: 0 }))
    expect(replay).toMatchObject({ type: 'rpc.response', payload: { result: { events: [{ payload: { seq: 1 } }] } } })

    const invalid = await router.handle(createRpcRequest('session.send', { sessionId: 's1', text: '' } as never))
    expect(invalid).toMatchObject({ type: 'rpc.error', payload: { code: 'INVALID_MESSAGE', message: 'The RPC parameters are invalid.' } })

    const unknown = await router.handle({
      v: 1, id: 'unknown-1', type: 'rpc.request', timestamp: Date.now(), payload: { method: 'shell.exec', params: {} },
    })
    expect(unknown).toMatchObject({ type: 'rpc.error', payload: { code: 'METHOD_NOT_FOUND' } })
  })

  it('deduplicates side-effecting requests by message id', async () => {
    const send = vi.fn(() => ({ accepted: true, clientMessageId: 'm1' }))
    const router = createRouter(new EventSequencer(), send)
    const request = createRpcRequest('session.send', { sessionId: 's1', clientMessageId: 'm1', text: 'hello' }, 'request-1')
    const first = await router.handle(request)
    const second = await router.handle(request)
    expect(send).toHaveBeenCalledOnce()
    expect(second).toBe(first)
  })
})

function createRouter(events: EventSequencer, send = vi.fn()): RpcRouter {
  const sessions = {
    workspace: vi.fn(),
    list: vi.fn(() => ({ items: [], nextCursor: null })),
    get: vi.fn(),
    summary: vi.fn(),
  } as unknown as SessionAdapter
  const agents = { send, stop: vi.fn(), create: vi.fn() } as unknown as AgentAdapter
  return new RpcRouter(sessions, agents, new PendingApprovals(1_000, () => undefined), events, () => ({ deviceId: 'host' }))
}
