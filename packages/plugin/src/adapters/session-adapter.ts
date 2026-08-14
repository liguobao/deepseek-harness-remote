import type { AgentRegistry } from '@deepseek-ai/dsh-agent'
import { SessionId, type Session, type SessionEvent, type SessionStore } from '@deepseek-ai/dsh-session'
import type { EventSequencer } from '../event-sequencer.js'
import type { PendingApprovals } from '../pending-approvals.js'
import type { MappedEvent, RemoteMessageRecord, RemoteSessionSummary, RemoteToolCall, SessionSnapshot } from '../types.js'
import type { WorkspaceAdapter } from './workspace-adapter.js'

interface SessionTitleService {
  get(session: Session): { title: string } | undefined
}

interface StreamState { deltaIndex: number; started: boolean }

export class SessionAdapter {
  private readonly streams = new Map<string, StreamState>()

  constructor(
    private readonly sessions: SessionStore,
    private readonly agents: AgentRegistry,
    private readonly workspaces: WorkspaceAdapter,
    private readonly pending: PendingApprovals,
    private readonly sequencer: EventSequencer,
    private readonly titles?: SessionTitleService,
  ) {}

  list(cursor: string | null = null, limit = 50): { items: RemoteSessionSummary[]; nextCursor: string | null } {
    const all = this.sessions.list().map(session => this.summary(session))
    const start = cursor === null ? 0 : Math.max(0, all.findIndex(item => item.id === cursor) + 1)
    const items = all.slice(start, start + limit)
    return { items, nextCursor: start + limit < all.length ? items.at(-1)!.id : null }
  }

  get(sessionId: string): SessionSnapshot {
    const session = this.requireSession(sessionId)
    const { messages, tools } = projectSession(session)
    return {
      session: this.summary(session),
      workspace: this.workspaces.get(session),
      messages,
      tools,
      pendingPermissions: this.pending.snapshot(sessionId),
      snapshotSeq: this.sequencer.currentSeq(),
    }
  }

  workspace(sessionId?: string) {
    return this.workspaces.get(sessionId === undefined ? undefined : this.requireSession(sessionId))
  }

  summary(session: Session): RemoteSessionSummary {
    const agent = this.agents.get(session.id)
    const title = this.titles?.get(session)?.title ?? fallbackTitle(session)
    return {
      id: String(session.id),
      title,
      ...(session.header.cwd === undefined ? {} : { cwd: session.header.cwd }),
      status: agent === undefined ? 'unavailable' : agent.status,
      createdAt: session.header.createdAt,
      updatedAt: session.events.at(-1)?.time ?? session.header.createdAt,
      lastSeq: this.sequencer.currentSeq(),
    }
  }

  mapEvent(session: Session, event: SessionEvent): MappedEvent[] {
    const sessionId = String(session.id)
    const raw = event as unknown as { type: string; seq: number; time: number; data: Record<string, any> }
    switch (raw.type) {
      case 'user/message':
        return [mapped('message.created', sessionId, remoteMessage(raw.data, sessionId, raw.time))]
      case 'assistant/chunk':
        return this.mapChunk(sessionId, raw)
      case 'assistant/message':
        return this.mapAssistantMessage(sessionId, raw)
      case 'tool/call': {
        const tool = runningTool(raw, sessionId)
        return [mapped('tool.started', sessionId, tool)]
      }
      case 'tool/result': {
        const tool = finishedTool(raw, session)
        return [mapped('tool.finished', sessionId, tool)]
      }
      default:
        return []
    }
  }

  private mapChunk(sessionId: string, event: { time: number; data: Record<string, any> }): MappedEvent[] {
    const chunk = event.data.chunk as Record<string, unknown>
    if (chunk?.type !== 'text-delta' && chunk?.type !== 'reasoning-delta') return []
    const streamId = assistantStreamId(sessionId, event.data.turn, event.data.step)
    const state = this.streams.get(streamId) ?? { deltaIndex: 0, started: false }
    const events: MappedEvent[] = []
    if (!state.started) {
      events.push(mapped('message.created', sessionId, {
        id: streamId, messageId: streamId, sessionId, role: 'assistant', content: [], text: '', status: 'streaming', createdAt: event.time,
      }))
      state.started = true
    }
    events.push(mapped('message.delta', sessionId, {
      sessionId,
      messageId: streamId,
      deltaIndex: state.deltaIndex++,
      delta: typeof chunk.text === 'string' ? chunk.text : '',
      contentType: chunk.type === 'reasoning-delta' ? 'reasoning' : 'text',
      final: false,
      finishReason: null,
    }))
    this.streams.set(streamId, state)
    return events
  }

  private mapAssistantMessage(sessionId: string, event: { time: number; data: Record<string, any> }): MappedEvent[] {
    const streamId = assistantStreamId(sessionId, event.data.turn, event.data.step)
    const state = this.streams.get(streamId)
    this.streams.delete(streamId)
    if (state === undefined) {
      return [mapped('message.created', sessionId, remoteMessage(event.data.message, sessionId, event.time, streamId))]
    }
    return [mapped('message.delta', sessionId, {
      sessionId,
      messageId: streamId,
      deltaIndex: state.deltaIndex,
      delta: '',
      final: true,
      finishReason: null,
    })]
  }

  private requireSession(sessionId: string): Session {
    const session = this.sessions.get(SessionId(sessionId))
    if (session === undefined) throw new SessionAdapterError('SESSION_NOT_FOUND', 'The session is no longer available.')
    return session
  }
}

export class SessionAdapterError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

function projectSession(session: Session): { messages: RemoteMessageRecord[]; tools: RemoteToolCall[] } {
  const messages: RemoteMessageRecord[] = []
  const tools = new Map<string, RemoteToolCall>()
  for (const event of session.events) {
    const raw = event as unknown as { type: string; time: number; data: Record<string, any> }
    if (raw.type === 'user/message') messages.push(remoteMessage(raw.data, String(session.id), raw.time))
    if (raw.type === 'assistant/message') {
      messages.push(remoteMessage(raw.data.message, String(session.id), raw.time, assistantStreamId(String(session.id), raw.data.turn, raw.data.step)))
    }
    if (raw.type === 'tool/call') tools.set(String(raw.data.callId), runningTool(raw, String(session.id)))
    if (raw.type === 'tool/result') tools.set(toolResultCallId(raw), finishedTool(raw, session))
  }
  return { messages, tools: [...tools.values()] }
}

function remoteMessage(message: Record<string, any>, sessionId: string, createdAt: number, idOverride?: string): RemoteMessageRecord {
  const content = Array.isArray(message.content) ? structuredClone(message.content) : []
  const id = idOverride ?? String(message.id)
  return {
    id,
    messageId: id,
    sessionId,
    role: message.role === 'assistant' || message.role === 'system' ? message.role : 'user',
    content,
    text: textOf(content),
    status: 'complete',
    createdAt,
  }
}

function runningTool(event: { data: Record<string, any> }, sessionId: string): RemoteToolCall {
  const callId = String(event.data.callId)
  return {
    callId,
    toolCallId: callId,
    sessionId,
    toolName: String(event.data.name),
    title: String(event.data.name),
    status: 'running',
    input: parseJson(event.data.arguments),
    output: null,
    isError: false,
  }
}

function finishedTool(event: { data: Record<string, any> }, session: Session): RemoteToolCall {
  const callId = toolResultCallId(event)
  const started = [...session.events].reverse().find(candidate =>
    candidate.type === 'tool/call' && String(candidate.data.callId) === callId,
  ) as unknown as { data?: Record<string, any> } | undefined
  const block = event.data.message?.content?.[0]
  const isError = Boolean(block?.isError || event.data.error)
  return {
    callId,
    toolCallId: callId,
    sessionId: String(session.id),
    toolName: String(started?.data?.name ?? 'tool'),
    title: String(started?.data?.name ?? 'Tool'),
    status: isError ? 'error' : 'success',
    input: parseJson(started?.data?.arguments),
    output: structuredClone(block?.content ?? event.data.message?.content ?? null),
    isError,
  }
}

function toolResultCallId(event: { data: Record<string, any> }): string {
  return String(event.data.message?.source?.callId ?? event.data.message?.content?.[0]?.toolCallId ?? 'unknown')
}

function assistantStreamId(sessionId: string, turn: unknown, step: unknown): string {
  return `assistant:${sessionId}:${String(turn)}:${String(step)}`
}

function textOf(content: unknown[]): string {
  return content.flatMap((block) => {
    if (typeof block !== 'object' || block === null) return []
    const record = block as Record<string, unknown>
    if ((record.type === 'text' || record.type === 'reasoning') && typeof record.text === 'string') return [record.text]
    return []
  }).join('')
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value ?? null
  try { return JSON.parse(value) as unknown } catch { return value }
}

function fallbackTitle(session: Session): string {
  for (const event of [...session.events].reverse()) {
    const raw = event as unknown as { type: string; data: Record<string, any> }
    if (raw.type === 'session/title' && typeof raw.data.title === 'string') return raw.data.title
  }
  const firstUser = session.events.find(event => event.type === 'user/message') as unknown as { data?: Record<string, any> } | undefined
  const text = textOf(Array.isArray(firstUser?.data?.content) ? firstUser.data.content : []).trim()
  return text === '' ? String(session.id) : `${text.slice(0, 57)}${text.length > 57 ? '…' : ''}`
}

function mapped(event: MappedEvent['event'], sessionId: string, data: unknown): MappedEvent {
  return { event, sessionId, data }
}
