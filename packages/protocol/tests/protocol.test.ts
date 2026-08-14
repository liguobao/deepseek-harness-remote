import { describe, expect, it } from 'vitest'
import { createEvent, createRpcError, createRpcRequest, decodeMessage, encodeMessage, parseRemoteMessage } from '../src/index.js'

describe('protocol envelope', () => {
  it('round-trips RPC messages', () => {
    const message = createRpcRequest('sessions.list', {})
    expect(decodeMessage(encodeMessage(message))).toEqual(message)
  })

  it('rejects unsupported protocol versions', () => {
    expect(() => parseRemoteMessage({ v: 2, id: 'x', type: 'ping', timestamp: Date.now(), payload: {} })).toThrow()
  })

  it('carries replay sequence metadata and retryable RPC errors', () => {
    expect(createEvent('agent.status', { status: 'idle' }, { seq: 7, sessionId: 's1' })).toMatchObject({
      payload: { seq: 7, sessionId: 's1', event: 'agent.status' },
    })
    expect(createRpcError('r1', 'RATE_LIMITED', 'Busy', undefined, true)).toMatchObject({
      payload: { requestId: 'r1', retryable: true },
    })
    expect(createRpcRequest('sync.from', { afterSeq: 7 }).payload.method).toBe('sync.from')
  })
})
