import type {
  CodexAppFrameData,
  CodexAppTransferCommitResult,
  CodexAppTransferReadResult,
} from '@dsh-remote/protocol'
import {
  CODEX_APP_TRANSFER_CHUNK_BYTES,
  MAX_CODEX_APP_TRANSFER_BYTES,
} from '@dsh-remote/protocol'
import type { RemoteClientCore } from './index.js'
import { createRemoteId, RemoteGatewayError } from './remote-gateway.js'

export type AgentBackend = 'harness' | 'codex'

export interface DisplaySession {
  id: string
  backend: AgentBackend
  nativeId: string
  sessionTreeId?: string
  title?: string
  preview?: string
  cwd?: string
  createdAt: number
  updatedAt: number
  status: 'idle' | 'running' | 'waiting' | 'failed'
  archived?: boolean
  pinned?: boolean
}

export interface DisplayHistoryItem {
  id: string
  sessionId: string
  backend: AgentBackend
  kind: 'message' | 'tool' | 'file-change' | 'approval' | 'status' | 'error' | 'unknown'
  role?: 'user' | 'assistant'
  text?: string
  status?: 'running' | 'completed' | 'failed' | 'declined'
  createdAt?: number
  nativeRef: {
    threadId?: string
    turnId?: string
    itemId?: string
    requestHandle?: string
  }
  details?: Record<string, unknown>
}

export interface CodexThreadListPage {
  sessions: DisplaySession[]
  nextCursor?: string
}

export interface CodexHistoryView {
  session: DisplaySession
  items: DisplayHistoryItem[]
}

export interface CodexPendingApproval {
  requestHandle: string
  kind: 'command' | 'file-change'
  command?: string
  reason?: string
}

export interface CodexTimelineState {
  session: DisplaySession
  items: DisplayHistoryItem[]
  activeTurnId?: string
  approval?: CodexPendingApproval
}

export interface CodexStream {
  streamId: string
  close(): Promise<void>
}

const MAX_DISPLAY_ITEM_TEXT = 256 * 1024

/** Shared Web/Android client for the independent Codex domain in Remote. */
export class CodexRemoteClient {
  constructor(private readonly core: RemoteClientCore) {}

  /** Low-level allowlisted request used by the Desktop Web loopback facade. */
  request(method: string, params: unknown, signal?: AbortSignal): Promise<unknown> {
    const largeHistory = method === 'thread/read' && isRecord(params) && params.includeTurns === true
    return this.call(method, params, largeHistory, signal)
  }

  async account(signal?: AbortSignal): Promise<unknown> {
    return this.call('account/read', { refreshToken: false }, false, signal)
  }

  async models(signal?: AbortSignal): Promise<unknown> {
    return this.call('model/list', {}, false, signal)
  }

  async threads(params: Record<string, unknown> = {}, signal?: AbortSignal): Promise<CodexThreadListPage> {
    const result = await this.call('thread/list', params, false, signal)
    if (!isRecord(result) || !Array.isArray(result.data)) throw invalidResponse('thread list')
    return {
      sessions: result.data.map(projectCodexThread).filter((value): value is DisplaySession => value !== undefined),
      ...(typeof result.nextCursor === 'string' ? { nextCursor: result.nextCursor } : {}),
    }
  }

  async history(threadId: string, signal?: AbortSignal): Promise<CodexHistoryView> {
    const result = await this.call('thread/read', { threadId, includeTurns: true }, true, signal)
    if (!isRecord(result) || !isRecord(result.thread)) throw invalidResponse('thread history')
    const session = projectCodexThread(result.thread)
    if (session === undefined) throw invalidResponse('thread history')
    return { session, items: projectCodexHistory(result.thread) }
  }

  async start(cwd: string, model?: string, signal?: AbortSignal): Promise<DisplaySession> {
    const result = await this.call('thread/start', { cwd, ...(model === undefined ? {} : { model }) }, false, signal)
    return requireProjectedThread(result)
  }

  async resume(threadId: string, signal?: AbortSignal): Promise<DisplaySession> {
    return requireProjectedThread(await this.call('thread/resume', { threadId }, false, signal))
  }

  async fork(threadId: string, lastTurnId?: string, signal?: AbortSignal): Promise<DisplaySession> {
    return requireProjectedThread(await this.call('thread/fork', {
      threadId,
      ...(lastTurnId === undefined ? {} : { lastTurnId }),
    }, false, signal))
  }

  async rename(threadId: string, name: string, signal?: AbortSignal): Promise<void> {
    await this.call('thread/name/set', { threadId, name }, false, signal)
  }

  async prompt(threadId: string, text: string, signal?: AbortSignal): Promise<unknown> {
    return this.call('turn/start', { threadId, input: [{ type: 'text', text }] }, false, signal)
  }

  async steer(threadId: string, expectedTurnId: string, text: string, signal?: AbortSignal): Promise<unknown> {
    return this.call('turn/steer', {
      threadId,
      expectedTurnId,
      input: [{ type: 'text', text }],
    }, false, signal)
  }

  async interrupt(threadId: string, turnId: string, signal?: AbortSignal): Promise<void> {
    await this.call('turn/interrupt', { threadId, turnId }, false, signal)
  }

  async respond(requestHandle: string, decision: 'accept' | 'decline' | 'cancel', signal?: AbortSignal): Promise<void> {
    await this.core.rpc('codex.app.respond', { requestHandle, decision }, signal)
  }

  async subscribe(
    threadId: string,
    onFrame: (frame: CodexAppFrameData['frame']) => void,
    signal?: AbortSignal,
  ): Promise<CodexStream> {
    const streamId = createRemoteId()
    const unsubscribe = this.core.onEvent(event => {
      if (event.event !== 'codex.app.frame' || !isRecord(event.data) || event.data.streamId !== streamId
        || !isRecord(event.data.frame) || typeof event.data.frame.method !== 'string') return
      onFrame(event.data.frame as CodexAppFrameData['frame'])
    })
    try {
      await this.core.rpc('codex.app.stream.open', { streamId, threadId }, signal)
    } catch (error) {
      unsubscribe()
      throw error
    }
    let closed = false
    return {
      streamId,
      close: async () => {
        if (closed) return
        closed = true
        unsubscribe()
        await this.core.rpc('codex.app.stream.close', { streamId }).catch(() => undefined)
      },
    }
  }

  private async call(
    method: string,
    params: unknown,
    transfer: boolean,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const envelope = { method, params }
    if (!transfer) return this.core.rpc('codex.app.call', envelope, signal)
    return this.callTransferred(new TextEncoder().encode(JSON.stringify(envelope)), signal)
  }

  private async callTransferred(encoded: Uint8Array, signal?: AbortSignal): Promise<unknown> {
    if (encoded.byteLength === 0 || encoded.byteLength > MAX_CODEX_APP_TRANSFER_BYTES) {
      throw new RemoteGatewayError('INVALID_MESSAGE', 'The Codex request exceeds the transfer limit.')
    }
    const transferId = createCodexTransferId()
    const totalChunks = Math.ceil(encoded.byteLength / CODEX_APP_TRANSFER_CHUNK_BYTES)
    let opened = false
    try {
      await this.core.rpc('codex.app.transfer.open', { transferId, totalBytes: encoded.byteLength, totalChunks }, signal)
      opened = true
      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * CODEX_APP_TRANSFER_CHUNK_BYTES
        const chunk = encoded.subarray(start, Math.min(start + CODEX_APP_TRANSFER_CHUNK_BYTES, encoded.byteLength))
        await this.core.rpc('codex.app.transfer.chunk', { transferId, index, data: bytesToBase64(chunk) }, signal)
      }
      const committed = await this.core.rpc<CodexAppTransferCommitResult>(
        'codex.app.transfer.commit',
        { transferId },
        signal,
      )
      if (committed.kind === 'inline') return committed.response
      if (committed.transferId !== transferId
        || committed.totalBytes <= 0
        || committed.totalBytes > MAX_CODEX_APP_TRANSFER_BYTES
        || committed.totalChunks !== Math.ceil(committed.totalBytes / CODEX_APP_TRANSFER_CHUNK_BYTES)) {
        throw invalidResponse('transfer descriptor')
      }
      const response = new Uint8Array(committed.totalBytes)
      let offset = 0
      for (let index = 0; index < committed.totalChunks; index += 1) {
        const result = await this.core.rpc<CodexAppTransferReadResult>(
          'codex.app.transfer.read',
          { transferId, index },
          signal,
        )
        if (result.transferId !== transferId || result.index !== index) throw invalidResponse('transfer ordering')
        const chunk = base64ToBytes(result.data)
        const expected = Math.min(CODEX_APP_TRANSFER_CHUNK_BYTES, committed.totalBytes - offset)
        if (chunk.byteLength !== expected) throw invalidResponse('transfer chunk')
        response.set(chunk, offset)
        offset += chunk.byteLength
      }
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(response)) as unknown
    } finally {
      if (opened) await this.core.rpc('codex.app.transfer.close', { transferId }).catch(() => undefined)
    }
  }
}

export function projectCodexThread(value: unknown): DisplaySession | undefined {
  if (!isRecord(value) || typeof value.id !== 'string') return undefined
  const createdAt = normalizeTimestamp(value.createdAt)
  const updatedAt = normalizeTimestamp(value.updatedAt) || createdAt
  return {
    id: `codex:${value.id}`,
    backend: 'codex',
    nativeId: value.id,
    ...(typeof value.sessionId === 'string' ? { sessionTreeId: value.sessionId } : {}),
    ...(typeof value.name === 'string' && value.name.length > 0 ? { title: value.name } : {}),
    ...(typeof value.preview === 'string' && value.preview.length > 0 ? { preview: value.preview } : {}),
    ...(typeof value.cwd === 'string' ? { cwd: value.cwd } : {}),
    createdAt,
    updatedAt,
    status: projectThreadStatus(value.status),
    ...(typeof value.archived === 'boolean' ? { archived: value.archived } : {}),
    ...(typeof value.isPinned === 'boolean' ? { pinned: value.isPinned } : {}),
  }
}

export function projectCodexHistory(thread: unknown): DisplayHistoryItem[] {
  if (!isRecord(thread) || typeof thread.id !== 'string' || !Array.isArray(thread.turns)) return []
  const sessionId = `codex:${thread.id}`
  const output: DisplayHistoryItem[] = []
  for (const turn of thread.turns) {
    if (!isRecord(turn) || typeof turn.id !== 'string' || !Array.isArray(turn.items)) continue
    for (let index = 0; index < turn.items.length; index += 1) {
      const item = turn.items[index]
      output.push(projectCodexItem(item, thread.id, turn.id, sessionId, index))
    }
  }
  return output
}

/** Creates a replaceable persisted baseline before live notifications are reduced. */
export function createCodexTimelineState(thread: unknown): CodexTimelineState | undefined {
  const session = projectCodexThread(thread)
  if (session === undefined) return undefined
  const record = isRecord(thread) ? thread : {}
  const activeTurnId = findActiveTurnId(record.turns)
  return {
    session,
    items: projectCodexHistory(thread),
    ...(activeTurnId === undefined ? {} : { activeTurnId }),
  }
}

/**
 * Reduces official App Server notifications into the DSH display projection.
 * Persisted baselines replace this state after reconnect; mutations are never
 * replayed by the reducer.
 */
export function reduceCodexTimelineFrame(
  state: CodexTimelineState,
  frame: { method: string; params: unknown },
): CodexTimelineState {
  const params = isRecord(frame.params) ? frame.params : {}
  if (frame.method === 'thread/status/changed') {
    return { ...state, session: { ...state.session, status: projectThreadStatus(params.status) } }
  }
  if (frame.method === 'thread/name/updated' && typeof params.name === 'string') {
    return { ...state, session: { ...state.session, title: params.name } }
  }
  if (frame.method === 'thread/archived') return { ...state, session: { ...state.session, archived: true } }
  if (frame.method === 'thread/unarchived') return { ...state, session: { ...state.session, archived: false } }

  if (frame.method === 'turn/started') {
    const turn = isRecord(params.turn) ? params.turn : undefined
    const turnId = typeof turn?.id === 'string' ? turn.id : undefined
    return {
      ...state,
      items: turn === undefined ? state.items : upsertItems(state.items, projectTurn(turn, state.session.nativeId)),
      ...(turnId === undefined ? {} : { activeTurnId: turnId }),
      session: { ...state.session, status: 'running' },
    }
  }

  if (frame.method === 'item/started' || frame.method === 'item/completed') {
    const item = params.item
    const turnId = extractNotificationTurnId(params)
    if (turnId === undefined) return state
    return {
      ...state,
      items: upsertItems(state.items, [projectCodexItem(item, state.session.nativeId, turnId, state.session.id, state.items.length)]),
    }
  }

  if (frame.method === 'item/agentMessage/delta'
    && typeof params.itemId === 'string'
    && typeof params.delta === 'string') {
    const turnId = extractNotificationTurnId(params) ?? state.activeTurnId ?? 'active'
    const itemId = params.itemId
    const id = `codex:${state.session.nativeId}:${turnId}:${itemId}`
    const index = state.items.findIndex(item => item.id === id || item.nativeRef.itemId === itemId)
    if (index < 0) {
      return {
        ...state,
        items: [...state.items, {
          id,
          sessionId: state.session.id,
          backend: 'codex',
          kind: 'message',
          role: 'assistant',
          text: params.delta,
          status: 'running',
          nativeRef: { threadId: state.session.nativeId, turnId, itemId },
        }],
      }
    }
    const next = [...state.items]
    const current = next[index]!
    next[index] = { ...current, text: `${current.text ?? ''}${params.delta}`, status: 'running' }
    return { ...state, items: next }
  }

  if ((frame.method === 'item/commandExecution/outputDelta'
    || frame.method === 'item/fileChange/outputDelta')
    && typeof params.itemId === 'string'
    && typeof params.delta === 'string') {
    return appendItemText(state, params.itemId, params.delta)
  }

  if (frame.method === 'item/mcpToolCall/progress'
    && typeof params.itemId === 'string'
    && typeof params.message === 'string') {
    return appendItemText(state, params.itemId, `\n${params.message}`)
  }

  if (frame.method === 'item/fileChange/patchUpdated'
    && typeof params.itemId === 'string'
    && Array.isArray(params.changes)) {
    return replaceItemText(state, params.itemId, fileChangeText(params.changes))
  }

  if (frame.method === 'serverRequest/resolved' && state.approval !== undefined) {
    const requestHandle = state.approval.requestHandle
    return {
      ...state,
      approval: undefined,
      items: state.items.map(item => item.nativeRef.requestHandle === requestHandle
        ? { ...item, status: 'completed' as const }
        : item),
      session: { ...state.session, status: state.activeTurnId === undefined ? 'idle' : 'running' },
    }
  }

  if (frame.method === 'turn/completed') {
    const turn = isRecord(params.turn) ? params.turn : undefined
    const failed = turn?.status === 'failed' || turn?.error !== null && turn?.error !== undefined
    const next = {
      ...state,
      session: { ...state.session, status: failed ? 'failed' as const : 'idle' as const },
      items: turn === undefined ? state.items : upsertItems(state.items, projectTurn(turn, state.session.nativeId)),
      approval: undefined,
    }
    delete next.activeTurnId
    return next
  }

  if ((frame.method === 'item/commandExecution/requestApproval'
    || frame.method === 'item/fileChange/requestApproval')
    && typeof params.requestHandle === 'string') {
    const command = commandText(params.command)
    const approval: CodexPendingApproval = {
      requestHandle: params.requestHandle,
      kind: frame.method === 'item/commandExecution/requestApproval' ? 'command' : 'file-change',
      ...(command === undefined ? {} : { command }),
      ...(typeof params.reason === 'string' ? { reason: params.reason } : {}),
    }
    const turnId = extractNotificationTurnId(params)
    const approvalItem: DisplayHistoryItem = {
      id: `codex:${state.session.nativeId}:${turnId ?? 'approval'}:${params.requestHandle}`,
      sessionId: state.session.id,
      backend: 'codex',
      kind: 'approval',
      text: command ?? (approval.kind === 'file-change' ? 'File change approval' : 'Command approval'),
      status: 'running',
      nativeRef: {
        threadId: state.session.nativeId,
        ...(turnId === undefined ? {} : { turnId }),
        requestHandle: params.requestHandle,
      },
    }
    return { ...state, approval, items: upsertItems(state.items, [approvalItem]), session: { ...state.session, status: 'waiting' } }
  }
  return state
}

export function projectCodexItem(
  value: unknown,
  threadId: string,
  turnId: string,
  sessionId: string,
  index: number,
): DisplayHistoryItem {
  const item = isRecord(value) ? value : {}
  const itemId = typeof item.id === 'string' ? item.id : `${turnId}:${index}`
  const type = typeof item.type === 'string' ? item.type : 'unknown'
  const base = {
    id: `codex:${threadId}:${turnId}:${itemId}`,
    sessionId,
    backend: 'codex' as const,
    nativeRef: { threadId, turnId, ...(typeof item.id === 'string' ? { itemId: item.id } : {}) },
    ...(normalizeTimestamp(item.createdAt) > 0 ? { createdAt: normalizeTimestamp(item.createdAt) } : {}),
  }
  if (type === 'userMessage') return { ...base, kind: 'message', role: 'user', text: itemText(item) }
  if (type === 'agentMessage') return { ...base, kind: 'message', role: 'assistant', text: itemText(item), status: projectItemStatus(item.status) }
  if (type === 'commandExecution') {
    return { ...base, kind: 'tool', text: commandExecutionText(item), status: projectItemStatus(item.status), details: { type } }
  }
  if (type === 'mcpToolCall' || type === 'dynamicToolCall') {
    return { ...base, kind: 'tool', text: toolCallText(item), status: projectItemStatus(item.status), details: { type } }
  }
  if (type === 'fileChange') {
    return { ...base, kind: 'file-change', text: fileChangeText(item.changes), status: projectItemStatus(item.status), details: { type } }
  }
  if (type === 'plan' || type === 'reasoning') {
    return { ...base, kind: 'status', text: itemText(item) ?? textArray(item.summary) ?? type, details: { type } }
  }
  if (type === 'error') return { ...base, kind: 'error', text: itemText(item), status: 'failed', details: { type } }
  return { ...base, kind: 'unknown', text: `Unsupported Codex item: ${type}`, details: { type } }
}

function projectTurn(turn: Record<string, unknown>, threadId: string): DisplayHistoryItem[] {
  if (typeof turn.id !== 'string' || !Array.isArray(turn.items)) return []
  const sessionId = `codex:${threadId}`
  return turn.items.map((item, index) => projectCodexItem(item, threadId, turn.id as string, sessionId, index))
}

function upsertItems(current: DisplayHistoryItem[], incoming: DisplayHistoryItem[]): DisplayHistoryItem[] {
  if (incoming.length === 0) return current
  const next = [...current]
  for (const item of incoming) {
    const index = next.findIndex(value => value.id === item.id)
    if (index < 0) next.push(item)
    else next[index] = item
  }
  return next
}

function appendItemText(state: CodexTimelineState, itemId: string, delta: string): CodexTimelineState {
  const index = state.items.findIndex(item => item.nativeRef.itemId === itemId)
  if (index < 0) return state
  const items = [...state.items]
  const current = items[index]!
  items[index] = { ...current, text: boundedText(`${current.text ?? ''}${delta}`), status: 'running' }
  return { ...state, items }
}

function replaceItemText(state: CodexTimelineState, itemId: string, text: string): CodexTimelineState {
  const index = state.items.findIndex(item => item.nativeRef.itemId === itemId)
  if (index < 0) return state
  const items = [...state.items]
  items[index] = { ...items[index]!, text: boundedText(text), status: 'running' }
  return { ...state, items }
}

function findActiveTurnId(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const turn = isRecord(value[index]) ? value[index] : undefined
    if (typeof turn?.id === 'string' && (turn.status === 'inProgress' || turn.status === 'running')) return turn.id
  }
  return undefined
}

function extractNotificationTurnId(params: Record<string, unknown>): string | undefined {
  if (typeof params.turnId === 'string') return params.turnId
  if (isRecord(params.turn) && typeof params.turn.id === 'string') return params.turn.id
  return undefined
}

function commandText(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every(part => typeof part === 'string')) return value.join(' ')
  return undefined
}

function requireProjectedThread(result: unknown): DisplaySession {
  if (!isRecord(result)) throw invalidResponse('thread')
  const session = projectCodexThread(result.thread)
  if (session === undefined) throw invalidResponse('thread')
  return session
}

function projectThreadStatus(value: unknown): DisplaySession['status'] {
  if (!isRecord(value) || typeof value.type !== 'string') return 'idle'
  if (value.type === 'systemError') return 'failed'
  if (value.type !== 'active') return 'idle'
  return Array.isArray(value.activeFlags) && value.activeFlags.includes('waitingOnApproval') ? 'waiting' : 'running'
}

function projectItemStatus(value: unknown): DisplayHistoryItem['status'] {
  if (value === 'inProgress') return 'running'
  if (value === 'failed') return 'failed'
  if (value === 'declined') return 'declined'
  return 'completed'
}

function itemText(item: Record<string, unknown>): string | undefined {
  if (typeof item.text === 'string') return boundedText(item.text)
  if (!Array.isArray(item.content)) return undefined
  const parts = item.content.flatMap(value => isRecord(value) && value.type === 'text' && typeof value.text === 'string' ? [value.text] : [])
  return parts.length > 0 ? boundedText(parts.join('\n')) : undefined
}

function toolLabel(item: Record<string, unknown>): string | undefined {
  if (typeof item.tool === 'string') return item.tool
  if (typeof item.server === 'string' && typeof item.name === 'string') return `${item.server}: ${item.name}`
  if (typeof item.command === 'string') return item.command
  if (Array.isArray(item.command) && item.command.every(value => typeof value === 'string')) return item.command.join(' ')
  return typeof item.type === 'string' ? item.type : undefined
}

function commandExecutionText(item: Record<string, unknown>): string | undefined {
  const command = toolLabel(item)
  const output = typeof item.aggregatedOutput === 'string' ? item.aggregatedOutput : undefined
  if (command === undefined) return output === undefined ? undefined : boundedText(output)
  return boundedText(output === undefined || output === '' ? command : `${command}\n\n${output}`)
}

function toolCallText(item: Record<string, unknown>): string | undefined {
  const label = toolLabel(item)
  const error = compactUnknown(item.error)
  const result = compactUnknown(item.result ?? item.contentItems)
  return boundedText([label, error, result].filter((value): value is string => value !== undefined && value !== '').join('\n\n')) || undefined
}

function fileChangeText(value: unknown): string {
  if (!Array.isArray(value)) return 'File changes'
  const changes = value.flatMap(change => {
    if (!isRecord(change) || typeof change.path !== 'string') return []
    const kind = typeof change.kind === 'string' ? change.kind : 'update'
    return [`[${kind}] ${change.path}`]
  })
  return boundedText(changes.length === 0 ? 'File changes' : changes.join('\n'))
}

function textArray(value: unknown): string | undefined {
  return Array.isArray(value) && value.every(part => typeof part === 'string')
    ? boundedText(value.join('\n'))
    : undefined
}

function compactUnknown(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return boundedText(value)
  try {
    return boundedText(JSON.stringify(value, undefined, 2))
  } catch {
    return undefined
  }
}

function boundedText(value: string): string {
  return value.length <= MAX_DISPLAY_ITEM_TEXT
    ? value
    : `${value.slice(0, MAX_DISPLAY_ITEM_TEXT)}\n…`
}

function normalizeTimestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0
  return value < 10_000_000_000 ? value * 1_000 : value
}

function bytesToBase64(value: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < value.length; index += 1) binary += String.fromCharCode(value[index]!)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  let binary: string
  try {
    binary = atob(value)
  } catch {
    throw invalidResponse('transfer data')
  }
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  if (bytesToBase64(bytes) !== value) throw invalidResponse('transfer data')
  return bytes
}

function invalidResponse(part: string): RemoteGatewayError {
  return new RemoteGatewayError('INVALID_MESSAGE', `The Host returned an invalid Codex ${part}.`)
}

function createCodexTransferId(): string {
  if (globalThis.crypto?.randomUUID !== undefined) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues !== undefined) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
