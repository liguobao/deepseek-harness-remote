import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CodexAppServerInbound,
  CodexAppServerInboundHandler,
  CodexAppServerLike,
  CodexAppServerUnavailableHandler,
} from '../src/codex/app-server.js'
import { CodexAppServerError } from '../src/codex/app-server.js'
import { CodexRemoteDomain, codexBinaryCandidates } from '../src/codex/domain.js'
import type { SafeLogger } from '../src/logging.js'

const cleanup: string[] = []

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('CodexRemoteDomain', () => {
  it('discovers the ChatGPT-bundled Codex only for the default macOS command', () => {
    expect(codexBinaryCandidates('codex', 'darwin', '/Users/tester')).toEqual([
      '/Applications/ChatGPT.app/Contents/Resources/codex',
      '/Users/tester/Applications/ChatGPT.app/Contents/Resources/codex',
      'codex',
    ])
    expect(codexBinaryCandidates('/custom/codex', 'darwin', '/Users/tester')).toEqual(['/custom/codex'])
    expect(codexBinaryCandidates('codex', 'linux', '/home/tester')).toEqual(['codex'])
  })

  it('stays unavailable when the optional domain is disabled', async () => {
    const create = vi.fn(() => new FakeAppServer('/unused'))
    const domain = new CodexRemoteDomain({ enabled: false, binary: 'codex' }, logger(), create)

    await domain.start()

    expect(create).not.toHaveBeenCalled()
    expect(domain.status()).toEqual({
      enabled: false,
      available: false,
      state: 'disabled',
      restartAttempt: 0,
    })
    await domain.close()
  })

  it('sanitizes CodeX listings using CodeX as the workspace source of truth', async () => {
    const { root, outside } = await directories()
    const app = new FakeAppServer(root, outside)
    const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), () => app)
    await domain.start()

    const result = await domain.call('connection-1', { method: 'thread/list', params: {} })
    expect(result).toMatchObject({ data: [
      { id: 'allowed-thread', cwd: root, projectId: 'allowed-project' },
      { id: 'outside-thread', cwd: outside, projectId: 'outside-project' },
      { id: 'project-only-thread', projectId: 'allowed-project' },
    ] })
    expect(JSON.stringify(result)).not.toContain('unprojected-thread')
    expect(JSON.stringify(result)).not.toContain('missing-cwd')
    const projects = await domain.call('connection-1', { method: 'project/list', params: {} })
    expect(projects).toMatchObject({ data: [
      {
        id: 'allowed-project',
        name: 'Allowed Project',
        roots: [{ path: root }],
      },
      {
        id: 'outside-project',
        name: 'Outside Project',
        roots: [{ path: outside }],
      },
    ] })
    expect(JSON.stringify(projects)).not.toContain('private metadata')
    expect(JSON.stringify(result)).not.toContain('private rollout path')
    await expect(domain.call('connection-1', {
      method: 'thread/shellCommand',
      params: { threadId: 'allowed-thread', command: 'whoami' },
    })).rejects.toMatchObject({ code: 'METHOD_NOT_ALLOWED' })
    await expect(domain.call('connection-1', {
      method: 'thread/read',
      params: { threadId: 'outside-thread', includeTurns: true },
    })).resolves.toMatchObject({ thread: { id: 'outside-thread', cwd: outside } })
    await expect(domain.call('connection-1', {
      method: 'thread/read',
      params: { threadId: 'unprojected-thread', includeTurns: true },
    })).rejects.toMatchObject({ code: 'CODEX_THREAD_NOT_ALLOWED' })
    await domain.close()
  })

  it.each(['empty', 'unsupported'] as const)(
    'uses exact thread cwd authority when project/list is %s',
    async projectListMode => {
      const { base, root, outside } = await directories()
      const app = new FakeAppServer(root, outside)
      app.projectListMode = projectListMode
      const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), () => app)
      await domain.start()

      const result = await domain.call('connection-1', { method: 'thread/list', params: {} })
      expect(result).toMatchObject({ data: [
        { id: 'allowed-thread', cwd: root },
        { id: 'outside-thread', cwd: outside },
        { id: 'unprojected-thread', cwd: `${root}-unprojected` },
      ] })
      expect(JSON.stringify(result)).not.toContain('project-only-thread')
      expect(JSON.stringify(result)).not.toContain('missing-cwd')
      expect(app.calls.filter(call => call.method === 'thread/list')).toHaveLength(1)
      await expect(domain.call('connection-1', {
        method: 'thread/read', params: { threadId: 'unprojected-thread' },
      })).resolves.toMatchObject({ thread: { id: 'unprojected-thread', cwd: `${root}-unprojected` } })
      await expect(domain.call('connection-1', {
        method: 'thread/start', params: { cwd: root },
      })).resolves.toMatchObject({ thread: { id: 'new-thread', cwd: root } })
      await expect(domain.call('connection-1', {
        method: 'thread/start', params: { cwd: join(base, 'never-advertised') },
      })).rejects.toMatchObject({ code: 'CODEX_PATH_NOT_ALLOWED' })
      await domain.close()
    },
  )

  it('starts new threads only from CodeX advertised workspace paths', async () => {
    const { base, root, outside } = await directories()
    const child = join(root, 'new-workspace')
    await mkdir(child)
    const link = join(root, 'outside-link')
    await symlink(outside, link, 'dir')
    const app = new FakeAppServer(root, outside)
    const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), () => app)
    await domain.start()

    await expect(domain.call('connection-1', {
      method: 'thread/start', params: { cwd: join(base, 'missing') },
    })).rejects.toMatchObject({ code: 'CODEX_PATH_NOT_ALLOWED' })
    await expect(domain.call('connection-1', {
      method: 'thread/start', params: { cwd: link },
    })).rejects.toMatchObject({ code: 'CODEX_PATH_NOT_ALLOWED' })
    await expect(domain.call('connection-1', {
      method: 'thread/start', params: { cwd: root },
    })).resolves.toMatchObject({ thread: { id: 'new-thread' } })
    expect(app.calls.find(call => call.method === 'thread/start')?.params).toMatchObject({
      cwd: root,
      approvalPolicy: 'on-request',
      sandbox: 'workspace-write',
      serviceName: 'deepseek_harness_remote',
    })
    await expect(domain.call('connection-1', {
      method: 'thread/start', params: { cwd: child },
    })).resolves.toMatchObject({ thread: { id: 'new-thread', cwd: child } })
    expect(app.calls.filter(call => call.method === 'thread/start').at(-1)?.params).toMatchObject({ cwd: child })
    await expect(domain.call('connection-1', {
      method: 'thread/start', params: { cwd: outside },
    })).resolves.toMatchObject({ thread: { id: 'new-thread' } })
    expect(base).toContain(tmpdir())
    await domain.close()
  })

  it('maps the explicit Full access preset to fixed App Server policies', async () => {
    const { root } = await directories()
    const app = new FakeAppServer(root)
    const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), () => app)
    await domain.start()

    await domain.call('connection-1', {
      method: 'thread/resume',
      params: { threadId: 'allowed-thread', permissionPreset: 'danger-full-access' },
    })
    await domain.call('connection-1', {
      method: 'turn/start',
      params: {
        threadId: 'allowed-thread',
        input: [{ type: 'text', text: 'Run without approval prompts' }],
        permissionPreset: 'danger-full-access',
      },
    })

    expect(app.calls.find(call => call.method === 'thread/resume')?.params).toMatchObject({
      approvalPolicy: 'never',
      sandbox: 'danger-full-access',
    })
    expect(app.calls.find(call => call.method === 'turn/start')?.params).toMatchObject({
      approvalPolicy: 'never',
      sandboxPolicy: { type: 'dangerFullAccess' },
    })
    expect(JSON.stringify(app.calls)).not.toContain('permissionPreset')
    await domain.close()
  })

  it('maps bounded remote image input to an App Server data URL', async () => {
    const { root } = await directories()
    const app = new FakeAppServer(root)
    const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), () => app)
    await domain.start()

    await domain.call('connection-1', {
      method: 'turn/start',
      params: {
        threadId: 'allowed-thread',
        input: [
          { type: 'text', text: 'Describe the image' },
          { type: 'image', mediaType: 'image/png', data: 'aW1hZ2U=' },
        ],
      },
    })

    expect(app.calls.find(call => call.method === 'turn/start')?.params).toMatchObject({
      input: [
        { type: 'text', text: 'Describe the image' },
        { type: 'image', url: 'data:image/png;base64,aW1hZ2U=' },
      ],
    })
    await expect(domain.call('connection-1', {
      method: 'turn/start',
      params: {
        threadId: 'allowed-thread',
        input: [{ type: 'image', mediaType: 'image/png', data: 'not-base64' }],
      },
    })).rejects.toMatchObject({ code: 'INVALID_MESSAGE' })
    await domain.close()
  })

  it('projects and paginates CodeX History on the Host before returning it to the Client', async () => {
    const { root } = await directories()
    const app = new FakeAppServer(root)
    const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), () => app)
    await domain.start()

    const tail = await domain.call('connection-1', {
      method: 'dsh/sessionHistory',
      params: { threadId: 'allowed-thread', maxMessages: 1 },
    })
    expect(tail).toMatchObject({ cursor: 5, hasMore: true })
    expect((tail as { records: Array<{ event: { seq: number } }> }).records.map(entry => entry.event.seq))
      .toEqual([3, 4, 5])
    expect(app.calls.at(-1)).toEqual({
      method: 'thread/turns/list',
      params: { threadId: 'allowed-thread', limit: 25, sortDirection: 'asc', itemsView: 'full' },
    })

    const older = await domain.call('connection-1', {
      method: 'dsh/sessionHistory',
      params: { threadId: 'allowed-thread', beforeSeq: 3, throughSeq: 5, maxMessages: 1 },
    })
    expect((older as { records: Array<{ event: { seq: number } }> }).records.map(entry => entry.event.seq))
      .toEqual([2])
    await domain.close()
  })

  it('falls back to legacy full Thread reads when paginated history is unavailable', async () => {
    const { root } = await directories()
    const app = new FakeAppServer(root)
    app.rejectTurnPagination = true
    const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), () => app)
    await domain.start()

    const history = await domain.call('connection-1', {
      method: 'dsh/sessionHistory',
      params: { threadId: 'allowed-thread', maxMessages: 1 },
    })

    expect(history).toMatchObject({ cursor: 5, hasMore: true })
    expect(app.calls.map(call => call.method)).toContain('thread/turns/list')
    expect(app.calls.at(-1)).toEqual({
      method: 'thread/read',
      params: { threadId: 'allowed-thread', includeTurns: true },
    })
    await domain.close()
  })

  it('treats resume as idempotent when App Server already has the allowed thread loaded', async () => {
    const { root } = await directories()
    const app = new FakeAppServer(root)
    app.rejectResume = true
    const domain = new CodexRemoteDomain({ enabled: true, binary: '/custom/codex' }, logger(), () => app)
    await domain.start()

    await expect(domain.call('connection-1', {
      method: 'thread/resume', params: { threadId: 'allowed-thread' },
    })).resolves.toMatchObject({ thread: { id: 'allowed-thread', cwd: root } })
    expect(app.calls.filter(call => call.method === 'thread/read')).toHaveLength(1)
    expect(app.calls.filter(call => call.method === 'thread/resume')).toHaveLength(1)
    await domain.close()
  })

  it('isolates streams and approval handles to the active turn owner', async () => {
    const { root, outside } = await directories()
    const app = new FakeAppServer(root, outside)
    const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), () => app)
    await domain.start()
    const peerOneFrames: Array<{ event: string; data: unknown }> = []
    const peerTwoFrames: Array<{ event: string; data: unknown }> = []
    const peerOne = domain.createPeer(
      { connectionId: 'connection-1', peerDeviceId: 'peer-1' },
      async (event, data) => { peerOneFrames.push({ event, data }) },
    )!
    const peerTwo = domain.createPeer(
      { connectionId: 'connection-2', peerDeviceId: 'peer-2' },
      async (event, data) => { peerTwoFrames.push({ event, data }) },
    )!
    await peerOne.openStream({ streamId: 'stream-1', threadId: 'allowed-thread' })
    await peerTwo.openStream({ streamId: 'stream-2', threadId: 'allowed-thread' })
    await peerOne.call({ method: 'thread/fork', params: { threadId: 'allowed-thread' } })
    expect(app.calls.find(call => call.method === 'thread/fork')?.params).toMatchObject({
      cwd: root,
      approvalPolicy: 'on-request',
      sandbox: 'workspace-write',
    })
    await peerOne.call({
      method: 'turn/start',
      params: { threadId: 'allowed-thread', input: [{ type: 'text', text: 'Run tests' }] },
    })
    const enforcedTurn = app.calls.find(call => call.method === 'turn/start')?.params
    expect(enforcedTurn).toMatchObject({
      approvalPolicy: 'on-request',
      sandboxPolicy: {
        type: 'workspaceWrite',
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
    })
    expect(isRecord(enforcedTurn) && typeof enforcedTurn.cwd === 'string' && enforcedTurn.cwd.endsWith('/allowed')).toBe(true)
    expect(isRecord(enforcedTurn) && isRecord(enforcedTurn.sandboxPolicy)
      ? enforcedTurn.sandboxPolicy.writableRoots
      : undefined).toEqual(isRecord(enforcedTurn) ? [enforcedTurn.cwd] : undefined)
    await expect(peerTwo.call({
      method: 'turn/start',
      params: { threadId: 'allowed-thread', input: [{ type: 'text', text: 'Compete' }] },
    })).rejects.toMatchObject({ code: 'CODEX_TURN_OWNED' })

    app.emit({
      kind: 'request',
      id: 91,
      method: 'item/commandExecution/requestApproval',
      params: {
        threadId: 'allowed-thread',
        turnId: 'turn-1',
        itemId: 'item-1',
        command: 'pnpm test',
        proposedExecpolicyAmendment: ['never expose'],
        availableDecisions: ['accept', 'acceptForSession', 'decline'],
      },
    })
    await flush()

    const approvalFrame = peerOneFrames.find(frame => JSON.stringify(frame.data).includes('requestHandle'))
    expect(approvalFrame).toBeDefined()
    expect(JSON.stringify(approvalFrame)).not.toContain('acceptForSession')
    expect(JSON.stringify(approvalFrame)).not.toContain('proposedExecpolicyAmendment')
    expect(peerTwoFrames.some(frame => JSON.stringify(frame.data).includes('requestHandle'))).toBe(false)
    const requestHandle = extractRequestHandle(approvalFrame!.data)
    await expect(peerTwo.respond({ requestHandle, decision: 'accept' })).rejects.toMatchObject({
      code: 'CODEX_APPROVAL_NOT_FOUND',
    })
    await peerOne.respond({ requestHandle, decision: 'accept' })
    expect(app.responses).toContainEqual({ id: 91, result: { decision: 'accept' } })

    await peerOne.closeAll()
    await expect(peerTwo.call({
      method: 'turn/interrupt',
      params: { threadId: 'allowed-thread', turnId: 'turn-1' },
    })).resolves.toEqual({})
    await peerTwo.closeAll()
    await domain.close()
  })

  it('maps active writer rejections to a CodeX busy error', async () => {
    const { root } = await directories()
    const app = new FakeAppServer(root)
    app.rejectTurnStartBusy = true
    const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), () => app)
    await domain.start()

    await expect(domain.call('connection-1', {
      method: 'turn/start',
      params: { threadId: 'allowed-thread', input: [{ type: 'text', text: 'Run tests' }] },
    })).rejects.toMatchObject({
      code: 'CODEX_THREAD_BUSY',
      message: 'The selected CodeX thread is already active in another CodeX client.',
    })
    await domain.close()
  })

  it('closes live streams and restarts after an App Server crash without replaying mutations', async () => {
    const { root } = await directories()
    const first = new FakeAppServer(root)
    const second = new FakeAppServer(root)
    const create = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    const domain = new CodexRemoteDomain({ enabled: true, binary: 'codex' }, logger(), create, [0])
    await domain.start()
    const frames: Array<{ event: string; data: unknown }> = []
    const peer = domain.createPeer(
      { connectionId: 'connection-1', peerDeviceId: 'peer-1' },
      async (event, data) => { frames.push({ event, data }) },
    )!
    await peer.openStream({ streamId: 'stream-1', threadId: 'allowed-thread' })
    await peer.call({
      method: 'turn/start',
      params: { threadId: 'allowed-thread', input: [{ type: 'text', text: 'Do not replay me' }] },
    })

    first.crash('CODEX_APP_SERVER_EXITED')
    await flush()
    await flush()

    expect(create).toHaveBeenCalledTimes(2)
    expect(domain.status()).toMatchObject({ available: true, state: 'ready', restartAttempt: 0 })
    expect(frames).toContainEqual({
      event: 'codex.app.stream.closed',
      data: { streamId: 'stream-1', reason: 'failed' },
    })
    expect(second.calls.some(call => call.method === 'turn/start')).toBe(false)
    expect(second.calls.map(call => call.method)).toContain('account/read')

    await peer.closeAll()
    await domain.close()
  })
})

class FakeAppServer implements CodexAppServerLike {
  private handler?: CodexAppServerInboundHandler
  private unavailableHandler?: CodexAppServerUnavailableHandler
  private ready = false
  readonly responses: Array<{ id: string | number; result?: unknown; error?: unknown }> = []
  readonly calls: Array<{ method: string; params: unknown }> = []
  rejectResume = false
  rejectTurnPagination = false
  rejectTurnStartBusy = false
  projectListMode: 'normal' | 'empty' | 'unsupported' = 'normal'

  constructor(private readonly root: string, private readonly outside = root) {}

  async start(): Promise<void> { this.ready = true }
  isReady(): boolean { return this.ready }

  async call(method: string, params: unknown): Promise<unknown> {
    this.calls.push({ method, params })
    if (method === 'account/read') return { account: { type: 'chatgpt', email: 'private@example.com' }, requiresOpenaiAuth: true }
    if (method === 'thread/list') return {
      data: [
        { id: 'allowed-thread', projectId: 'allowed-project', cwd: this.root, createdAt: 1, updatedAt: 2, path: 'private rollout path' },
        { id: 'outside-thread', projectId: 'outside-project', cwd: this.outside, createdAt: 1, updatedAt: 2, path: 'private rollout path' },
        { id: 'project-only-thread', projectId: 'allowed-project', createdAt: 1, updatedAt: 2, path: 'private rollout path' },
        { id: 'unprojected-thread', cwd: `${this.root}-unprojected`, createdAt: 1, updatedAt: 2, path: 'private rollout path' },
        { id: 'missing-cwd', createdAt: 1, updatedAt: 2 },
      ],
      nextCursor: null,
    }
    if (method === 'project/list') {
      if (this.projectListMode === 'unsupported') {
        throw new CodexAppServerError('CODEX_UPSTREAM_ERROR', 'Codex App Server rejected the request.')
      }
      if (this.projectListMode === 'empty') return { data: [], nextCursor: null }
      return {
        data: [
          {
            id: 'allowed-project',
            name: 'Allowed Project',
            roots: [{ path: this.root }],
            metadata: { secret: 'private metadata' },
            position: 0,
            createdAt: 1,
            updatedAt: 2,
          },
          {
            id: 'outside-project',
            name: 'Outside Project',
            roots: [{ path: this.outside }],
            position: 1,
            createdAt: 1,
            updatedAt: 2,
          },
        ],
        nextCursor: null,
      }
    }
    if (method === 'thread/read') {
      const threadId = isRecord(params) ? params.threadId : undefined
      const includeTurns = isRecord(params) && params.includeTurns === true
      const cwd = threadId === 'outside-thread'
        ? this.outside
        : threadId === 'unprojected-thread'
          ? `${this.root}-unprojected`
          : this.root
      return { thread: {
        id: threadId,
        ...(threadId === 'project-only-thread' ? { projectId: 'allowed-project' } : { cwd }),
        turns: includeTurns ? [{
          id: 'turn-1',
          status: 'completed',
          items: [
            { id: 'user-1', type: 'userMessage', text: 'First' },
            { id: 'assistant-1', type: 'agentMessage', text: 'Second' },
          ],
        }] : [],
      } }
    }
    if (method === 'thread/turns/list') {
      if (this.rejectTurnPagination) {
        throw new CodexAppServerError('CODEX_UPSTREAM_ERROR', 'Codex App Server rejected the request.')
      }
      return {
        data: [{
          id: 'turn-1',
          status: 'completed',
          startedAt: 1,
          completedAt: 2,
          itemsView: 'full',
          items: [
            { id: 'user-1', type: 'userMessage', text: 'First' },
            { id: 'assistant-1', type: 'agentMessage', text: 'Second' },
          ],
        }],
        nextCursor: null,
        backwardsCursor: null,
      }
    }
    if (method === 'thread/items/list') return { data: [], nextCursor: null, backwardsCursor: null }
    if (method === 'thread/start') return { thread: { id: 'new-thread', cwd: isRecord(params) ? params.cwd : undefined } }
    if (method === 'thread/resume' && this.rejectResume) {
      throw new CodexAppServerError('CODEX_UPSTREAM_ERROR', 'Codex App Server rejected the request.')
    }
    if (method === 'thread/resume' || method === 'thread/fork' || method === 'thread/unarchive') {
      return { thread: { id: 'allowed-thread', cwd: this.root } }
    }
    if (method === 'turn/start') {
      if (this.rejectTurnStartBusy) {
        throw new CodexAppServerError('CODEX_UPSTREAM_ERROR', 'Codex thread already has an active writer.')
      }
      return { turn: { id: 'turn-1', status: 'inProgress', items: [] } }
    }
    return {}
  }

  async respond(id: string | number, result: unknown): Promise<void> { this.responses.push({ id, result }) }
  async respondError(id: string | number, code: number, message: string): Promise<void> {
    this.responses.push({ id, error: { code, message } })
  }
  onInbound(handler: CodexAppServerInboundHandler): () => void {
    this.handler = handler
    return () => { this.handler = undefined }
  }
  onUnavailable(handler: CodexAppServerUnavailableHandler): () => void {
    this.unavailableHandler = handler
    return () => { this.unavailableHandler = undefined }
  }
  emit(message: CodexAppServerInbound): void { this.handler?.(message) }
  crash(code: string): void {
    this.ready = false
    this.unavailableHandler?.(code)
  }
  async close(): Promise<void> { this.ready = false }
}

async function directories(): Promise<{ base: string; root: string; outside: string }> {
  const base = await mkdtemp(join(tmpdir(), 'dsh-codex-domain-'))
  cleanup.push(base)
  const root = join(base, 'allowed')
  const outside = join(base, 'allowed-sibling')
  await mkdir(root)
  await mkdir(outside)
  return { base, root, outside }
}

function extractRequestHandle(data: unknown): string {
  if (!isRecord(data) || !isRecord(data.frame) || !isRecord(data.frame.params)
    || typeof data.frame.params.requestHandle !== 'string') throw new Error('missing request handle')
  return data.frame.params.requestHandle
}

function logger(): SafeLogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as SafeLogger
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function flush(): Promise<void> { await new Promise(resolve => setTimeout(resolve, 0)) }
