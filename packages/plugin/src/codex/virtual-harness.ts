import type { ApiProxy, RpcRequest, RpcResponse } from '@deepseek-ai/dsh-host-apiproxy/api'
import {
  CodexRemoteClient,
  projectCodexThread,
  type DisplaySession,
} from '@dsh-remote/client-core'
import type {
  RemoteTypertGatewayTarget,
  TypertGatewayRequest,
  TypertRpcResult,
} from '../typert-gateway-contract.js'

const CODEX_SESSION_PREFIX = 'codex:'
const CODEX_WORKSPACE_PREFIX = 'codex-workspace:'
const CODEX_PROVIDER = 'codex'
const CODEX_MODEL = 'codex'
const CODEX_PAGE_LIMIT = 100
const MAX_CODEX_PAGES = 32

type JsonRecord = Record<string, unknown>

export interface CodexVirtualWorkspaceView {
  workspaceId: string
  path: string
  title: string
  sessionIds: string[]
  sessionCount: number
  createdAt: string
  updatedAt: string
}

interface CodexClientLike {
  request(method: string, params: unknown, signal?: AbortSignal): Promise<unknown>
  subscribe(
    threadId: string,
    onFrame: (frame: { method: string; params: unknown }) => void,
    signal?: AbortSignal,
  ): Promise<{ close(): Promise<void> }>
  respond(requestHandle: string, decision: 'accept' | 'decline' | 'cancel', signal?: AbortSignal): Promise<void>
}

interface CatalogState {
  threads: JsonRecord[]
  sessions: DisplaySession[]
  workspaces: CodexVirtualWorkspaceView[]
}

interface CodexModelSelection {
  provider: string
  model: string
  reasoningEffort?: string
}

interface CodexModelView {
  id: string
  name: string
  description?: string
  reasoning?: {
    efforts: Array<{ id: string; name: string; description?: string }>
    defaultEffort?: string
  }
}

interface CodexModelDirectory {
  default: CodexModelSelection
  groups: Array<{ id: string; name: string; models: CodexModelView[] }>
  models: Map<string, CodexModelView>
}

interface NativeEvent {
  type: string
  seq: number
  time: number
  data: unknown
  surfaceOp?: 'append'
}

interface NativeHistory {
  header: {
    version: number
    id: string
    createdAt: number
    cwd?: string
  }
  entries: Array<{ type: 'event'; event: NativeEvent; view?: ToolEventView }>
  lastSeq: number
  nextTurn: number
}

interface FollowState {
  sessionId: string
  threadId: string
  queue: AsyncValueQueue
  nextSeq: number
  turn: number
  stepOpen: boolean
  startedItems: Set<string>
  completedItems: Set<string>
  assistantBlocks: Set<string>
  assistantText: Map<string, string>
  requestId?: string
  activeTurnId?: string
  rcOnly?: boolean
  close?: () => Promise<void>
}

interface PendingApproval {
  requestHandle: string
  sessionId: string
}

interface ToolEventView {
  for: 'call' | 'result'
  view: JsonRecord
}

interface ProjectedNativeEvent {
  type: string
  data: unknown
  view?: ToolEventView
}

/** Discover the CodeX working directories visible through the Host root policy. */
export async function discoverCodexVirtualWorkspaces(
  client: CodexClientLike,
  signal?: AbortSignal,
): Promise<CodexVirtualWorkspaceView[]> {
  return (await loadCatalog(client, signal)).workspaces
}

/**
 * A plugin-owned virtual Harness target. It projects CodeX Thread/Turn data at
 * the existing ApiProxy/Typert carrier boundary, so every UI layer above the
 * official Workspace and Session controllers remains native DSH.
 */
export class CodexVirtualHarness implements RemoteTypertGatewayTarget {
  readonly api: ApiProxy

  private catalog?: CatalogState
  private readonly workspaceStreams = new Set<AsyncValueQueue>()
  private readonly controlStreams = new Set<AsyncValueQueue>()
  private readonly eventStreams = new Map<string, AsyncValueQueue>()
  private readonly rcMuxStreams = new Set<AsyncValueQueue>()
  private readonly rcHostStreams = new Set<AsyncValueQueue>()
  private readonly follows = new Set<FollowState>()
  private readonly pendingRequestIds = new Map<string, string>()
  private readonly pendingApprovals = new Map<string, PendingApproval>()
  private readonly threadHistoryCache = new Map<string, JsonRecord>()
  private readonly selectedModels = new Map<string, CodexModelSelection>()
  private modelDirectory?: CodexModelDirectory
  private modelDirectoryPromise?: Promise<CodexModelDirectory>
  private selectedWorkspaceId?: string
  private closed = false

  constructor(
    private readonly client: CodexClientLike,
    private readonly host: { deviceId: string; name: string },
  ) {
    this.api = this.createApiProxy()
  }

  static remote(
    core: ConstructorParameters<typeof CodexRemoteClient>[0],
    host: { deviceId: string; name: string },
  ): CodexVirtualHarness {
    return new CodexVirtualHarness(new CodexRemoteClient(core), host)
  }

  async workspaces(signal?: AbortSignal): Promise<CodexVirtualWorkspaceView[]> {
    return (await this.refreshCatalog(signal)).workspaces
  }

  async selectWorkspace(workspaceId: string, signal?: AbortSignal): Promise<CodexVirtualWorkspaceView> {
    const catalog = await loadCatalog(this.client, signal)
    const workspace = catalog.workspaces.find(item => item.workspaceId === workspaceId)
    if (workspace === undefined) throw new Error('The selected CodeX workspace is no longer available.')
    this.selectedWorkspaceId = workspace.workspaceId
    this.catalog = catalog
    return workspace
  }

  async preferredSessionId(signal?: AbortSignal): Promise<string | undefined> {
    const catalog = this.catalog
    const selected = catalog?.workspaces.find(workspace => workspace.workspaceId === this.selectedWorkspaceId)
    const selectedSessionIds = new Set(selected?.sessionIds ?? [])
    const sessions = (catalog?.sessions ?? []).filter(session => selectedSessionIds.has(session.id))
    const idleNamed = sessions.filter(session => session.status !== 'running'
      && session.status !== 'waiting'
      && displayTitle(session) !== null)
    const idle = sessions.filter(session => session.status !== 'running' && session.status !== 'waiting')
    // The most recently updated Thread is often the one still owned by the
    // interactive Codex process. Prefer the previous named Thread when one is
    // available, then fall back through the complete catalog.
    const preferredNamed = idleNamed.length > 1 ? [...idleNamed.slice(1), idleNamed[0]!] : idleNamed
    const candidates = [...new Set([...preferredNamed, ...idle, ...sessions].map(session => session.id))]
    for (const sessionId of candidates) {
      const threadId = nativeThreadId(sessionId)
      try {
        const thread = await this.fetchThread(threadId, signal)
        this.threadHistoryCache.set(threadId, thread)
        return sessionId
      } catch {
        // A currently active or concurrently changing CodeX Thread may reject
        // a full history read. Keep looking so the native UI does not remain
        // on an ungrouped placeholder Session after entering the Workspace.
      }
    }
    return undefined
  }

  async invoke(request: TypertGatewayRequest): Promise<unknown> {
    const result = await this.dispatch(
      `${request.namespace}/${request.method}`,
      { args: request.args },
      request.signal ?? new AbortController().signal,
    )
    if (result.ok) return result.value
    throw Object.assign(new Error(result.error.message), {
      isDSHRemoteError: true as const,
      code: result.error.code,
      details: result.error.details,
    })
  }

  async dispatch(endpoint: string, payload: unknown, signal: AbortSignal): Promise<TypertRpcResult> {
    try {
      const args = carrierArgs(payload)
      switch (endpoint) {
        case '$events/result': return business(await this.answerRemoteEvent(args, signal))
        case 'workspace/list': return business(success({
          items: (await this.refreshCatalog(signal)).workspaces.map(nativeWorkspace),
          archivedSessionIds: (await this.currentCatalog(signal)).sessions.filter(item => item.archived).map(item => item.id),
        }))
        case 'workspace/create': return business(await this.createWorkspace(requestArg(args), signal))
        case 'workspace/rename': return business(await this.renameWorkspace(requestArg(args)))
        case 'workspace/delete': return business(failure('workspace-read-only', 'CodeX virtual Workspaces cannot be deleted.'))
        case 'workspace/insertBefore': return business({ workspaceIds: (await this.currentCatalog(signal)).workspaces.map(item => item.workspaceId) })
        case 'workspace/insertSessionBefore': return business(await this.workspaceForSession(requestArg(args), signal))
        case 'workspace/archiveSession': return business(await this.archiveSession(requestArg(args), signal))
        case 'session/list': return business(success({ items: await this.sessionSummaries(signal) }))
        case 'session/search': return business(success({ items: [], hasMore: false }))
        case 'session/create': return business(await this.createSession(requestArg(args), signal))
        case 'session/fork': return business(await this.forkSession(requestArg(args), signal))
        case 'session/history': return business(await this.sessionHistory(requestArg(args), signal))
        case 'session/page': return business(success({ records: [], hasMore: false }))
        case 'session/prompt': return business(await this.prompt(requestArg(args), signal))
        case 'session/cancel': return business(await this.cancel(requestArg(args), signal))
        case 'session/rename': return business(await this.renameSession(requestArg(args), signal))
        case 'session/updateQueue': return business(failure('queue-item-not-found', 'CodeX does not expose a DSH inbox queue.'))
        case 'session/attachment': return business(failure('attachment-error', 'CodeX virtual Sessions do not expose DSH attachments.'))
        case 'session/modelCatalog': return business(success(modelCatalog(await this.models(signal))))
        case 'session/models': {
          const sessionId = requiredString(requestArg(args).sessionId, 'sessionId')
          nativeThreadId(sessionId)
          const directory = await this.models(signal)
          return business(success({
            current: this.modelSelection(sessionId, directory),
            routable: true,
            groups: directory.groups,
            failures: [],
          }))
        }
        case 'session/selectModel': return business(await this.selectModel(requestArg(args), signal))
        case 'session/canOpenWorkspacePath': return business(false)
        case 'session/openWorkspacePath': return business(failure('bad-request', 'Opening Host paths is unavailable in CodeX mode.'))
        case 'skills/list': return business(success({ items: [] }))
        default: return fail('method-not-found', `CodeX virtual Harness does not implement ${endpoint}.`)
      }
    } catch (error) {
      return failFrom(error)
    }
  }

  async open(endpoint: string, payload: unknown, signal: AbortSignal): Promise<AsyncIterable<unknown>> {
    const args = carrierArgs(payload)
    if (endpoint === 'workspace/follow') return this.workspaceFollow(signal)
    if (endpoint === 'session/control') return this.sessionControl(signal)
    if (endpoint === 'session/follow') return this.sessionFollow(requestArg(args), signal)
    if (endpoint === '$events') return this.remoteEvents(signal)
    throw Object.assign(new Error(`CodeX virtual Harness does not implement stream ${endpoint}.`), {
      isDSHRemoteError: true as const,
      code: 'method-not-found',
      details: {},
    })
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    for (const stream of this.workspaceStreams) stream.close()
    for (const stream of this.controlStreams) stream.close()
    for (const stream of this.eventStreams.values()) stream.close()
    for (const stream of this.rcMuxStreams) stream.close()
    for (const stream of this.rcHostStreams) stream.close()
    this.workspaceStreams.clear()
    this.controlStreams.clear()
    this.eventStreams.clear()
    this.rcMuxStreams.clear()
    this.rcHostStreams.clear()
    const follows = [...this.follows]
    this.follows.clear()
    for (const follow of follows) {
      follow.queue.close()
      await follow.close?.().catch(() => undefined)
    }
    this.pendingApprovals.clear()
    this.pendingRequestIds.clear()
    this.selectedModels.clear()
  }

  private async refreshCatalog(signal?: AbortSignal): Promise<CatalogState> {
    const catalog = await loadCatalog(this.client, signal)
    if (this.selectedWorkspaceId !== undefined
      && !catalog.workspaces.some(workspace => workspace.workspaceId === this.selectedWorkspaceId)) {
      this.selectedWorkspaceId = undefined
    }
    this.catalog = catalog
    return catalog
  }

  private async currentCatalog(signal?: AbortSignal): Promise<CatalogState> {
    return this.catalog ?? this.refreshCatalog(signal)
  }

  private models(signal?: AbortSignal): Promise<CodexModelDirectory> {
    if (this.modelDirectory !== undefined) return Promise.resolve(this.modelDirectory)
    this.modelDirectoryPromise ??= loadModelDirectory(this.client, signal)
      .then(directory => {
        this.modelDirectory = directory
        return directory
      })
      .finally(() => { this.modelDirectoryPromise = undefined })
    return this.modelDirectoryPromise
  }

  private modelSelection(sessionId: string, directory?: CodexModelDirectory): CodexModelSelection {
    return this.selectedModels.get(sessionId) ?? directory?.default ?? modelSelection()
  }

  private async selectModel(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const sessionId = requiredString(request.sessionId, 'sessionId')
    nativeThreadId(sessionId)
    const provider = requiredString(request.provider, 'provider')
    const model = requiredString(request.model, 'model')
    const reasoningEffort = string(request.reasoningEffort)
    const directory = await this.models(signal)
    const available = directory.models.get(model)
    if (provider !== CODEX_PROVIDER || available === undefined) {
      return failure('model-unavailable', 'The selected CodeX model is unavailable on this Host.')
    }
    const supportedEfforts = available.reasoning?.efforts.map(effort => effort.id) ?? []
    if (reasoningEffort !== undefined && !supportedEfforts.includes(reasoningEffort)) {
      return failure('model-unavailable', 'The selected reasoning effort is unavailable for this CodeX model.')
    }
    const selected: CodexModelSelection = {
      provider,
      model,
      ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
    }
    this.selectedModels.set(sessionId, selected)
    const seq = Date.now()
    for (const queue of this.controlStreams) {
      queue.push({ type: 'projection', sessionId, key: 'modelSelection', value: modelSelectionProjection(selected), seq })
    }
    return success({ selected })
  }

  private async sessionSummaries(signal?: AbortSignal): Promise<unknown[]> {
    const catalog = await this.refreshCatalog(signal)
    const directory = await this.models(signal).catch(() => undefined)
    return catalog.sessions.map(session => ({
      sessionId: session.id,
      updatedAt: session.updatedAt,
      running: session.status === 'running' || session.status === 'waiting',
      blank: false,
      ...(session.cwd === undefined ? {} : { cwd: session.cwd }),
      projections: {
        asOfSeq: 0,
        values: {
          title: displayTitle(session),
          sessionListMetadata: { blank: false, lastPromptAt: session.updatedAt || null },
          modelSelection: modelSelectionProjection(this.modelSelection(session.id, directory)),
        },
      },
    }))
  }

  private async workspaceFollow(signal: AbortSignal): Promise<AsyncIterable<unknown>> {
    const queue = new AsyncValueQueue(signal)
    this.workspaceStreams.add(queue)
    const catalog = await this.refreshCatalog(signal)
    queue.push({
      type: 'baseline',
      value: {
        items: catalog.workspaces.map(nativeWorkspace),
        archivedSessionIds: catalog.sessions.filter(item => item.archived).map(item => item.id),
      },
    })
    return queue.iterate(() => this.workspaceStreams.delete(queue))
  }

  private async sessionControl(signal: AbortSignal): Promise<AsyncIterable<unknown>> {
    const queue = new AsyncValueQueue(signal)
    this.controlStreams.add(queue)
    queue.push({ type: 'baseline', value: { queues: {}, jobs: {}, projections: {} } })
    return queue.iterate(() => this.controlStreams.delete(queue))
  }

  private async remoteEvents(signal: AbortSignal): Promise<AsyncIterable<unknown>> {
    const queue = new AsyncValueQueue(signal)
    const clientId = `codex-events:${this.host.deviceId}:${Date.now().toString(36)}`
    this.eventStreams.set(clientId, queue)
    const home = (await this.currentCatalog(signal)).workspaces[0]?.path ?? '/'
    queue.push({ type: 'ready', clientId, host: { home } })
    return queue.iterate(() => this.eventStreams.delete(clientId))
  }

  private async sessionFollow(request: JsonRecord, signal: AbortSignal): Promise<AsyncIterable<unknown>> {
    const sessionId = sessionIdFromAddress(record(request.address))
    const threadId = nativeThreadId(sessionId)
    const raw = await this.readThread(threadId, signal)
    const history = nativeHistory(raw, sessionId)
    const directory = await this.models(signal).catch(() => undefined)
    const queue = new AsyncValueQueue(signal)
    const follow: FollowState = {
      sessionId,
      threadId,
      queue,
      nextSeq: history.lastSeq + 1,
      turn: history.nextTurn,
      stepOpen: false,
      startedItems: new Set(),
      completedItems: new Set(),
      assistantBlocks: new Set(),
      assistantText: new Map(),
      requestId: this.pendingRequestIds.get(sessionId),
    }
    this.follows.add(follow)
    queue.push({
      type: 'snapshot',
      header: history.header,
      cursor: history.lastSeq,
      records: history.entries,
      hasMore: false,
      projections: {
        asOfSeq: history.lastSeq,
        values: {
          title: threadTitle(raw),
          sessionListMetadata: { blank: history.entries.length === 0, lastPromptAt: lastPromptAt(raw) },
          modelSelection: modelSelectionProjection(this.modelSelection(sessionId, directory)),
        },
      },
    })
    try {
      const stream = await this.client.subscribe(threadId, frame => this.acceptCodexFrame(follow, frame), signal)
      follow.close = () => stream.close()
    } catch (error) {
      this.follows.delete(follow)
      queue.close()
      throw error
    }
    return queue.iterate(() => {
      this.follows.delete(follow)
      void follow.close?.().catch(() => undefined)
    })
  }

  private acceptCodexFrame(follow: FollowState, frame: { method: string; params: unknown }): void {
    const params = record(frame.params)
    if (frame.method === 'turn/started') {
      const turn = record(params.turn)
      follow.turn += 1
      follow.activeTurnId = string(turn.id)
      follow.requestId = this.pendingRequestIds.get(follow.sessionId)
      follow.stepOpen = true
      this.pushEvent(follow, 'turn/start', { turn: follow.turn })
      this.pushEvent(follow, 'step/start', { turn: follow.turn, step: 1 })
      this.emitRemoteEvent('api-session/status', [follow.sessionId, true])
      for (const item of array(turn.items)) this.acceptCompletedItem(follow, record(item), false)
      return
    }
    if (frame.method === 'item/started' || frame.method === 'item/completed') {
      const item = record(params.item)
      const itemId = string(item.id)
      if (frame.method === 'item/started' && itemId !== undefined) follow.startedItems.add(itemId)
      if (frame.method === 'item/completed') this.acceptCompletedItem(follow, item, true)
      return
    }
    if (frame.method === 'item/agentMessage/delta') {
      const itemId = string(params.itemId) ?? `assistant:${follow.turn}`
      const delta = string(params.delta)
      if (delta === undefined) return
      if (!follow.assistantBlocks.has(itemId)) {
        follow.assistantBlocks.add(itemId)
        follow.assistantText.set(itemId, '')
        this.pushEvent(follow, 'assistant/chunk', {
          turn: follow.turn,
          step: 1,
          chunk: { type: 'block-start', index: 0, blockType: 'text' },
        })
      }
      this.pushEvent(follow, 'assistant/chunk', {
        turn: follow.turn,
        step: 1,
        chunk: { type: 'text-delta', index: 0, text: delta },
      })
      follow.assistantText.set(itemId, `${follow.assistantText.get(itemId) ?? ''}${delta}`)
      return
    }
    if (frame.method === 'turn/completed') {
      const turn = record(params.turn)
      for (const item of array(turn.items)) this.acceptCompletedItem(follow, record(item), true)
      if (follow.stepOpen) {
        this.pushEvent(follow, 'step/end', { turn: follow.turn, step: 1 })
        follow.stepOpen = false
      }
      this.pushEvent(follow, 'turn/end', {
        turn: follow.turn,
        reason: turn.status === 'failed' || turn.error !== undefined && turn.error !== null
          ? { kind: 'error', error: { message: 'CodeX turn failed.', code: 'codex-turn-failed' } }
          : { kind: 'completed' },
      })
      this.emitRemoteEvent('api-session/status', [follow.sessionId, false])
      this.emitRemoteEvent('api-session/activity', [follow.sessionId, Date.now()])
      follow.activeTurnId = undefined
      this.pendingRequestIds.delete(follow.sessionId)
      void this.refreshAndPublishWorkspaces()
      return
    }
    if (frame.method === 'item/commandExecution/requestApproval'
      || frame.method === 'item/fileChange/requestApproval') {
      const requestHandle = string(params.requestHandle)
      if (requestHandle === undefined) return
      const command = commandText(params.command)
      this.pendingApprovals.set(requestHandle, { requestHandle, sessionId: follow.sessionId })
      this.emitApproval({
        eventId: requestHandle,
        agentId: follow.sessionId,
        request: {
          toolName: frame.method.includes('fileChange') ? 'CodeX file change' : 'CodeX command',
          ...(command === undefined ? {} : { reason: command }),
        },
      })
    }
  }

  private acceptCompletedItem(follow: FollowState, item: JsonRecord, settleAssistant: boolean): void {
    const itemId = string(item.id) ?? `item:${follow.nextSeq}`
    if (follow.completedItems.has(itemId)) return
    const type = string(item.type)
    if (type === 'agentMessage' && !settleAssistant) return
    follow.completedItems.add(itemId)
    if (type === 'agentMessage' && follow.assistantBlocks.delete(itemId)) {
      const text = itemText(item) ?? follow.assistantText.get(itemId) ?? ''
      this.pushEvent(follow, 'assistant/chunk', {
        turn: follow.turn,
        step: 1,
        chunk: { type: 'block-end', index: 0, block: { type: 'text', text } },
      })
      this.pushEvent(follow, 'assistant/chunk', {
        turn: follow.turn,
        step: 1,
        chunk: { type: 'finish', reason: { kind: 'stop' } },
      })
      follow.assistantText.delete(itemId)
    }
    for (const event of itemEvents(item, follow.turn, 1, follow.requestId)) {
      this.pushEvent(follow, event.type, event.data, event.view)
    }
  }

  private pushEvent(follow: FollowState, type: string, data: unknown, view?: ToolEventView): void {
    const event: NativeEvent = {
      type,
      seq: follow.nextSeq++,
      time: Date.now(),
      data,
      ...(isSurfaceEvent(type) ? { surfaceOp: 'append' as const } : {}),
    }
    if (!follow.rcOnly) follow.queue.push({
      type: 'event',
      event,
      ...(view === undefined ? {} : { view }),
    })
    this.broadcastRcMux({
      type: 'session/event',
      sessionId: follow.sessionId,
      event,
      ...(view === undefined ? {} : { view }),
    })
  }

  private emitRemoteEvent(event: string, args: unknown[]): void {
    for (const queue of this.eventStreams.values()) queue.push({ type: 'emit', event, args })
    const sessionId = typeof args[0] === 'string' ? args[0] : undefined
    if (event === 'api-session/status' && sessionId !== undefined && typeof args[1] === 'boolean') {
      this.broadcastRcHost({ type: 'host/session-status', sessionId, running: args[1] })
    } else if (event === 'api-session/removed' && sessionId !== undefined) {
      this.broadcastRcHost({ type: 'host/session-removed', sessionId })
    } else if (event === 'api-session/added' && isRecord(args[0])) {
      const summary = args[0]
      this.broadcastRcHost({
        type: 'host/session-added',
        sessionId: summary.sessionId,
        blank: summary.blank === true,
        ...(typeof summary.cwd === 'string' ? { cwd: summary.cwd } : {}),
      })
    }
  }

  private emitApproval(input: { eventId: string; agentId: string; request: JsonRecord }): void {
    for (const queue of this.eventStreams.values()) queue.push({
      type: 'waterfall',
      event: 'approval/request',
      eventId: input.eventId,
      agentId: input.agentId,
      request: input.request,
    })
    this.broadcastRcMux({
      type: 'approval/requested',
      sessionId: input.agentId,
      approvalId: input.eventId,
      toolName: string(input.request.toolName) ?? 'CodeX',
      ...(typeof input.request.reason === 'string' ? { reason: input.request.reason } : {}),
    }, input.eventId)
  }

  private async answerRemoteEvent(args: JsonRecord, signal: AbortSignal): Promise<undefined> {
    const eventId = string(args.eventId)
    const outcome = record(args.outcome)
    if (eventId === undefined) throw new Error('The CodeX approval result is missing its event id.')
    const pending = this.pendingApprovals.get(eventId)
    if (pending === undefined) return undefined
    this.pendingApprovals.delete(eventId)
    const decision = outcome.kind === 'result' && outcome.value === 'allowed-once'
      ? 'accept'
      : outcome.kind === 'result' && outcome.value === 'cancelled'
        ? 'cancel'
        : 'decline'
    await this.client.respond(pending.requestHandle, decision, signal)
    return undefined
  }

  private async createWorkspace(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const path = string(request.path)
    if (path === undefined || path.trim() === '') return failure('bad-request', 'A CodeX working directory is required.')
    const catalog = await this.currentCatalog(signal)
    const existing = catalog.workspaces.find(item => item.path === path)
    if (existing !== undefined) return success({ workspace: nativeWorkspace(existing), created: false })
    return failure('workspace-not-found', 'The selected directory is not visible to CodeX Remote.')
  }

  private async renameWorkspace(request: JsonRecord): Promise<unknown> {
    return failure('workspace-read-only', `CodeX virtual Workspace ${string(request.workspaceId) ?? ''} cannot be renamed.`)
  }

  private async workspaceForSession(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const sessionId = string(request.sessionId)
    const catalog = await this.currentCatalog(signal)
    const workspace = catalog.workspaces.find(item => sessionId !== undefined && item.sessionIds.includes(sessionId))
    return workspace === undefined
      ? failure('workspace-not-found', 'The CodeX virtual Workspace was not found.')
      : success({ workspace: nativeWorkspace(workspace) })
  }

  private async archiveSession(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const sessionId = requiredString(request.sessionId, 'sessionId')
    await this.client.request('thread/archive', { threadId: nativeThreadId(sessionId) }, signal)
    const catalog = await this.refreshCatalog(signal)
    this.publishWorkspaceBaseline(catalog)
    return success({ archivedSessionIds: [sessionId] })
  }

  private async createSession(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const catalog = await this.currentCatalog(signal)
    const workspaceId = string(request.workspaceId)
    const cwd = workspaceId === undefined
      ? string(request.cwd)
      : catalog.workspaces.find(item => item.workspaceId === workspaceId)?.path
    if (cwd === undefined) return failure('workspace-not-found', 'The CodeX virtual Workspace was not found.')
    const directory = await this.models(signal)
    const selection = directory.default
    const result = record(await this.client.request('thread/start', { cwd, model: selection.model }, signal))
    const thread = record(result.thread)
    const projected = projectCodexThread(thread)
    if (projected === undefined) return failure('internal', 'CodeX returned an invalid Thread.')
    this.selectedModels.set(projected.id, selection)
    await this.refreshAndPublishWorkspaces()
    this.emitRemoteEvent('api-session/added', [{
      sessionId: projected.id,
      updatedAt: projected.updatedAt,
      running: false,
      blank: true,
      ...(projected.cwd === undefined ? {} : { cwd: projected.cwd }),
    }])
    return success({ sessionId: projected.id })
  }

  private async forkSession(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const sessionId = requiredString(request.sessionId, 'sessionId')
    const result = record(await this.client.request('thread/fork', { threadId: nativeThreadId(sessionId) }, signal))
    const projected = projectCodexThread(record(result.thread))
    if (projected === undefined) return failure('internal', 'CodeX returned an invalid forked Thread.')
    this.selectedModels.set(projected.id, this.modelSelection(sessionId, await this.models(signal)))
    await this.refreshAndPublishWorkspaces()
    return success({ sessionId: projected.id })
  }

  private async prompt(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const sessionId = requiredString(request.sessionId, 'sessionId')
    const content = array(request.content)
    const texts = content.map(record).filter(part => part.type === 'text').map(part => string(part.text) ?? '')
    if (texts.length === 0 || content.some(part => record(part).type !== 'text')) {
      return failure('attachment-error', 'CodeX virtual Sessions currently accept text prompts only.')
    }
    const threadId = nativeThreadId(sessionId)
    const selection = this.modelSelection(sessionId, await this.models(signal))
    await this.ensureRcFollow(sessionId)
    await this.client.request('thread/resume', { threadId, model: selection.model }, signal)
    this.pendingRequestIds.set(sessionId, string(request.requestId) ?? '')
    const mode = request.mode === 'steer' ? 'turn/steer' : 'turn/start'
    if (mode === 'turn/steer') {
      const active = this.activeTurnId(threadId)
      if (active === undefined) return failure('steer-unavailable', 'The CodeX Thread has no active turn to steer.')
      await this.client.request(mode, { threadId, expectedTurnId: active, input: [{ type: 'text', text: texts.join('\n') }] }, signal)
    } else {
      await this.client.request(mode, {
        threadId,
        input: [{ type: 'text', text: texts.join('\n') }],
        ...codexModelParams(selection),
      }, signal)
    }
    return success({ accepted: true })
  }

  private async cancel(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const sessionId = requiredString(request.sessionId, 'sessionId')
    const threadId = nativeThreadId(sessionId)
    const turnId = this.activeTurnId(threadId)
    if (turnId !== undefined) await this.client.request('turn/interrupt', { threadId, turnId }, signal)
    return success({ accepted: true })
  }

  private async renameSession(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const sessionId = requiredString(request.sessionId, 'sessionId')
    const title = requiredString(request.title, 'title')
    await this.client.request('thread/name/set', { threadId: nativeThreadId(sessionId), name: title }, signal)
    const seq = Date.now()
    for (const queue of this.controlStreams) queue.push({ type: 'projection', sessionId, key: 'title', value: title, seq })
    await this.refreshAndPublishWorkspaces()
    return success({ title, seq })
  }

  private activeTurnId(threadId: string): string | undefined {
    for (const follow of this.follows) if (follow.threadId === threadId && follow.stepOpen) return follow.activeTurnId
    return undefined
  }

  private async readThread(threadId: string, signal?: AbortSignal): Promise<JsonRecord> {
    const cached = this.threadHistoryCache.get(threadId)
    if (cached !== undefined) return cached
    return this.fetchThread(threadId, signal)
  }

  private async fetchThread(threadId: string, signal?: AbortSignal): Promise<JsonRecord> {
    const result = record(await this.client.request('thread/read', { threadId, includeTurns: true }, signal))
    const thread = record(result.thread)
    if (string(thread.id) !== threadId) throw new Error('CodeX returned an invalid Thread history.')
    return thread
  }

  private async sessionHistory(request: JsonRecord, signal: AbortSignal): Promise<unknown> {
    const sessionId = requiredString(request.sessionId, 'sessionId')
    const thread = await this.readThread(nativeThreadId(sessionId), signal)
    const history = nativeHistory(thread, sessionId)
    const directory = await this.models(signal).catch(() => undefined)
    // rc.2 has one global mux rather than the alpha session/follow stream. A
    // history read is the reliable signal that the native client has opened a
    // Session, so attach the CodeX live stream here before returning its tail.
    await this.ensureRcFollow(sessionId, thread)
    return success({
      events: history.entries.map(entry => ({
        event: entry.event,
        ...(entry.view === undefined ? {} : { view: entry.view }),
      })),
      hasMore: false,
      projections: {
        asOfSeq: history.lastSeq,
        values: {
          title: threadTitle(thread),
          sessionListMetadata: { blank: history.entries.length === 0, lastPromptAt: null },
          modelSelection: modelSelectionProjection(this.modelSelection(sessionId, directory)),
        },
      },
    })
  }

  private async ensureRcFollow(sessionId: string, seedThread?: JsonRecord): Promise<void> {
    if (this.followsHas(sessionId)) return
    const threadId = nativeThreadId(sessionId)
    // The Host bounds CodeX streams per connection. rc.2 only renders one
    // active conversation, so release older rc-only follows when navigation
    // moves to another Session. Alpha follows own their lifecycle separately.
    const stale = [...this.follows].filter(follow => follow.rcOnly && follow.sessionId !== sessionId)
    for (const follow of stale) {
      this.follows.delete(follow)
      follow.queue.close()
      await follow.close?.().catch(() => undefined)
    }
    const history = nativeHistory(seedThread ?? await this.readThread(threadId), sessionId)
    const controller = new AbortController()
    const follow: FollowState = {
      sessionId,
      threadId,
      queue: new AsyncValueQueue(controller.signal),
      nextSeq: history.lastSeq + 1,
      turn: history.nextTurn,
      stepOpen: false,
      startedItems: new Set(),
      completedItems: new Set(),
      assistantBlocks: new Set(),
      assistantText: new Map(),
      requestId: this.pendingRequestIds.get(sessionId),
      rcOnly: true,
    }
    this.follows.add(follow)
    try {
      const stream = await this.client.subscribe(threadId, frame => this.acceptCodexFrame(follow, frame), controller.signal)
      follow.close = async () => {
        controller.abort()
        await stream.close()
      }
    } catch (error) {
      this.follows.delete(follow)
      controller.abort()
      follow.queue.close()
      throw error
    }
  }

  private followsHas(sessionId: string): boolean {
    for (const follow of this.follows) if (follow.sessionId === sessionId) return true
    return false
  }

  private async refreshAndPublishWorkspaces(): Promise<void> {
    const catalog = await this.refreshCatalog().catch(() => undefined)
    if (catalog !== undefined) this.publishWorkspaceBaseline(catalog)
  }

  private publishWorkspaceBaseline(catalog: CatalogState): void {
    for (const queue of this.workspaceStreams) {
      for (const workspace of catalog.workspaces) queue.push({ type: 'upsert', workspace: nativeWorkspace(workspace) })
      queue.push({ type: 'archived', archivedSessionIds: catalog.sessions.filter(item => item.archived).map(item => item.id) })
    }
  }

  private createApiProxy(): ApiProxy {
    const call = (endpoint: string) => async (request: RpcRequest<unknown>, signal?: AbortSignal): Promise<RpcResponse<unknown>> => {
      const payload = endpoint === 'session.prompt' && isRecord(request.payload)
        ? { ...request.payload, requestId: String(request.rpcId) }
        : request.payload
      const result = await this.dispatch(rcEndpoint(endpoint), { args: { request: payload } }, signal ?? new AbortController().signal)
      return {
        rpcId: request.rpcId,
        result: (result.ok
          ? success(result.value)
          : failure(result.error.code, result.error.message, result.error.details)) as never,
      }
    }
    return {
      sessions: {
        list: call('session.list') as never,
        search: call('session.search') as never,
        create: call('session.create') as never,
        history: call('session.history') as never,
        models: call('session.models') as never,
        selectModel: call('session.selectModel') as never,
        rename: call('session.rename') as never,
        fork: call('session.fork') as never,
        prompt: call('session.prompt') as never,
        attachment: call('session.attachment') as never,
        updateQueue: call('session.updateQueue') as never,
        cancel: call('session.cancel') as never,
      },
      workspace: {
        list: call('workspace.list') as never,
        create: call('workspace.create') as never,
        rename: call('workspace.rename') as never,
        delete: call('workspace.delete') as never,
        insertBefore: call('workspace.insertBefore') as never,
        insertSessionBefore: call('workspace.insertSessionBefore') as never,
        archiveSession: call('workspace.archiveSession') as never,
      },
      subagents: {} as ApiProxy['subagents'],
      host: {} as ApiProxy['host'],
      skills: { list: call('skills.list') as never },
      agentPresets: {} as ApiProxy['agentPresets'],
      goals: {} as ApiProxy['goals'],
      settings: {} as ApiProxy['settings'],
      credentials: {} as ApiProxy['credentials'],
      llm: {} as ApiProxy['llm'],
      events: {
        mux: ((request: RpcRequest<unknown>, signal: AbortSignal) => this.rcMux(request, signal)) as never,
        host: ((request: RpcRequest<unknown>, signal: AbortSignal) => this.rcHost(request, signal)) as never,
      },
      downloads: {} as ApiProxy['downloads'],
      respond: async message => {
        const pending = this.pendingApprovals.get(String(message.rpcId))
        if (pending === undefined) return { accepted: false, reason: 'not-pending' }
        const result = message.result
        const outcome = result.ok ? result.value : undefined
        const decision = outcome === 'allowed-once' ? 'accept' : outcome === 'cancelled' ? 'cancel' : 'decline'
        await this.client.respond(pending.requestHandle, decision)
        this.pendingApprovals.delete(pending.requestHandle)
        return { accepted: true }
      },
    }
  }

  private async *rcMux(request: RpcRequest<unknown>, signal: AbortSignal): AsyncIterable<unknown> {
    const queue = new AsyncValueQueue(signal)
    this.rcMuxStreams.add(queue)
    const catalog = await this.currentCatalog(signal)
    for (const session of catalog.sessions) queue.push({
      rpcId: `${String(request.rpcId)}:${session.id}:subscribed`,
      payload: { type: 'session/subscribed', sessionId: session.id, lastSeq: -1 },
    })
    try {
      yield* queue
    } finally {
      this.rcMuxStreams.delete(queue)
      queue.close()
    }
  }

  private async *rcHost(_request: RpcRequest<unknown>, signal: AbortSignal): AsyncIterable<unknown> {
    const queue = new AsyncValueQueue(signal)
    this.rcHostStreams.add(queue)
    try {
      yield* queue
    } finally {
      this.rcHostStreams.delete(queue)
      queue.close()
    }
  }

  private broadcastRcMux(payload: unknown, rpcId = `codex-mux:${Date.now()}:${Math.random()}`): void {
    for (const queue of this.rcMuxStreams) queue.push({ rpcId, payload })
  }

  private broadcastRcHost(payload: unknown): void {
    const frame = { rpcId: `codex-host:${Date.now()}:${Math.random()}`, payload }
    for (const queue of this.rcHostStreams) queue.push(frame)
  }
}

async function loadCatalog(client: CodexClientLike, signal?: AbortSignal): Promise<CatalogState> {
  const threads: JsonRecord[] = []
  let cursor: string | null | undefined
  for (let page = 0; page < MAX_CODEX_PAGES; page += 1) {
    const result = record(await client.request('thread/list', {
      limit: CODEX_PAGE_LIMIT,
      sortKey: 'updated_at',
      sortDirection: 'desc',
      archived: false,
      ...(cursor === undefined ? {} : { cursor }),
    }, signal))
    for (const value of array(result.data)) {
      const thread = record(value)
      if (string(thread.id) !== undefined) threads.push(thread)
    }
    cursor = typeof result.nextCursor === 'string' && result.nextCursor.length > 0 ? result.nextCursor : undefined
    if (cursor === undefined) break
  }
  const sessions = threads.map(projectCodexThread).filter((value): value is DisplaySession => value !== undefined)
  const workspaceByPath = new Map<string, CodexVirtualWorkspaceView>()
  for (const session of sessions) {
    if (session.cwd === undefined || session.cwd.length === 0) continue
    const current = workspaceByPath.get(session.cwd)
    const createdAt = new Date(session.createdAt || Date.now()).toISOString()
    const updatedAt = new Date(session.updatedAt || session.createdAt || Date.now()).toISOString()
    if (current === undefined) {
      workspaceByPath.set(session.cwd, {
        workspaceId: `${CODEX_WORKSPACE_PREFIX}${hashString(session.cwd)}`,
        path: session.cwd,
        title: basename(session.cwd),
        sessionIds: [session.id],
        sessionCount: 1,
        createdAt,
        updatedAt,
      })
    } else {
      current.sessionIds.push(session.id)
      current.sessionCount += 1
      if (createdAt < current.createdAt) current.createdAt = createdAt
      if (updatedAt > current.updatedAt) current.updatedAt = updatedAt
    }
  }
  return { threads, sessions, workspaces: [...workspaceByPath.values()] }
}

async function loadModelDirectory(client: CodexClientLike, signal?: AbortSignal): Promise<CodexModelDirectory> {
  const models = new Map<string, CodexModelView>()
  let defaultModelId: string | undefined
  let cursor: string | null | undefined
  for (let page = 0; page < MAX_CODEX_PAGES; page += 1) {
    const result = record(await client.request('model/list', {
      limit: CODEX_PAGE_LIMIT,
      includeHidden: false,
      ...(cursor === undefined ? {} : { cursor }),
    }, signal))
    for (const value of array(result.data)) {
      const source = record(value)
      if (source.hidden === true) continue
      const id = string(source.model) ?? string(source.id)
      if (id === undefined || models.has(id)) continue
      const efforts = array(source.supportedReasoningEfforts).map(value => {
        const effort = record(value)
        const effortId = string(effort.reasoningEffort)
        if (effortId === undefined) return undefined
        const description = string(effort.description)
        return {
          id: effortId,
          name: reasoningEffortName(effortId),
          ...(description === undefined ? {} : { description }),
        }
      }).filter((value): value is NonNullable<typeof value> => value !== undefined)
      const defaultEffort = string(source.defaultReasoningEffort)
      const description = string(source.description)
      const model: CodexModelView = {
        id,
        name: string(source.displayName) ?? id,
        ...(description === undefined ? {} : { description }),
        ...(efforts.length === 0 ? {} : {
          reasoning: {
            efforts,
            ...(defaultEffort === undefined || !efforts.some(effort => effort.id === defaultEffort)
              ? {}
              : { defaultEffort }),
          },
        }),
      }
      models.set(id, model)
      if (source.isDefault === true) defaultModelId = id
    }
    cursor = typeof result.nextCursor === 'string' && result.nextCursor.length > 0 ? result.nextCursor : undefined
    if (cursor === undefined) break
  }
  const defaultModel = models.get(defaultModelId ?? '') ?? (models.values().next().value as CodexModelView | undefined)
  if (defaultModel === undefined) throw new Error('CodeX did not advertise any available models.')
  const defaultEffort = defaultModel.reasoning?.defaultEffort
  return {
    default: {
      provider: CODEX_PROVIDER,
      model: defaultModel.id,
      ...(defaultEffort === undefined ? {} : { reasoningEffort: defaultEffort }),
    },
    groups: [{ id: CODEX_PROVIDER, name: 'CodeX', models: [...models.values()] }],
    models,
  }
}

function nativeHistory(thread: JsonRecord, sessionId: string): NativeHistory {
  const entries: NativeHistory['entries'] = []
  let seq = 0
  let turnNumber = 0
  const append = (type: string, data: unknown, time = Date.now(), view?: ToolEventView): void => {
    entries.push({
      type: 'event',
      event: {
        type,
        seq: seq++,
        time,
        data,
        ...(isSurfaceEvent(type) ? { surfaceOp: 'append' as const } : {}),
      },
      ...(view === undefined ? {} : { view }),
    })
  }
  for (const rawTurn of array(thread.turns)) {
    const turn = record(rawTurn)
    turnNumber += 1
    const time = normalizeTime(turn.createdAt) || normalizeTime(thread.createdAt) || Date.now()
    append('turn/start', { turn: turnNumber }, time)
    append('step/start', { turn: turnNumber, step: 1 }, time)
    for (const rawItem of array(turn.items)) {
      const item = record(rawItem)
      for (const event of itemEvents(item, turnNumber, 1)) {
        append(event.type, event.data, normalizeTime(item.createdAt) || time, event.view)
      }
    }
    append('step/end', { turn: turnNumber, step: 1 }, normalizeTime(turn.updatedAt) || time)
    append('turn/end', {
      turn: turnNumber,
      reason: turn.status === 'failed' || turn.error !== undefined && turn.error !== null
        ? { kind: 'error', error: { message: 'CodeX turn failed.', code: 'codex-turn-failed' } }
        : { kind: 'completed' },
    }, normalizeTime(turn.updatedAt) || time)
  }
  const projected = projectCodexThread(thread)
  return {
    header: {
      version: 1,
      id: sessionId,
      createdAt: projected?.createdAt ?? Date.now(),
      ...(projected?.cwd === undefined ? {} : { cwd: projected.cwd }),
    },
    entries,
    lastSeq: seq - 1,
    nextTurn: turnNumber,
  }
}

function itemEvents(item: JsonRecord, turn: number, step: number, requestId?: string): ProjectedNativeEvent[] {
  const type = string(item.type)
  const id = string(item.id) ?? `${turn}:${step}:${hashString(JSON.stringify(item))}`
  const text = itemText(item)
  if (type === 'userMessage') return [{
    type: 'user/message',
    data: {
      id,
      role: 'user',
      content: [{ type: 'text', text: text ?? '' }],
      source: requestId === undefined || requestId === '' ? { kind: 'user' } : { kind: 'user', rpcId: requestId },
    },
  }]
  if (type === 'agentMessage' || type === 'reasoning' || type === 'plan') return [{
    type: 'assistant/message',
    data: {
      turn,
      step,
      message: {
        id,
        role: 'assistant',
        content: [{ type: type === 'reasoning' ? 'reasoning' : 'text', text: text ?? '' }],
        source: { kind: 'model', provider: CODEX_PROVIDER, model: CODEX_MODEL },
      },
    },
  }]
  if (type === 'commandExecution' || type === 'mcpToolCall' || type === 'dynamicToolCall' || type === 'fileChange') {
    const name = type === 'fileChange' ? 'codex.fileChange' : type === 'commandExecution' ? 'codex.command' : `codex.${type}`
    const args = toolArguments(item)
    const resultText = type === 'fileChange'
      ? fileChangeSummary(item)
      : text ?? itemText(record(item.result)) ?? type
    return [
      {
        type: 'tool/call',
        data: { turn, step, callId: id, name, arguments: JSON.stringify(args) },
        view: { for: 'call', view: toolCallView(item, type, args) },
      },
      {
        type: 'tool/result',
        data: {
          turn,
          step,
          message: {
            id: `${id}:result`,
            role: 'user',
            content: [{
              type: 'tool-result',
              toolCallId: id,
              content: [{ type: 'text', text: resultText }],
              ...(item.status === 'failed' ? { isError: true } : {}),
            }],
            source: { kind: 'tool', callId: id },
          },
        },
        view: { for: 'result', view: toolResultView(item, type, resultText) },
      },
    ]
  }
  if (type === 'error') return [{
    type: 'assistant/message',
    data: {
      turn,
      step,
      message: {
        id,
        role: 'assistant',
        content: [{ type: 'text', text: text ?? 'CodeX reported an error.' }],
        source: { kind: 'model', provider: CODEX_PROVIDER, model: CODEX_MODEL },
      },
    },
  }]
  return []
}

function isSurfaceEvent(type: string): boolean {
  return type === 'user/message' || type === 'assistant/message' || type === 'tool/result'
}

function toolCallView(item: JsonRecord, type: string, args: JsonRecord): JsonRecord {
  if (type === 'commandExecution') {
    return {
      card: 'terminal',
      title: commandText(item.command) ?? 'CodeX command',
      ...(typeof item.cwd === 'string' ? { cwd: item.cwd } : {}),
    }
  }
  const locations = fileLocations(item)
  if (type === 'fileChange') {
    return {
      card: 'generic',
      title: locations.length === 0 ? 'CodeX file changes' : `Modify ${locations.length} file${locations.length === 1 ? '' : 's'}`,
      kind: 'edit',
      rawInput: args,
      ...(locations.length === 0 ? {} : { locations }),
    }
  }
  return {
    card: 'generic',
    title: toolDisplayName(item, type),
    kind: 'other',
  }
}

function toolResultView(item: JsonRecord, type: string, resultText: string): JsonRecord {
  if (type === 'commandExecution') {
    return {
      card: 'terminal',
      output: resultText,
      ...(typeof item.exitCode === 'number' && Number.isSafeInteger(item.exitCode) ? { exitCode: item.exitCode } : {}),
    }
  }
  return {
    card: 'generic',
    ...(type === 'fileChange' ? { title: 'CodeX file changes completed' } : {}),
  }
}

function toolDisplayName(item: JsonRecord, type: string): string {
  return string(item.name)
    ?? string(item.tool)
    ?? string(record(item.tool).name)
    ?? (type === 'mcpToolCall' ? 'CodeX MCP tool' : 'CodeX tool')
}

function fileLocations(item: JsonRecord): Array<{ path: string }> {
  return array(item.changes)
    .map(value => string(record(value).path))
    .filter((path): path is string => path !== undefined && path.length > 0)
    .map(path => ({ path }))
}

function nativeWorkspace(view: CodexVirtualWorkspaceView): Omit<CodexVirtualWorkspaceView, 'sessionCount'> {
  const { sessionCount: _sessionCount, ...workspace } = view
  return workspace
}

function modelSelection(): CodexModelSelection {
  return { provider: CODEX_PROVIDER, model: CODEX_MODEL }
}

function modelSelectionProjection(selection: CodexModelSelection): { lastUsed: CodexModelSelection; next: CodexModelSelection } {
  return { lastUsed: selection, next: selection }
}

function modelCatalog(directory: CodexModelDirectory): unknown {
  return {
    default: directory.default,
    routableProviders: [CODEX_PROVIDER],
    groups: directory.groups,
    failures: [],
  }
}

function codexModelParams(selection: CodexModelSelection): { model: string; effort?: string } {
  return {
    model: selection.model,
    ...(selection.reasoningEffort === undefined ? {} : { effort: selection.reasoningEffort }),
  }
}

function reasoningEffortName(effort: string): string {
  const names: Record<string, string> = {
    none: 'None',
    minimal: 'Minimal',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    xhigh: 'Extra High',
    max: 'Max',
    ultra: 'Ultra',
  }
  return names[effort] ?? effort
}

function displayTitle(session: DisplaySession): string | null {
  const value = session.title ?? session.preview
  return value === undefined || value.trim() === '' ? null : value.slice(0, 256)
}

function threadTitle(thread: JsonRecord): string | null {
  return displayTitle(projectCodexThread(thread) ?? {
    id: '', backend: 'codex', nativeId: '', createdAt: 0, updatedAt: 0, status: 'idle',
  })
}

function lastPromptAt(thread: JsonRecord): number | null {
  let value = 0
  for (const turn of array(thread.turns).map(record)) {
    for (const item of array(turn.items).map(record)) {
      if (item.type === 'userMessage') value = Math.max(value, normalizeTime(item.createdAt))
    }
  }
  return value || null
}

function itemText(value: JsonRecord): string | undefined {
  if (typeof value.text === 'string') return value.text
  if (typeof value.content === 'string') return value.content
  if (Array.isArray(value.content)) {
    const text = value.content.map(part => {
      const block = record(part)
      return string(block.text) ?? string(block.content) ?? ''
    }).filter(Boolean).join('\n')
    if (text !== '') return text
  }
  if (Array.isArray(value.summary)) return value.summary.filter(item => typeof item === 'string').join('\n')
  if (typeof value.output === 'string') return value.output
  if (typeof value.aggregatedOutput === 'string') return value.aggregatedOutput
  return undefined
}

function toolArguments(item: JsonRecord): JsonRecord {
  if (item.type === 'commandExecution') return { command: commandText(item.command) ?? item.command ?? '' }
  if (item.type === 'fileChange') return {
    changes: array(item.changes).map(value => {
      const change = record(value)
      const kind = typeof change.kind === 'string' ? change.kind : string(record(change.kind).type)
      return {
        ...(typeof change.path === 'string' ? { path: change.path } : {}),
        ...(kind === undefined ? {} : { kind }),
      }
    }),
  }
  return { name: item.name ?? item.tool ?? item.type ?? 'tool', arguments: item.arguments ?? item.input ?? {} }
}

function fileChangeSummary(item: JsonRecord): string {
  const changes = array(item.changes).map(value => {
    const change = record(value)
    const path = string(change.path)
    const kind = typeof change.kind === 'string' ? change.kind : string(record(change.kind).type)
    return [kind, path].filter((part): part is string => part !== undefined && part.length > 0).join(' ')
  }).filter(Boolean)
  return changes.length === 0 ? 'File changes completed.' : changes.join('\n')
}

function commandText(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join(' ')
  const source = record(value)
  return string(source.command) ?? string(source.text)
}

function sessionIdFromAddress(address: JsonRecord): string {
  if (address.kind === 'session') return requiredString(address.sessionId, 'sessionId')
  return requiredString(address.childSessionId, 'childSessionId')
}

function nativeThreadId(sessionId: string): string {
  if (!sessionId.startsWith(CODEX_SESSION_PREFIX) || sessionId.length === CODEX_SESSION_PREFIX.length) {
    throw new Error('The selected Session does not belong to CodeX.')
  }
  return sessionId.slice(CODEX_SESSION_PREFIX.length)
}

function carrierArgs(payload: unknown): JsonRecord {
  return record(record(payload).args)
}

function requestArg(args: JsonRecord): JsonRecord {
  return record(args.request ?? args._request ?? args)
}

function rcEndpoint(endpoint: string): string {
  if (endpoint === 'workspace.list') return 'workspace/list'
  return endpoint.replace('.', '/')
}

function success<T>(value: T): { ok: true; value: T } {
  return { ok: true, value }
}

function failure(code: string, message: string, details: JsonRecord = {}): { ok: false; error: { code: string; message: string; details: JsonRecord } } {
  return { ok: false, error: { code, message, details } }
}

function ok(value?: unknown): TypertRpcResult {
  return value === undefined ? { ok: true } : { ok: true, value }
}

function business(value: unknown): TypertRpcResult {
  const result = record(value)
  if (result.ok === true) return ok(result.value)
  if (result.ok === false) {
    const error = record(result.error)
    return fail(string(error.code) ?? 'internal', string(error.message) ?? 'CodeX virtual Harness rejected the request.', record(error.details))
  }
  return ok(value)
}

function fail(code: string, message: string, details: JsonRecord = {}): TypertRpcResult {
  return { ok: false, error: { code, message, details } }
}

function failFrom(error: unknown): TypertRpcResult {
  const source = error instanceof Error ? error : new Error(String(error))
  return fail('internal', source.message)
}

function record(value: unknown): JsonRecord {
  return isRecord(value) ? value : {}
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`The CodeX ${field} is required.`)
  return value
}

function normalizeTime(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0
  return value < 10_000_000_000 ? Math.floor(value * 1000) : Math.floor(value)
}

function basename(path: string): string {
  const normalized = path.replace(/[\\/]+$/u, '')
  const parts = normalized.split(/[\\/]/u)
  return parts.at(-1) || path
}

function hashString(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

class AsyncValueQueue implements AsyncIterable<unknown> {
  private readonly values: unknown[] = []
  private readonly waiters: Array<(result: IteratorResult<unknown>) => void> = []
  private closed = false
  private readonly onAbort: () => void

  constructor(private readonly signal: AbortSignal) {
    this.onAbort = () => this.close()
    signal.addEventListener('abort', this.onAbort, { once: true })
    if (signal.aborted) this.close()
  }

  push(value: unknown): void {
    if (this.closed) return
    const waiter = this.waiters.shift()
    if (waiter === undefined) this.values.push(value)
    else waiter({ done: false, value })
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.signal.removeEventListener('abort', this.onAbort)
    for (const waiter of this.waiters.splice(0)) waiter({ done: true, value: undefined })
  }

  iterate(dispose: () => void): AsyncIterable<unknown> {
    const queue = this
    return {
      async *[Symbol.asyncIterator](): AsyncIterator<unknown> {
        try {
          yield* queue
        } finally {
          dispose()
          queue.close()
        }
      },
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<unknown> {
    while (true) {
      if (this.values.length > 0) {
        yield this.values.shift()
        continue
      }
      if (this.closed) return
      const next = await new Promise<IteratorResult<unknown>>(resolve => this.waiters.push(resolve))
      if (next.done) return
      yield next.value
    }
  }
}
