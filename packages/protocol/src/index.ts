import { z } from 'zod'

export const PROTOCOL_VERSION = 1

export const messageTypes = [
  'rpc.request',
  'rpc.response',
  'rpc.error',
  'event',
  'signal.offer',
  'signal.answer',
  'signal.ice',
  'hello',
  'relay',
  'ping',
  'pong',
] as const

export const rpcMethods = [
  'system.info',
  'workspace.get',
  'sessions.list',
  'sessions.get',
  'sessions.create',
  'session.send',
  'session.stop',
  'permissions.respond',
  'connection.ping',
  'sync.from',
] as const

export const remoteEvents = [
  'session.created',
  'session.updated',
  'message.created',
  'message.delta',
  'tool.started',
  'tool.updated',
  'tool.finished',
  'permission.requested',
  'permission.resolved',
  'agent.status',
  'connection.stats',
] as const

export type MessageType = typeof messageTypes[number]
export type RpcMethod = typeof rpcMethods[number]
export type RemoteEventName = typeof remoteEvents[number]

export interface RemoteMessage<TPayload = unknown> {
  v: typeof PROTOCOL_VERSION
  id: string
  type: MessageType
  timestamp: number
  payload: TPayload
}

export interface RpcRequestPayload<TParams = unknown> {
  method: RpcMethod
  params: TParams
}

export interface RpcResponsePayload<TResult = unknown> {
  requestId: string
  result: TResult
}

export interface RpcErrorPayload {
  requestId: string
  code: string
  message: string
  retryable?: boolean
  details?: unknown
}

export interface EventPayload<TData = unknown> {
  seq?: number
  event: RemoteEventName
  sessionId?: string
  data: TData
}

export interface DeviceDescriptor {
  deviceId: string
  name: string
  platform: NodeJS.Platform | string
  publicKey: string
  pluginVersion?: string
  harnessVersion?: string
  hostname?: string
}

export interface SessionSummary {
  id: string
  title: string
  cwd?: string
  running: boolean
  updatedAt?: number
}

export interface PermissionRequest {
  requestId: string
  sessionId: string
  permission: {
    kind: 'command' | 'tool' | 'workspace' | 'unknown'
    command?: string
    cwd?: string
    toolName?: string
    description?: string
    raw?: unknown
  }
}

export type PermissionDecision = 'allow_once' | 'allow_session' | 'deny'

export interface TransportStats {
  mode: 'LAN' | 'P2P' | 'TURN' | 'Relay' | 'Disconnected'
  connected: boolean
  rttMs?: number
  bytesSent?: number
  bytesReceived?: number
}

const rpcMethodSchema = z.enum(rpcMethods)
const messageTypeSchema = z.enum(messageTypes)

export const remoteMessageSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  id: z.string().min(1),
  type: messageTypeSchema,
  timestamp: z.number().int().positive(),
  payload: z.unknown(),
}) as unknown as z.ZodType<RemoteMessage>

export const rpcRequestPayloadSchema = z.object({
  method: rpcMethodSchema,
  params: z.unknown(),
}) as unknown as z.ZodType<RpcRequestPayload>

export const rpcResponsePayloadSchema = z.object({
  requestId: z.string().min(1),
  result: z.unknown(),
}) as unknown as z.ZodType<RpcResponsePayload>

export const rpcErrorPayloadSchema: z.ZodType<RpcErrorPayload> = z.object({
  requestId: z.string().min(1),
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean().optional(),
  details: z.unknown().optional(),
})

export function createMessage<TPayload>(
  type: MessageType,
  payload: TPayload,
  id = cryptoRandomId(),
): RemoteMessage<TPayload> {
  return {
    v: PROTOCOL_VERSION,
    id,
    type,
    timestamp: Date.now(),
    payload,
  }
}

export function createRpcRequest<TParams>(
  method: RpcMethod,
  params: TParams,
  id?: string,
): RemoteMessage<RpcRequestPayload<TParams>> {
  return createMessage('rpc.request', { method, params }, id)
}

export function createRpcResponse<TResult>(
  requestId: string,
  result: TResult,
): RemoteMessage<RpcResponsePayload<TResult>> {
  return createMessage('rpc.response', { requestId, result })
}

export function createRpcError(
  requestId: string,
  code: string,
  message: string,
  details?: unknown,
  retryable?: boolean,
): RemoteMessage<RpcErrorPayload> {
  return createMessage('rpc.error', { requestId, code, message, details, retryable })
}

export function createEvent<TData>(
  event: RemoteEventName,
  data: TData,
  options: { seq?: number; sessionId?: string } = {},
): RemoteMessage<EventPayload<TData>> {
  return createMessage('event', { event, data, ...options })
}

export function parseRemoteMessage(input: unknown): RemoteMessage {
  return remoteMessageSchema.parse(input)
}

export function encodeMessage(message: RemoteMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(message))
}

export function decodeMessage(data: Uint8Array | string): RemoteMessage {
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
  return parseRemoteMessage(JSON.parse(text))
}

function cryptoRandomId(): string {
  const g = globalThis.crypto
  if (g?.randomUUID) return g.randomUUID()
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}
