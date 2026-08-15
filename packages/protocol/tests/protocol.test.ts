import { describe, expect, it } from 'vitest'
import { controlFrameTypes, createControlFrame, createEvent, createRpcError, createRpcRequest, decodeMessage, encodeMessage, parseControlFrame, parseRemoteMessage, remoteEvents, rpcMethods } from '../src/index.js'

describe('protocol envelope', () => {
  it('contains every Server control frame used by protocol v1', () => {
    expect(controlFrameTypes).toContain('connect.incoming')
    expect(controlFrameTypes).not.toContain('pairing.resolved')
  })

  it('round-trips RPC messages', () => {
    const message = createRpcRequest('harness.api.call', { method: 'session.list', rpcId: 'native-1', payload: {} })
    expect(decodeMessage(encodeMessage(message))).toEqual(message)
  })

  it('advertises the native Harness bridge as closed protocol methods and events', () => {
    expect(rpcMethods).toContain('harness.api.call')
    expect(rpcMethods).toContain('harness.api.stream.open')
    expect(remoteEvents).toContain('harness.api.frame')
    expect(remoteEvents).toContain('harness.api.stream.closed')
  })

  it('rejects unsupported protocol versions', () => {
    expect(() => parseRemoteMessage({ v: 2, id: 'x', type: 'rpc.request', timestamp: Date.now(), payload: {} })).toThrow()
  })

  it('carries event metadata and retryable RPC errors', () => {
    expect(createEvent('agent.status', { status: 'idle' }, { seq: 7, sessionId: 's1' })).toMatchObject({
      payload: { seq: 7, sessionId: 's1', event: 'agent.status' },
    })
    expect(createRpcError('r1', 'RATE_LIMITED', 'Busy', undefined, true)).toMatchObject({
      payload: { requestId: 'r1', retryable: true },
    })
    expect(createRpcRequest('harness.api.stream.close', { streamId: 'stream-1' }).payload.method).toBe('harness.api.stream.close')
  })

  it('creates and validates canonical control frames', () => {
    const frame = createControlFrame('hello', {
      role: 'client',
      deviceId: 'client-1',
      accessToken: 'secret',
      protocols: [1],
      capabilities: ['transport.relay'],
    })
    expect(parseControlFrame(frame)).toEqual(frame)
    expect(() => parseControlFrame({ ...frame, v: 2 })).toThrow()
  })
})
