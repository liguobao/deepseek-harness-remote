import type { HistoryEntry, ApprovalOutcome, ChatItem, ChatMessage, MuxStreamFrame, NativeSessionEvent, ToolActivity } from '../types'

type UnknownRecord = Record<string, unknown>

/** Fold a native history event window into ordered chat items. */
export function foldHistory(events: HistoryEntry[], sessionId: string): ChatItem[] {
  let items: ChatItem[] = []
  for (const entry of events) {
    items = applyNativeEvent(items, entry.event, sessionId)
  }
  return items
}

/** Apply one live mux frame to the current chat items. */
export function applyMuxFrame(current: ChatItem[], frame: MuxStreamFrame): ChatItem[] {
  const payload = frame.payload
  if (payload.type === 'session/event' && isRecord(payload.event)) {
    const sessionId = stringValue(payload.sessionId)
    if (sessionId === undefined) return current
    return applyNativeEvent(current, payload.event as NativeSessionEvent, sessionId)
  }
  if (payload.type === 'approval/requested') {
    return addApproval(current, payload as unknown as UnknownRecord, frame.rpcId)
  }
  if (payload.type === 'approval/resolved') {
    return resolveApproval(current, payload as unknown as UnknownRecord)
  }
  if (payload.type === 'question/requested') {
    return addQuestion(current, payload as unknown as UnknownRecord, frame.rpcId)
  }
  if (payload.type === 'question/resolved') {
    return resolveQuestion(current, payload as unknown as UnknownRecord)
  }
  return current
}

/** Route one aggregated mux frame into the message bucket owned by its session. */
export function applyMuxFrameToMessages(
  current: Record<string, ChatItem[]>,
  frame: MuxStreamFrame,
): Record<string, ChatItem[]> {
  const sessionId = stringValue(frame.payload.sessionId)
  if (sessionId === undefined) return current
  return {
    ...current,
    [sessionId]: applyMuxFrame(current[sessionId] ?? [], frame),
  }
}

function applyNativeEvent(current: ChatItem[], event: NativeSessionEvent, sessionId: string): ChatItem[] {
  const data = isRecord(event.data) ? event.data : {}
  if (event.type === 'user/message') return addUserMessage(current, data, sessionId)
  if (event.type === 'assistant/message') return addAssistantMessage(current, data, sessionId, event)
  if (event.type === 'assistant/chunk') return applyAssistantChunk(current, data, sessionId, event)
  if (event.type === 'tool/call') return applyToolCall(current, data, sessionId, 'running')
  if (event.type === 'tool/result') return applyToolCall(current, data, sessionId, 'finished')
  return current
}

function addUserMessage(current: ChatItem[], data: UnknownRecord, sessionId: string): ChatItem[] {
  const id = messageId(data)
  const text = messageText(data)
  if (text.length === 0) return current
  const rpcId = messageRequestRpcId(data)
  const optimisticIndex = rpcId === undefined
    ? -1
    : current.findIndex(item => item.kind === 'message' && item.requestRpcId === rpcId)
  const message: ChatMessage = { kind: 'message', id, sessionId, role: 'user', text, createdAt: now(data) }
  if (optimisticIndex >= 0) {
    return current.map((item, index) => index === optimisticIndex ? message : item)
  }
  const existing = current.find(item => item.id === id)
  if (existing !== undefined) return current
  return [...current, message]
}

function addAssistantMessage(current: ChatItem[], data: UnknownRecord, sessionId: string, event: NativeSessionEvent): ChatItem[] {
  const id = messageId(data)
  const text = messageText(data)
  const key = stepKey(event)
  const streamingIndex = current.findIndex(item =>
    item.kind === 'message' && item.streaming === true && item.id === `stream:${key}`)
  const message: ChatMessage = { kind: 'message', id, sessionId, role: 'assistant', text, createdAt: now(data) }
  if (streamingIndex >= 0) {
    return current.map((item, index) => index === streamingIndex ? message : item)
  }
  const existing = current.find(item => item.id === id)
  if (existing !== undefined) return current
  return [...current, message]
}

function applyAssistantChunk(
  current: ChatItem[],
  data: UnknownRecord,
  sessionId: string,
  event: NativeSessionEvent,
): ChatItem[] {
  const chunk = isRecord(data.chunk) ? data.chunk : {}
  if (chunk.type !== 'text-delta' && chunk.type !== 'reasoning-delta') return current
  const delta = typeof chunk.text === 'string' ? chunk.text : ''
  if (delta.length === 0) return current
  const key = stepKey(event)
  const streamId = `stream:${key}`
  const index = current.findIndex(item => item.id === streamId && item.kind === 'message')
  if (index < 0) {
    return [...current, {
      kind: 'message', id: streamId, sessionId, role: 'assistant', text: delta, streaming: true, createdAt: now(data),
    } satisfies ChatMessage]
  }
  return current.map((item, itemIndex) => itemIndex === index && item.kind === 'message'
    ? { ...item, text: `${item.text}${delta}`, streaming: true }
    : item)
}

function applyToolCall(
  current: ChatItem[],
  data: UnknownRecord,
  sessionId: string,
  state: ToolActivity['state'],
): ChatItem[] {
  const id = stringValue(data.callId) ?? stringValue(data.id) ?? localId('tool')
  const name = stringValue(data.name) ?? stringValue(data.toolName) ?? 'Tool'
  const argumentsText = stringValue(data.arguments) ?? stringValue(data.argumentsDelta) ?? ''
  const summary = stringValue(data.summary) ?? toolResultText(data)
  const next: ToolActivity = {
    kind: 'tool',
    id,
    sessionId,
    toolName: name,
    ...(argumentsText.length > 0 ? { arguments: argumentsText } : {}),
    ...(summary === undefined ? {} : { summary }),
    state: state === 'finished' && isRecord(data.content) ? 'finished' : state,
    createdAt: now(data),
  }
  const exists = current.some(item => item.id === id)
  return exists
    ? current.map(item => item.id === id ? { ...next, createdAt: item.createdAt } : item)
    : [...current, next]
}

function addApproval(current: ChatItem[], payload: UnknownRecord, frameRpcId: string): ChatItem[] {
  const approvalId = stringValue(payload.approvalId)
  const sessionId = stringValue(payload.sessionId)
  if (approvalId === undefined || sessionId === undefined) return current
  const id = `approval:${approvalId}`
  const existing = current.find(item => item.id === id)
  const activity = {
    kind: 'approval' as const,
    id,
    sessionId,
    approvalId,
    toolName: stringValue(payload.toolName) ?? 'Harness',
    ...(stringValue(payload.reason) === undefined ? {} : { reason: stringValue(payload.reason) }),
    ...(frameRpcId.length === 0 ? {} : { frameRpcId }),
    createdAt: Date.now(),
  }
  return existing !== undefined ? current : [...current, activity]
}

function resolveApproval(current: ChatItem[], payload: UnknownRecord): ChatItem[] {
  const approvalId = stringValue(payload.approvalId)
  const outcome = stringValue(payload.outcome)
  if (approvalId === undefined || outcome === undefined) return current
  if (outcome !== 'allowed-once' && outcome !== 'rejected' && outcome !== 'cancelled' && outcome !== 'unavailable') return current
  return current.map(item => item.kind === 'approval' && item.approvalId === approvalId
    ? { ...item, outcome: outcome as ApprovalOutcome }
    : item)
}

function addQuestion(current: ChatItem[], payload: UnknownRecord, frameRpcId: string): ChatItem[] {
  const sessionId = stringValue(payload.sessionId)
  const questions = Array.isArray(payload.questions) ? payload.questions : []
  if (sessionId === undefined || questions.length === 0) return current
  const id = `question:${frameRpcId || questions[0]?.id || localId('question')}`
  const existing = current.find(item => item.id === id)
  const activity = {
    kind: 'question' as const,
    id,
    sessionId,
    ...(frameRpcId.length === 0 ? {} : { frameRpcId }),
    questions,
    createdAt: Date.now(),
  }
  return existing !== undefined ? current : [...current, activity]
}

function resolveQuestion(current: ChatItem[], payload: UnknownRecord): ChatItem[] {
  const questionRpcId = stringValue(payload.questionRpcId)
  const outcome = stringValue(payload.outcome)
  if (questionRpcId === undefined || outcome === undefined) return current
  return current.map(item => item.kind === 'question' && item.frameRpcId === questionRpcId
    ? { ...item, outcome: outcome === 'answered' ? 'answered' as const : 'cancelled' as const }
    : item)
}

function messageId(data: UnknownRecord): string {
  const message = isRecord(data.message) ? data.message : data
  return stringValue(message.id) ?? localId('message')
}

function messageText(data: UnknownRecord): string {
  const message = isRecord(data.message) ? data.message : data
  const content = Array.isArray(message.content) ? message.content : []
  return content.flatMap(block => isRecord(block) && block.type === 'text' && typeof block.text === 'string'
    ? [block.text]
    : []).join('\n')
}

function messageRequestRpcId(data: UnknownRecord): string | undefined {
  const message = isRecord(data.message) ? data.message : data
  const source = isRecord(message.source) ? message.source : undefined
  return source?.kind === 'user' ? stringValue(source.rpcId) : undefined
}

function toolResultText(data: UnknownRecord): string | undefined {
  const content = Array.isArray(data.content) ? data.content : []
  const text = content.flatMap(block => isRecord(block) && block.type === 'text' && typeof block.text === 'string'
    ? [block.text]
    : []).join('\n')
  return text.length === 0 ? undefined : text
}

function stepKey(event: NativeSessionEvent): string {
  const data = isRecord(event.data) ? event.data : {}
  return `${stringValue(data.turn) ?? '?'}:${stringValue(data.step) ?? '?'}`
}

function now(data: UnknownRecord): number {
  return typeof data.time === 'number' ? data.time : Date.now()
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function localId(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`
}
