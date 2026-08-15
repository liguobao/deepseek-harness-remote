import { describe, expect, it, vi } from 'vitest'
import type { RemoteClientCore } from '@dsh-remote/client-core'
import { ApiProxyError, RemoteApiProxy } from '../src/services/api-proxy'

type CoreRpc = (method: string, params: unknown, signal?: AbortSignal) => Promise<unknown>
type CoreRpcMock = ReturnType<typeof vi.fn<CoreRpc>>

function fakeCore(): RemoteClientCore & { rpcCalls: CoreRpcMock } {
  const eventHandlers = new Set<(event: unknown) => void>()
  const rpcCalls = vi.fn<CoreRpc>(async (method: string, params: unknown) => {
    if (method === 'harness.api.stream.open') {
      if (params !== null && typeof params === 'object' && 'streamId' in params) {
        queueMicrotask(() => {
          const streamId = String((params as { streamId: unknown }).streamId)
          const frame = {
            event: 'harness.api.frame',
            data: {
              streamId,
              frame: { rpcId: 'host-rpc-1', payload: { type: 'approval/requested', sessionId: 's1', approvalId: 'a1' } },
            },
          }
          for (const handler of eventHandlers) handler(frame)
        })
      }
      return { ok: true, value: { opened: true } }
    }
    if (method === 'harness.api.call') {
      const paramsRecord = params as { method: string; rpcId: string; payload: unknown }
      if (paramsRecord.method === 'session.list') {
        return { rpcId: paramsRecord.rpcId, result: { ok: true, value: { items: [{ sessionId: 's1' }] } } }
      }
      if (paramsRecord.method === 'session.history') {
        return { rpcId: paramsRecord.rpcId, result: { ok: true, value: { events: [], hasMore: false } } }
      }
      if (paramsRecord.method === 'session.prompt') {
        return { rpcId: paramsRecord.rpcId, result: { ok: true, value: { accepted: true } } }
      }
      return { rpcId: paramsRecord.rpcId, result: { ok: false, error: { code: 'method-not-found', message: 'nope' } } }
    }
    if (method === 'harness.api.respond') {
      return { accepted: true }
    }
    return { ok: true, value: {} }
  })
  const onEvent = vi.fn((handler: (event: unknown) => void) => {
    eventHandlers.add(handler)
    return () => eventHandlers.delete(handler)
  })
  const core = { rpc: rpcCalls, onEvent } as unknown as RemoteClientCore
  return { ...core, rpcCalls } as unknown as RemoteClientCore & { rpcCalls: CoreRpcMock }
}

describe('Remote ApiProxy tunnel client', () => {
  it('calls allowlisted Harness methods and validates the echoed rpcId', async () => {
    const core = fakeCore()
    const proxy = new RemoteApiProxy(core)
    const sessions = await proxy.sessionList()
    expect(sessions).toEqual([{ sessionId: 's1' }])
    expect(core.rpcCalls).toHaveBeenCalledWith(
      'harness.api.call',
      expect.objectContaining({ method: 'session.list' }),
      undefined,
    )
  })

  it('surfaces native RpcResult errors as ApiProxyError', async () => {
    const core = fakeCore()
    const proxy = new RemoteApiProxy(core)
    await expect(proxy.call('session.unknown', {})).rejects.toMatchObject({
      code: 'method-not-found',
      message: 'nope',
    })
    await expect(proxy.call('session.unknown', {})).rejects.toBeInstanceOf(ApiProxyError)
  })

  it('rejects an ApiProxy response whose rpcId was not echoed', async () => {
    const core = fakeCore()
    core.rpcCalls.mockImplementationOnce(async () => ({ rpcId: 'different-id', result: { ok: true, value: {} } }))
    const proxy = new RemoteApiProxy(core)
    await expect(proxy.call('session.list', {})).rejects.toMatchObject({ code: 'INVALID_MESSAGE' })
  })

  it('uses the optimistic message rpcId for session.prompt correlation', async () => {
    const core = fakeCore()
    const proxy = new RemoteApiProxy(core)
    await proxy.sessionPrompt('s1', 'Check the repo', 'prompt-rpc-1')
    expect(core.rpcCalls).toHaveBeenCalledWith(
      'harness.api.call',
      expect.objectContaining({ method: 'session.prompt', rpcId: 'prompt-rpc-1' }),
      undefined,
    )
  })

  it('opens the mux stream and routes harness.api.frame events', async () => {
    const core = fakeCore()
    const proxy = new RemoteApiProxy(core)
    const frames: unknown[] = []
    const close = await proxy.openMuxStream(frame => frames.push(frame))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(frames).toEqual([expect.objectContaining({
      rpcId: 'host-rpc-1',
      payload: expect.objectContaining({ type: 'approval/requested', approvalId: 'a1' }),
    })])
    await close()
  })

  it('answers approvals and questions through harness.api.respond', async () => {
    const core = fakeCore()
    const proxy = new RemoteApiProxy(core)
    await proxy.respondApproval('rpc-1', 's1', 'a1', 'allowed-once')
    expect(core.rpcCalls).toHaveBeenCalledWith('harness.api.respond', expect.objectContaining({
      message: expect.objectContaining({
        type: 'client-response',
        rpcId: 'rpc-1',
        result: { ok: true, value: { sessionId: 's1', approvalId: 'a1', outcome: 'allowed-once' } },
      }),
    }))
    await proxy.respondQuestion('rpc-2', 's1', { answers: [{ id: 'q1', selected: ['Yes'] }] })
  })

  it('rejects a Host receipt that did not accept the response', async () => {
    const core = fakeCore()
    core.rpcCalls.mockImplementationOnce(async () => ({ accepted: false, reason: 'not-pending' }))
    const proxy = new RemoteApiProxy(core)
    await expect(proxy.respondApproval('rpc-expired', 's1', 'a1', 'rejected')).rejects.toMatchObject({
      code: 'PERMISSION_NOT_PENDING',
    })
  })
})
