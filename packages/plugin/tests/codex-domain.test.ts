import { mkdtemp, mkdir, realpath, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CodexAppServerInbound,
  CodexAppServerInboundHandler,
  CodexAppServerLike,
  CodexAppServerUnavailableHandler,
} from '../src/codex/app-server.js'
import { CodexRemoteDomain } from '../src/codex/domain.js'
import type { SafeLogger } from '../src/logging.js'

const cleanup: string[] = []

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('CodexRemoteDomain', () => {
  it('stays unavailable when the optional domain is disabled', async () => {
    const create = vi.fn(() => new FakeAppServer('/unused'))
    const domain = new CodexRemoteDomain(
      { enabled: false, binary: 'codex', allowedRoots: [] },
      logger(),
      create,
    )

    await domain.start()

    expect(create).not.toHaveBeenCalled()
    expect(domain.status()).toEqual({
      enabled: false,
      available: false,
      state: 'disabled',
      restartAttempt: 0,
      allowedRootCount: 0,
    })
    await domain.close()
  })

  it('filters thread listings by canonical allowed root and rejects unlisted methods', async () => {
    const { root, outside } = await directories()
    const app = new FakeAppServer(root, outside)
    const domain = new CodexRemoteDomain(
      { enabled: true, binary: 'codex', allowedRoots: [root] },
      logger(),
      () => app,
    )
    await domain.start()

    const result = await domain.call('connection-1', { method: 'thread/list', params: {} })
    expect(result).toMatchObject({ data: [{ id: 'allowed-thread', cwd: root }] })
    await expect(domain.call('connection-1', {
      method: 'thread/shellCommand',
      params: { threadId: 'allowed-thread', command: 'whoami' },
    })).rejects.toMatchObject({ code: 'METHOD_NOT_ALLOWED' })
    await expect(domain.call('connection-1', {
      method: 'thread/read',
      params: { threadId: 'outside-thread', includeTurns: true },
    })).rejects.toMatchObject({ code: 'CODEX_THREAD_NOT_ALLOWED' })
    await domain.close()
  })

  it('rejects sibling-prefix and symlink escapes for new threads', async () => {
    const { base, root, outside } = await directories()
    const link = join(root, 'outside-link')
    await symlink(outside, link, 'dir')
    const app = new FakeAppServer(root, outside)
    const domain = new CodexRemoteDomain(
      { enabled: true, binary: 'codex', allowedRoots: [root] },
      logger(),
      () => app,
    )
    await domain.start()

    await expect(domain.call('connection-1', {
      method: 'thread/start', params: { cwd: `${root}-sibling` },
    })).rejects.toMatchObject({ code: 'CODEX_PATH_NOT_ALLOWED' })
    await expect(domain.call('connection-1', {
      method: 'thread/start', params: { cwd: link },
    })).rejects.toMatchObject({ code: 'CODEX_PATH_NOT_ALLOWED' })
    await expect(domain.call('connection-1', {
      method: 'thread/start', params: { cwd: root },
    })).resolves.toMatchObject({ thread: { id: 'new-thread' } })
    const canonicalRoot = await realpath(root)
    expect(app.calls.find(call => call.method === 'thread/start')?.params).toMatchObject({
      cwd: canonicalRoot,
      approvalPolicy: 'on-request',
      sandbox: 'workspace-write',
      serviceName: 'deepseek_harness_remote',
    })
    expect(base).toContain(tmpdir())
    await domain.close()
  })

  it('isolates streams and approval handles to the active turn owner', async () => {
    const { root, outside } = await directories()
    const app = new FakeAppServer(root, outside)
    const domain = new CodexRemoteDomain(
      { enabled: true, binary: 'codex', allowedRoots: [root] },
      logger(),
      () => app,
    )
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
    const canonicalRoot = await realpath(root)
    expect(app.calls.find(call => call.method === 'thread/fork')?.params).toMatchObject({
      cwd: canonicalRoot,
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

  it('closes live streams and restarts after an App Server crash without replaying mutations', async () => {
    const { root } = await directories()
    const first = new FakeAppServer(root)
    const second = new FakeAppServer(root)
    const create = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    const domain = new CodexRemoteDomain(
      { enabled: true, binary: 'codex', allowedRoots: [root] },
      logger(),
      create,
      [0],
    )
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

  constructor(private readonly root: string, private readonly outside = root) {}

  async start(): Promise<void> { this.ready = true }
  isReady(): boolean { return this.ready }

  async call(method: string, params: unknown): Promise<unknown> {
    this.calls.push({ method, params })
    if (method === 'account/read') return { account: { type: 'chatgpt', email: 'private@example.com' }, requiresOpenaiAuth: true }
    if (method === 'thread/list') return {
      data: [
        { id: 'allowed-thread', cwd: this.root, createdAt: 1, updatedAt: 2 },
        { id: 'outside-thread', cwd: this.outside, createdAt: 1, updatedAt: 2 },
        { id: 'missing-cwd', createdAt: 1, updatedAt: 2 },
      ],
      nextCursor: null,
    }
    if (method === 'thread/read') {
      const threadId = isRecord(params) ? params.threadId : undefined
      return { thread: { id: threadId, cwd: threadId === 'outside-thread' ? this.outside : this.root, turns: [] } }
    }
    if (method === 'thread/start') return { thread: { id: 'new-thread', cwd: isRecord(params) ? params.cwd : undefined } }
    if (method === 'thread/resume' || method === 'thread/fork' || method === 'thread/unarchive') {
      return { thread: { id: 'allowed-thread', cwd: this.root } }
    }
    if (method === 'turn/start') return { turn: { id: 'turn-1', status: 'inProgress', items: [] } }
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
