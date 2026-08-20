import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy/api'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { HarnessApiBridge } from '../src/harness-api-bridge.js'
import { RpcError } from '../src/rpc-router.js'

describe('HarnessApiBridge', () => {
  it('falls back to read-only Host directory browsing when Harness only serves a native picker', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-remote-directory-'))
    await mkdir(join(root, 'project'))
    const listDirectory = vi.fn(async (request: { rpcId: string }) => ({
      rpcId: request.rpcId,
      result: { ok: false, error: { code: 'directory-picker-unavailable', message: 'native only', details: {} } },
    }))
    const bridge = new HarnessApiBridge(api({ host: { listDirectory } }), vi.fn(async () => undefined))
    try {
      await expect(bridge.call({ method: 'host.listDirectory', rpcId: 'native-fallback', payload: { path: root } }))
        .resolves.toMatchObject({
          rpcId: 'native-fallback',
          result: { ok: true, value: { path: root, entries: [{ name: 'project', path: join(root, 'project') }] } },
        })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

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

  it('forwards whitelisted commands through the Typert gateway and fails closed otherwise', async () => {
    const denied = new HarnessApiBridge(api({}), vi.fn(async () => undefined))
    await expect(denied.call({ method: 'commands.execute', rpcId: 'cmd-denied', payload: { agentId: 'session-1', line: '/goal complete' } }))
      .rejects.toMatchObject({ code: 'METHOD_NOT_ALLOWED' })
    await expect(denied.call({ method: 'commands.list', rpcId: 'list-denied', payload: { agentId: 'session-1' } }))
      .rejects.toMatchObject({ code: 'METHOD_NOT_ALLOWED' })

    const invoke = vi.fn(async (request: { namespace: string; method: string }) => {
      if (request.method === 'execute') return { commandId: 'cmd-1', result: { kind: 'success' as const, text: 'ok' } }
      return [{ name: 'goal', description: 'Manage goals' }]
    })
    const bridged = new HarnessApiBridge(api({}), vi.fn(async () => undefined), 3, undefined, { invoke })

    // Whitelisted native commands execute on the Host.
    await expect(bridged.call({ method: 'commands.execute', rpcId: 'cmd-goal', payload: { agentId: 'session-1', line: '/goal complete' } }))
      .resolves.toMatchObject({ rpcId: 'cmd-goal', result: { ok: true, value: { commandId: 'cmd-1' } } })
    await expect(bridged.call({ method: 'commands.execute', rpcId: 'cmd-permission', payload: { agentId: 'session-1', line: '/permission agent-1' } }))
      .resolves.toMatchObject({ rpcId: 'cmd-permission', result: { ok: true } })
    // Multiline raw input is forwarded verbatim: the Host parses only the
    // first command name, so a trailing line cannot smuggle another command.
    await expect(bridged.call({ method: 'commands.execute', rpcId: 'cmd-multiline', payload: { agentId: 'session-1', line: '/goal complete\n/goal edit x' } }))
      .resolves.toMatchObject({ rpcId: 'cmd-multiline', result: { ok: true } })
    expect(invoke).toHaveBeenCalledTimes(3)
    expect(invoke).toHaveBeenCalledWith({
      namespace: 'commands',
      method: 'execute',
      args: { agentId: 'session-1', line: '/goal complete' },
      signal: expect.any(AbortSignal),
    })

    // Unknown, malformed, and extra-field lines stay denied (fail-closed).
    await expect(bridged.call({ method: 'commands.execute', rpcId: 'cmd-bash', payload: { agentId: 'session-1', line: '/bash echo hi' } }))
      .rejects.toMatchObject({ code: 'METHOD_NOT_ALLOWED' })
    await expect(bridged.call({ method: 'commands.execute', rpcId: 'cmd-noslash', payload: { agentId: 'session-1', line: 'goal complete' } }))
      .rejects.toMatchObject({ code: 'METHOD_NOT_ALLOWED' })
    await expect(bridged.call({ method: 'commands.execute', rpcId: 'cmd-extra', payload: { agentId: 'session-1', line: '/goal complete', extra: true } }))
      .rejects.toBeDefined()
    expect(invoke).toHaveBeenCalledTimes(3)

    // The remote command catalog comes from the Host, not the local machine.
    await expect(bridged.call({ method: 'commands.list', rpcId: 'list-ok', payload: { agentId: 'session-1' } }))
      .resolves.toMatchObject({ rpcId: 'list-ok', result: { ok: true, value: [{ name: 'goal' }] } })
    expect(invoke).toHaveBeenCalledWith({
      namespace: 'commands',
      method: 'list',
      args: { agentId: 'session-1' },
      signal: expect.any(AbortSignal),
    })
    expect(invoke).toHaveBeenCalledTimes(4)
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

  it('frees the stream slot synchronously on close even when the native stream stalls', () => {
    const stalled = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<never>>(() => undefined),
      }),
    }
    const bridge = new HarnessApiBridge(api({
      events: {
        mux: (_request: unknown, signal: AbortSignal) => {
          signal.addEventListener('abort', () => undefined)
          return stalled
        },
        host: async function* () { return },
      },
    }), vi.fn(async () => undefined), 2)

    bridge.openStream({ streamId: 'mux-a', stream: 'mux', rpcId: 'open-1', payload: { sessionId: 'session-a' } })
    bridge.openStream({ streamId: 'host-b', stream: 'host', rpcId: 'open-2', payload: {} })
    bridge.closeStream({ streamId: 'mux-a' })
    // The client's close-then-reopen session switch must not hit RATE_LIMITED
    // even though the aborted native stream has not yielded its slot yet.
    expect(bridge.openStream({ streamId: 'mux-c', stream: 'mux', rpcId: 'open-3', payload: { sessionId: 'session-b' } })).toEqual({
      opened: true,
      streamId: 'mux-c',
    })
  })

  it('allows one replacement stream per peer while keeping the limit isolated', () => {
    const stalled = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<never>>(() => undefined),
      }),
    }
    const streamApi = api({
      events: {
        mux: () => stalled,
        host: () => stalled,
      },
    })
    const firstPeer = new HarnessApiBridge(streamApi, vi.fn(async () => undefined))
    const secondPeer = new HarnessApiBridge(streamApi, vi.fn(async () => undefined))

    firstPeer.openStream({ streamId: 'mux-old', stream: 'mux', rpcId: 'open-1', payload: {} })
    firstPeer.openStream({ streamId: 'host', stream: 'host', rpcId: 'open-2', payload: {} })
    expect(firstPeer.openStream({ streamId: 'mux-new', stream: 'mux', rpcId: 'open-3', payload: {} })).toEqual({
      opened: true,
      streamId: 'mux-new',
    })
    expect(() => firstPeer.openStream({ streamId: 'fourth', stream: 'mux', rpcId: 'open-4', payload: {} }))
      .toThrow('Too many Harness event streams are open.')

    expect(secondPeer.openStream({ streamId: 'independent', stream: 'host', rpcId: 'open-5', payload: {} })).toEqual({
      opened: true,
      streamId: 'independent',
    })
  })

  it('allows responses only for answerable requests emitted on the same peer bridge', async () => {
    const respond = vi.fn(async () => ({ accepted: true as const }))
    const streamApi = api({
      events: {
        mux: async function* () {
          yield {
            rpcId: 'approval-rpc-1',
            payload: {
              type: 'approval/requested',
              sessionId: 'session-1',
              approvalId: 'approval-1',
              toolName: 'test-tool',
            },
          }
        },
        host: async function* () { return },
      },
      respond,
    })
    const publish = vi.fn(async () => undefined)
    const subscribed = new HarnessApiBridge(streamApi, publish)
    const otherPeer = new HarnessApiBridge(streamApi, vi.fn(async () => undefined))
    subscribed.openStream({ streamId: 'mux-1', stream: 'mux', rpcId: 'open-1', payload: {} })
    await vi.waitFor(() => expect(publish).toHaveBeenCalledWith(
      'harness.api.frame',
      expect.objectContaining({ streamId: 'mux-1' }),
    ))

    const response = {
      message: {
        type: 'client-response',
        rpcId: 'approval-rpc-1',
        result: { ok: true, value: { outcome: 'allowed-once' } },
      },
    }
    await expect(otherPeer.respond(response)).rejects.toMatchObject({ code: 'PERMISSION_NOT_PENDING' })
    await expect(subscribed.respond(response)).resolves.toEqual({ accepted: true })
    expect(respond).toHaveBeenCalledOnce()
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
