import type { EventPayload, PermissionDecision, PermissionRequest } from '@dsh-remote/protocol'
import type { ChatItem, ChatMessage, PermissionActivity, ToolActivity } from '../types'

type UnknownRecord = Record<string, unknown>

export function applyRemoteEvent(current: ChatItem[], event: EventPayload): ChatItem[] {
  const data = asRecord(event.data)
  const sessionId = stringValue(data.sessionId)
  if (sessionId === undefined) return current

  if (event.event === 'message.created') return addCreatedMessage(current, data, sessionId)
  if (event.event === 'message.delta') return applyMessageDelta(current, data, sessionId)
  if (event.event === 'tool.started' || event.event === 'tool.updated' || event.event === 'tool.finished') {
    return applyToolEvent(current, data, sessionId, event.event)
  }
  if (event.event === 'permission.requested') return addPermission(current, data, sessionId)
  if (event.event === 'permission.resolved') return resolvePermission(current, data)
  return current
}

function addCreatedMessage(current: ChatItem[], data: UnknownRecord, sessionId: string): ChatItem[] {
  const text = stringValue(data.text) ?? ''
  const role = roleValue(data.role)
  const id = stringValue(data.messageId) ?? stringValue(data.id) ?? localId('message')
  const existing = current.find(item => item.id === id)
  if (existing !== undefined) return current
  const optimisticMatch = [...current].reverse().find(item =>
    item.kind === 'message'
    && item.role === 'user'
    && item.text === text
    && Date.now() - item.createdAt < 5_000)
  if (optimisticMatch !== undefined) return current
  const message: ChatMessage = { kind: 'message', id, sessionId, role, text, createdAt: Date.now() }
  return [...current, message]
}

function applyMessageDelta(current: ChatItem[], data: UnknownRecord, sessionId: string): ChatItem[] {
  const id = stringValue(data.messageId) ?? localId('stream')
  const delta = stringValue(data.delta) ?? ''
  const index = current.findIndex(item => item.id === id && item.kind === 'message')
  if (index < 0) {
    return [...current, {
      kind: 'message', id, sessionId, role: 'assistant', text: delta, streaming: true, createdAt: Date.now(),
    }]
  }
  return current.map((item, itemIndex) => itemIndex === index && item.kind === 'message'
    ? { ...item, text: `${item.text}${delta}`, streaming: true }
    : item)
}

function applyToolEvent(
  current: ChatItem[],
  data: UnknownRecord,
  sessionId: string,
  eventName: 'tool.started' | 'tool.updated' | 'tool.finished',
): ChatItem[] {
  const id = stringValue(data.toolCallId) ?? stringValue(data.id) ?? localId('tool')
  const state: ToolActivity['state'] = eventName === 'tool.finished'
    ? (data.error === undefined ? 'finished' : 'failed')
    : 'running'
  const next: ToolActivity = {
    kind: 'tool',
    id,
    sessionId,
    toolName: stringValue(data.toolName) ?? stringValue(data.name) ?? 'Tool',
    summary: stringValue(data.summary) ?? stringValue(data.command),
    state,
    createdAt: Date.now(),
  }
  const exists = current.some(item => item.id === id)
  const finalized = finishStreaming(current)
  return exists ? finalized.map(item => item.id === id ? { ...next, createdAt: item.createdAt } : item) : [...finalized, next]
}

function addPermission(current: ChatItem[], data: UnknownRecord, sessionId: string): ChatItem[] {
  const requestId = stringValue(data.requestId)
  const permission = asRecord(data.permission)
  if (requestId === undefined) return current
  const request: PermissionRequest = {
    requestId,
    sessionId,
    permission: {
      kind: permissionKind(permission.kind),
      command: stringValue(permission.command),
      cwd: stringValue(permission.cwd),
      toolName: stringValue(permission.toolName),
      description: stringValue(permission.description),
      raw: permission.raw,
    },
  }
  const activity: PermissionActivity = {
    kind: 'permission', id: `permission:${requestId}`, sessionId, request, createdAt: Date.now(),
  }
  const finalized = finishStreaming(current)
  return finalized.some(item => item.id === activity.id) ? finalized : [...finalized, activity]
}

function resolvePermission(current: ChatItem[], data: UnknownRecord): ChatItem[] {
  const requestId = stringValue(data.requestId)
  const decision = decisionValue(data.decision)
  if (requestId === undefined || decision === undefined) return current
  return current.map(item => item.kind === 'permission' && item.request.requestId === requestId
    ? { ...item, decision }
    : item)
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {}
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function roleValue(value: unknown): ChatMessage['role'] {
  return value === 'user' || value === 'system' ? value : 'assistant'
}

function permissionKind(value: unknown): PermissionRequest['permission']['kind'] {
  return value === 'command' || value === 'tool' || value === 'workspace' ? value : 'unknown'
}

function decisionValue(value: unknown): PermissionDecision | undefined {
  return value === 'allow_once' || value === 'allow_session' || value === 'deny' ? value : undefined
}

function localId(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

function finishStreaming(items: ChatItem[]): ChatItem[] {
  return items.map(item => item.kind === 'message' && item.streaming ? { ...item, streaming: false } : item)
}
