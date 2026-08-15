import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy/api'
import { describe, expect, it, vi } from 'vitest'
import { HarnessApiBridge } from '../src/harness-api-bridge.js'
import { RpcError } from '../src/rpc-router.js'

describe('HarnessApiBridge', () => {
  it('forwards allowlisted native methods and read-only directory browsing while denying privileged methods', async () => {
    const list = vi.fn(async (request: { rpcId: string }) => ({ rpcId: request.rpcId, result: { ok: true, value: [] } }))
    const listDirectory = vi.fn(async (request: { rpcId: string }) => ({
      rpcId: request.rpcId,
      result: {
        ok: true,
        value: { path: '/home/user', home: '/home/user', crumbs: [], entries: [], truncated: false },
      },
    }))
    const bridge = new HarnessApiBridge(api({ sessions: { list }, host: { listDirectory } }), vi.fn(async () => undefined))

    await expect(bridge.call({ method: 'session.list', rpcId: 'native-1', payload: {} })).resolves.toMatchObject({
      rpcId: 'native-1',
      result: { ok: true },
    })
    await expect(bridge.call({ method: 'host.listDirectory', rpcId: 'native-2', payload: {} })).resolves.toMatchObject({
      rpcId: 'native-2',
      result: { ok: true, value: { path: '/home/user' } },
    })
    expect(listDirectory).toHaveBeenCalledWith(
      { rpcId: 'native-2', payload: {} },
      expect.any(AbortSignal),
    )
    await expect(bridge.call({ method: 'credentials.describe', rpcId: 'native-3', payload: {} })).rejects.toMatchObject({
      code: 'METHOD_NOT_ALLOWED',
    })
    await expect(bridge.call({ method: 'host.createDirectory', rpcId: 'native-4', payload: {} })).rejects.toBeInstanceOf(RpcError)
  })

  it('publishes native stream frames and an explicit terminal event', async () => {
    const publish = vi.fn(async () => undefined)
    const bridge = new HarnessApiBridge(api({
      events: {
        mux: async function* () { yield { rpcId: 'frame-1', payload: { type: 'session/subscribed', sessionId: 's1', lastSeq: 0 } } },
        host: async function* () { return },
      },
    }), publish)

    expect(bridge.openStream({ streamId: 'stream-1', stream: 'mux', rpcId: 'open-1', payload: {} })).toEqual({
      opened: true,
      streamId: 'stream-1',
    })
    await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(2))
    expect(publish.mock.calls[0]).toMatchObject(['harness.api.frame', { streamId: 'stream-1' }])
    expect(publish.mock.calls[1]).toEqual(['harness.api.stream.closed', { streamId: 'stream-1', reason: 'completed' }])
  })

  it('does not block peer replacement when a native stream ignores abort', async () => {
    let streamSignal: AbortSignal | undefined
    const stalled = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<never>>(() => undefined),
      }),
    }
    const bridge = new HarnessApiBridge(api({
      events: {
        mux: (_request: unknown, signal: AbortSignal) => {
          streamSignal = signal
          return stalled
        },
        host: async function* () { return },
      },
    }), vi.fn(async () => undefined), 1)

    bridge.openStream({ streamId: 'stalled-stream', stream: 'mux', rpcId: 'open-1', payload: {} })
    await expect(bridge.closeAll()).resolves.toBeUndefined()
    expect(streamSignal?.aborted).toBe(true)
    expect(bridge.openStream({ streamId: 'replacement-stream', stream: 'host', rpcId: 'open-2', payload: {} })).toEqual({
      opened: true,
      streamId: 'replacement-stream',
    })
  })
})

function api(overrides: Record<string, unknown>): ApiProxy {
  return {
    sessions: {}, subagents: {}, host: {}, workspace: {}, skills: {}, agentPresets: {}, goals: {}, settings: {}, credentials: {}, llm: {},
    events: { mux: async function* () { return }, host: async function* () { return } },
    downloads: {},
    respond: async () => ({ accepted: true }),
    ...overrides,
  } as unknown as ApiProxy
}
