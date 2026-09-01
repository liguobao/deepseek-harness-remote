import { describe, expect, it, vi } from 'vitest'
import {
  CodexRemoteClient,
  createCodexTimelineState,
  projectCodexHistory,
  projectCodexThread,
  reduceCodexTimelineFrame,
} from '../src/codex-client.js'

describe('Codex display projection', () => {
  it('uses the bounded Codex transfer path for image prompt input', async () => {
    const rpc = vi.fn(async (method: string) => {
      if (method === 'codex.app.transfer.commit') return { kind: 'inline', response: { turn: { id: 'turn_1' } } }
      return { accepted: true }
    })
    const client = new CodexRemoteClient({ rpc } as never)

    await client.request('turn/start', {
      threadId: 'thr_1',
      input: [{ type: 'image', mediaType: 'image/png', data: 'aW1hZ2U=' }],
    })

    expect(rpc).not.toHaveBeenCalledWith('codex.app.call', expect.anything(), expect.anything())
    expect(rpc).toHaveBeenCalledWith('codex.app.transfer.open', expect.objectContaining({ totalChunks: 1 }), undefined)
    expect(rpc).toHaveBeenCalledWith('codex.app.transfer.chunk', expect.objectContaining({ index: 0 }), undefined)
    expect(rpc).toHaveBeenCalledWith('codex.app.transfer.commit', expect.anything(), undefined)
  })

  it('keeps Codex identity namespaced and separate from Harness sessions', () => {
    expect(projectCodexThread({
      id: 'thr_123',
      sessionId: 'tree_1',
      name: 'Fix CI',
      preview: 'Investigate the failing build',
      cwd: '/workspace/repo',
      createdAt: 1_700_000_000,
      updatedAt: 1_700_000_100,
      isPinned: true,
      status: { type: 'active', activeFlags: ['waitingOnApproval'] },
    })).toEqual({
      id: 'codex:thr_123',
      backend: 'codex',
      nativeId: 'thr_123',
      sessionTreeId: 'tree_1',
      title: 'Fix CI',
      preview: 'Investigate the failing build',
      cwd: '/workspace/repo',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_100_000,
      status: 'waiting',
      pinned: true,
    })
  })

  it('projects messages and tool lifecycle with a safe unknown fallback', () => {
    const items = projectCodexHistory({
      id: 'thr_123',
      turns: [{
        id: 'turn_1',
        items: [
          { id: 'u1', type: 'userMessage', content: [{ type: 'text', text: 'Run tests' }] },
          { id: 'a1', type: 'agentMessage', text: 'I will inspect CI.', status: 'completed' },
          { id: 'c1', type: 'commandExecution', command: 'pnpm test', aggregatedOutput: '3 passed', status: 'completed' },
          { id: 'f1', type: 'fileChange', changes: [{ kind: 'update', path: 'src/index.ts', diff: '@@' }], status: 'completed' },
          { id: 'future1', type: 'futureCodexItem', secret: 'not projected' },
        ],
      }],
    })

    expect(items).toMatchObject([
      { id: 'codex:thr_123:turn_1:u1', backend: 'codex', kind: 'message', role: 'user', text: 'Run tests' },
      { id: 'codex:thr_123:turn_1:a1', kind: 'message', role: 'assistant', text: 'I will inspect CI.' },
      { id: 'codex:thr_123:turn_1:c1', kind: 'tool', text: 'pnpm test\n\n3 passed', status: 'completed' },
      { id: 'codex:thr_123:turn_1:f1', kind: 'file-change', text: '[update] src/index.ts', status: 'completed' },
      { id: 'codex:thr_123:turn_1:future1', kind: 'unknown', details: { type: 'futureCodexItem' } },
    ])
    expect(JSON.stringify(items)).not.toContain('not projected')
    expect(JSON.stringify(items)).not.toContain('@@')
  })

  it('reduces live item deltas, completion, status, and one-time approvals over a baseline', () => {
    let state = createCodexTimelineState({
      id: 'thr_123',
      cwd: '/workspace/repo',
      createdAt: 1,
      updatedAt: 2,
      status: { type: 'idle' },
      turns: [],
    })!
    state = reduceCodexTimelineFrame(state, {
      method: 'thread/name/updated',
      params: { threadId: 'thr_123', threadName: 'Generated CodeX title' },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'turn/started',
      params: { threadId: 'thr_123', turn: { id: 'turn_1', status: 'inProgress', items: [] } },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'item/agentMessage/delta',
      params: { threadId: 'thr_123', turnId: 'turn_1', itemId: 'agent_1', delta: 'Hello' },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'item/agentMessage/delta',
      params: { threadId: 'thr_123', turnId: 'turn_1', itemId: 'agent_1', delta: ' world' },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'item/commandExecution/requestApproval',
      params: {
        threadId: 'thr_123',
        turnId: 'turn_1',
        requestHandle: 'opaque-handle',
        command: ['pnpm', 'test'],
      },
    })

    expect(state).toMatchObject({
      activeTurnId: 'turn_1',
      approval: { requestHandle: 'opaque-handle', kind: 'command', command: 'pnpm test' },
      session: { title: 'Generated CodeX title', status: 'waiting' },
    })
    expect(state.items).toMatchObject([
      { kind: 'message', role: 'assistant', text: 'Hello world', status: 'running' },
      { kind: 'approval', text: 'pnpm test', status: 'running' },
    ])

    state = reduceCodexTimelineFrame(state, {
      method: 'item/completed',
      params: {
        threadId: 'thr_123',
        turnId: 'turn_1',
        item: { id: 'agent_1', type: 'agentMessage', text: 'Hello world.', status: 'completed' },
      },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'turn/completed',
      params: { threadId: 'thr_123', turn: { id: 'turn_1', status: 'completed', items: [] } },
    })

    expect(state.activeTurnId).toBeUndefined()
    expect(state.approval).toBeUndefined()
    expect(state.session.status).toBe('idle')
    expect(state.items[0]).toMatchObject({ text: 'Hello world.', status: 'completed' })
  })

  it('merges command, file-change, and approval-resolution notifications by native item id', () => {
    let state = createCodexTimelineState({
      id: 'thr_123', cwd: '/workspace/repo', createdAt: 1, updatedAt: 2, turns: [],
    })!
    state = reduceCodexTimelineFrame(state, {
      method: 'turn/started',
      params: { turn: { id: 'turn_1', status: 'inProgress', items: [] } },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'item/started',
      params: { turnId: 'turn_1', item: { id: 'cmd_1', type: 'commandExecution', command: 'pnpm test', status: 'inProgress' } },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'item/commandExecution/outputDelta',
      params: { turnId: 'turn_1', itemId: 'cmd_1', delta: '\n1 passed' },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'item/started',
      params: { turnId: 'turn_1', item: { id: 'files_1', type: 'fileChange', changes: [], status: 'inProgress' } },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'item/fileChange/patchUpdated',
      params: { turnId: 'turn_1', itemId: 'files_1', changes: [{ kind: 'add', path: 'new.ts' }] },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'item/fileChange/requestApproval',
      params: { turnId: 'turn_1', requestHandle: 'approval_1' },
    })
    state = reduceCodexTimelineFrame(state, {
      method: 'serverRequest/resolved',
      params: { turnId: 'turn_1', requestId: 1 },
    })

    expect(state.approval).toBeUndefined()
    expect(state.items).toMatchObject([
      { nativeRef: { itemId: 'cmd_1' }, text: 'pnpm test\n1 passed', status: 'running' },
      { nativeRef: { itemId: 'files_1' }, text: '[add] new.ts', status: 'running' },
      { nativeRef: { requestHandle: 'approval_1' }, status: 'completed' },
    ])
  })
})
