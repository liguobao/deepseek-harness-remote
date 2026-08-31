import { describe, expect, it, vi } from 'vitest'
import {
  CodexVirtualHarness,
  discoverCodexVirtualWorkspaces,
} from '../src/codex/virtual-harness.js'

describe('CodexVirtualHarness', () => {
  it('groups visible CodeX threads into virtual DSH workspaces and sessions', async () => {
    const client = fakeCodex()

    const workspaces = await discoverCodexVirtualWorkspaces(client)
    expect(workspaces).toHaveLength(1)
    expect(workspaces[0]).toMatchObject({
      path: '/workspace/repo',
      title: 'repo',
      sessionIds: ['codex:thr_1'],
      sessionCount: 1,
    })

    const target = new CodexVirtualHarness(client, { deviceId: 'host-1', name: 'Host' })
    const result = await target.dispatch('session/list', { args: {} }, new AbortController().signal)
    expect(result).toMatchObject({
      ok: true,
      value: {
        items: [{
          sessionId: 'codex:thr_1',
          running: false,
          blank: false,
          cwd: '/workspace/repo',
          projections: {
            values: {
              title: 'Native renderer',
              modelSelection: {
                lastUsed: { provider: 'codex', model: 'gpt-5.6-sol', reasoningEffort: 'low' },
                next: { provider: 'codex', model: 'gpt-5.6-sol', reasoningEffort: 'low' },
              },
            },
          },
        }],
      },
    })
    await expect(target.api.sessions.models({
      rpcId: 'models-1' as never,
      payload: { sessionId: 'codex:thr_1' as never },
    })).resolves.toMatchObject({
      result: {
        ok: true,
        value: {
          current: { provider: 'codex', model: 'gpt-5.6-sol', reasoningEffort: 'low' },
          routable: true,
          groups: [{ id: 'codex', models: [
            { id: 'gpt-5.6-sol', reasoning: { defaultEffort: 'low' } },
            { id: 'gpt-5.6-terra', reasoning: { defaultEffort: 'medium' } },
          ] }],
        },
      },
    })
    await target.close()
  })

  it('projects persisted CodeX history and live frames into native session events', async () => {
    const client = fakeCodex()
    const target = new CodexVirtualHarness(client, { deviceId: 'host-1', name: 'Host' })
    const controller = new AbortController()
    const source = await target.open('session/follow', {
      args: { request: { address: { kind: 'session', sessionId: 'codex:thr_1' } } },
    }, controller.signal)
    const iterator = source[Symbol.asyncIterator]()

    const snapshot = await iterator.next()
    expect(snapshot.value).toMatchObject({
      type: 'snapshot',
      header: { id: 'codex:thr_1', cwd: '/workspace/repo' },
      projections: { values: { modelSelection: { next: {
        provider: 'codex', model: 'gpt-5.6-sol', reasoningEffort: 'low',
      } } } },
      records: [
        { event: { type: 'turn/start', seq: 0 } },
        { event: { type: 'step/start', seq: 1 } },
        { event: { type: 'user/message', seq: 2, data: { content: [{ type: 'text', text: 'Use native UI' }] } } },
        { event: { type: 'assistant/message', seq: 3 } },
        { event: { type: 'tool/call', seq: 4 } },
        { event: { type: 'tool/result', seq: 5 } },
        { event: { type: 'tool/call', seq: 6 } },
        { event: { type: 'tool/result', seq: 7 } },
        { event: { type: 'step/end', seq: 8 } },
        { event: { type: 'turn/end', seq: 9 } },
      ],
    })
    expect(snapshot.value.records[2].event.surfaceOp).toBe('append')
    expect(snapshot.value.records[3].event.surfaceOp).toBe('append')
    expect(snapshot.value.records[4].view).toEqual({
      for: 'call',
      view: { card: 'terminal', title: 'pnpm test' },
    })
    expect(snapshot.value.records[5]).toMatchObject({
      event: { surfaceOp: 'append' },
      view: { for: 'result', view: { card: 'terminal', output: '3 passed', exitCode: 0 } },
    })
    expect(snapshot.value.records[6]).toMatchObject({
      view: { for: 'call', view: { card: 'generic', kind: 'edit', locations: [{ path: 'src/native.ts' }] } },
    })
    expect(snapshot.value.records[7].event.surfaceOp).toBe('append')
    expect(JSON.stringify(snapshot.value)).not.toContain('private diff body')

    client.emit('thr_1', {
      method: 'turn/started',
      params: { turn: { id: 'turn_2', status: 'inProgress', items: [] } },
    })
    await expect(iterator.next()).resolves.toMatchObject({ value: { type: 'event', event: { type: 'turn/start', seq: 10 } } })
    await expect(iterator.next()).resolves.toMatchObject({ value: { type: 'event', event: { type: 'step/start', seq: 11 } } })

    client.emit('thr_1', {
      method: 'item/agentMessage/delta',
      params: { turnId: 'turn_2', itemId: 'assistant_2', delta: 'Streaming' },
    })
    await expect(iterator.next()).resolves.toMatchObject({
      value: { type: 'event', event: { type: 'assistant/chunk', data: { chunk: { type: 'block-start' } } } },
    })
    await expect(iterator.next()).resolves.toMatchObject({
      value: { type: 'event', event: { type: 'assistant/chunk', data: { chunk: { type: 'text-delta', text: 'Streaming' } } } },
    })

    client.emit('thr_1', {
      method: 'item/completed',
      params: { turnId: 'turn_2', item: { id: 'assistant_2', type: 'agentMessage', text: 'Streaming', status: 'completed' } },
    })
    await expect(iterator.next()).resolves.toMatchObject({
      value: { type: 'event', event: { type: 'assistant/chunk', data: { chunk: {
        type: 'block-end', block: { type: 'text', text: 'Streaming' },
      } } } },
    })
    await expect(iterator.next()).resolves.toMatchObject({
      value: { type: 'event', event: { type: 'assistant/chunk', data: { chunk: {
        type: 'finish', reason: { kind: 'stop' },
      } } } },
    })
    await expect(iterator.next()).resolves.toMatchObject({
      value: { type: 'event', event: { type: 'assistant/message', data: {
        message: { content: [{ type: 'text', text: 'Streaming' }] },
      } } },
    })

    controller.abort()
    await iterator.return?.()
    await target.close()
  })

  it('routes the native composer prompt back to CodeX resume and turn/start', async () => {
    const client = fakeCodex()
    const target = new CodexVirtualHarness(client, { deviceId: 'host-1', name: 'Host' })
    await expect(target.dispatch('session/selectModel', {
      args: { request: {
        sessionId: 'codex:thr_1',
        provider: 'codex',
        model: 'gpt-5.6-terra',
        reasoningEffort: 'high',
      } },
    }, new AbortController().signal)).resolves.toEqual({
      ok: true,
      value: { selected: { provider: 'codex', model: 'gpt-5.6-terra', reasoningEffort: 'high' } },
    })
    const result = await target.dispatch('session/prompt', {
      args: {
        request: {
          sessionId: 'codex:thr_1',
          requestId: 'rpc-1',
          content: [{ type: 'text', text: 'Continue here' }],
        },
      },
    }, new AbortController().signal)

    expect(result).toEqual({ ok: true, value: { accepted: true } })
    expect(client.request).toHaveBeenCalledWith('thread/resume', {
      threadId: 'thr_1',
      model: 'gpt-5.6-terra',
    }, expect.any(AbortSignal))
    expect(client.request).toHaveBeenCalledWith('turn/start', {
      threadId: 'thr_1',
      input: [{ type: 'text', text: 'Continue here' }],
      model: 'gpt-5.6-terra',
      effort: 'high',
    }, expect.any(AbortSignal))
    await target.close()
  })

  it('attaches rc.2 live updates when the native client reads session history', async () => {
    const client = fakeCodex()
    const target = new CodexVirtualHarness(client, { deviceId: 'host-1', name: 'Host' })
    const controller = new AbortController()
    const iterator = target.api.events.mux(
      { rpcId: 'mux-1' as never, payload: {} },
      controller.signal,
    )[Symbol.asyncIterator]()

    await expect(iterator.next()).resolves.toMatchObject({
      value: { payload: { type: 'session/subscribed', sessionId: 'codex:thr_1' } },
    })
    const history = await target.api.sessions.history({
      rpcId: 'history-1' as never,
      payload: { sessionId: 'codex:thr_1' as never },
    })
    expect(history.result.ok).toBe(true)
    if (!history.result.ok) throw new Error('history failed')
    const events = history.result.value.events
    expect(events[2]).toMatchObject({ event: { type: 'user/message', surfaceOp: 'append' } })
    expect(events[3]).toMatchObject({ event: { type: 'assistant/message', surfaceOp: 'append' } })
    expect(events[4]).toMatchObject({ view: { for: 'call', view: { card: 'terminal' } } })

    client.emit('thr_1', {
      method: 'turn/started',
      params: { turn: { id: 'turn_2', status: 'inProgress', items: [] } },
    })
    await expect(iterator.next()).resolves.toMatchObject({
      value: { payload: { type: 'session/event', sessionId: 'codex:thr_1', event: { type: 'turn/start', seq: 10 } } },
    })

    controller.abort()
    await iterator.return?.()
    await target.close()
  })

  it('loads every CodeX workspace while using the Remote picker selection only for initial navigation', async () => {
    const client = fakeCodex([
      codexThread('thr_2', '/workspace/other', 'Other workspace'),
      codexThread('thr_3', undefined, 'Ungrouped thread'),
    ])
    const target = new CodexVirtualHarness(client, { deviceId: 'host-1', name: 'Host' })
    const workspace = (await target.workspaces()).find(item => item.path === '/workspace/repo')
    expect(workspace).toBeDefined()
    await target.selectWorkspace(workspace!.workspaceId)
    await expect(target.preferredSessionId()).resolves.toBe('codex:thr_1')

    const workspaces = await target.dispatch('workspace/list', { args: {} }, new AbortController().signal)
    expect(workspaces).toMatchObject({ ok: true, value: { items: [
      { workspaceId: workspace!.workspaceId, sessionIds: ['codex:thr_1'] },
      { sessionIds: ['codex:thr_2'] },
    ] } })
    const sessions = await target.dispatch('session/list', { args: {} }, new AbortController().signal)
    expect(sessions).toMatchObject({ ok: true, value: { items: [
      { sessionId: 'codex:thr_1' },
      { sessionId: 'codex:thr_2' },
      { sessionId: 'codex:thr_3' },
    ] } })

    const events = await target.open('$events', { args: {} }, new AbortController().signal)
    const iterator = events[Symbol.asyncIterator]()
    await expect(iterator.next()).resolves.toMatchObject({ value: { type: 'ready' } })
    await iterator.return?.()
    await target.close()
  })

  it('skips an unreadable latest thread when choosing the initial workspace session', async () => {
    const client = fakeCodex([codexThread('thr_2', '/workspace/repo', 'Readable fallback')])
    client.request.mockImplementation(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'thread/list') return {
        data: [codexThread('thr_1', '/workspace/repo', 'Busy latest'), codexThread('thr_2', '/workspace/repo', 'Readable fallback')],
      }
      if (method === 'thread/read' && params?.threadId === 'thr_1') throw new Error('busy')
      if (method === 'thread/read') return { thread: codexThread('thr_2', '/workspace/repo', 'Readable fallback') }
      return {}
    })
    const target = new CodexVirtualHarness(client, { deviceId: 'host-1', name: 'Host' })
    const workspace = (await target.workspaces())[0]!
    await target.selectWorkspace(workspace.workspaceId)

    await expect(target.preferredSessionId()).resolves.toBe('codex:thr_2')
    await target.close()
  })
})

function fakeCodex(extraThreads: Array<Record<string, unknown>> = []): {
  request: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  respond: ReturnType<typeof vi.fn>
  emit(threadId: string, frame: { method: string; params: unknown }): void
} {
  const subscribers = new Map<string, Set<(frame: { method: string; params: unknown }) => void>>()
  const thread = {
    id: 'thr_1',
    name: 'Native renderer',
    cwd: '/workspace/repo',
    createdAt: 1_700_000_000,
    updatedAt: 1_700_000_100,
    status: { type: 'idle' },
    turns: [{
      id: 'turn_1',
      status: 'completed',
      createdAt: 1_700_000_000,
      updatedAt: 1_700_000_100,
      items: [
        { id: 'user_1', type: 'userMessage', content: [{ type: 'text', text: 'Use native UI' }] },
        { id: 'assistant_1', type: 'agentMessage', text: 'Done.', status: 'completed' },
        {
          id: 'command_1',
          type: 'commandExecution',
          command: 'pnpm test',
          aggregatedOutput: '3 passed',
          exitCode: 0,
          status: 'completed',
        },
        {
          id: 'files_1',
          type: 'fileChange',
          status: 'completed',
          changes: [{ path: 'src/native.ts', kind: { type: 'update' }, diff: 'private diff body' }],
        },
      ],
    }],
  }
  const request = vi.fn(async (method: string) => {
    if (method === 'model/list') return { data: [
      {
        id: 'gpt-5.6-sol',
        model: 'gpt-5.6-sol',
        displayName: 'GPT-5.6-Sol',
        description: 'Latest frontier agentic coding model.',
        supportedReasoningEfforts: [
          { reasoningEffort: 'low', description: 'Fast responses with lighter reasoning' },
          { reasoningEffort: 'high', description: 'Greater reasoning depth for complex problems' },
        ],
        defaultReasoningEffort: 'low',
        isDefault: true,
      },
      {
        id: 'gpt-5.6-terra',
        model: 'gpt-5.6-terra',
        displayName: 'GPT-5.6-Terra',
        supportedReasoningEfforts: [
          { reasoningEffort: 'medium' },
          { reasoningEffort: 'high' },
        ],
        defaultReasoningEffort: 'medium',
        isDefault: false,
      },
    ], nextCursor: null }
    if (method === 'thread/list') return { data: [thread, ...extraThreads] }
    if (method === 'thread/read') return { thread }
    if (method === 'thread/resume') return { thread }
    if (method === 'turn/start') return { turn: { id: 'turn_2', status: 'inProgress', items: [] } }
    return {}
  })
  const subscribe = vi.fn(async (
    threadId: string,
    onFrame: (frame: { method: string; params: unknown }) => void,
  ) => {
    const listeners = subscribers.get(threadId) ?? new Set()
    listeners.add(onFrame)
    subscribers.set(threadId, listeners)
    return { close: vi.fn(async () => { listeners.delete(onFrame) }) }
  })
  return {
    request,
    subscribe,
    respond: vi.fn(async () => undefined),
    emit(threadId, frame) {
      for (const listener of subscribers.get(threadId) ?? []) listener(frame)
    },
  }
}

function codexThread(id: string, cwd: string | undefined, name: string): Record<string, unknown> {
  return {
    id,
    name,
    ...(cwd === undefined ? {} : { cwd }),
    createdAt: 1_700_000_000,
    updatedAt: 1_700_000_100,
    status: { type: 'idle' },
    turns: [],
  }
}
