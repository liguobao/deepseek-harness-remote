import { z } from 'zod'

export const PROTOCOL_VERSION = 1
export const SECURE_FRAGMENT_CHUNK_BYTES = 48 * 1024
export const MAX_SECURE_MESSAGE_BYTES = 4 * 1024 * 1024
/** Decoded bytes carried by one authenticated Harness ApiProxy transfer chunk. */
export const HARNESS_API_TRANSFER_CHUNK_BYTES = 512 * 1024
/**
 * Bounded transfer size for rc.2 image prompts. The upstream default admits
 * up to 200 MiB of source images; their base64 JSON envelope needs roughly
 * 267 MiB, so 288 MiB leaves room for the native request structure.
 */
export const MAX_HARNESS_API_TRANSFER_BYTES = 288 * 1024 * 1024

const SECURE_FRAGMENT_MAGIC = new Uint8Array([0x44, 0x53, 0x48, 0x46]) // DSHF
const SECURE_FRAGMENT_VERSION = 1
const SECURE_FRAGMENT_HEADER_BYTES = 17
const MAX_IN_FLIGHT_SECURE_MESSAGES = 8

export const messageTypes = [
  'rpc.request',
  'rpc.response',
  'rpc.error',
  'event',
] as const

export const controlFrameTypes = [
  'hello',
  'hello.ack',
  'connect.request',
  'connect.incoming',
  'connect.accepted',
  'connect.rejected',
  'secure.handshake',
  'relay',
  'signal.offer',
  'signal.answer',
  'signal.ice',
  'transport.selected',
  'ping',
  'pong',
  'error',
] as const

export const rpcMethods = [
  'harness.api.call',
  'harness.api.transfer.open',
  'harness.api.transfer.chunk',
  'harness.api.transfer.commit',
  'harness.api.transfer.read',
  'harness.api.transfer.close',
  'harness.api.respond',
  'harness.api.stream.open',
  'harness.api.stream.close',
  'fileviewer.call',
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
  'harness.api.frame',
  'harness.api.stream.closed',
] as const

export type MessageType = typeof messageTypes[number]
export type ControlFrameType = typeof controlFrameTypes[number]
export type RpcMethod = typeof rpcMethods[number]
export type RemoteEventName = typeof remoteEvents[number]

export interface ControlFrame<TPayload = unknown> {
  v: typeof PROTOCOL_VERSION
  id: string
  type: ControlFrameType
  timestamp: number
  payload: TPayload
}

export interface HelloPayload {
  role: 'host' | 'client'
  deviceId: string
  accessToken: string
  protocols: number[]
  capabilities: string[]
  /** Version of the Client/Plugin software reporting in; symmetric to ``HelloAckPayload.serverVersion``. */
  clientVersion?: string
}

export interface HelloAckPayload {
  protocol: typeof PROTOCOL_VERSION
  serverVersion: string
  connectionSessionId: string
  heartbeatIntervalMs: number
  maxControlFrameBytes: number
  maxRelayFrameBytes: number
  webrtcEnabled?: boolean
  webrtcFallbackTimeoutMs?: number
}

export interface ConnectRequestPayload {
  hostDeviceId: string
  preferredTransports: Array<'lan' | 'p2p' | 'turn' | 'relay'>
}

export interface ConnectIncomingPayload {
  connectionId: string
  clientDeviceId: string
  clientIdentityKey: string
  authorization: 'account'
  preferredTransports: Array<'lan' | 'p2p' | 'turn' | 'relay'>
}

export interface ConnectAcceptedPayload {
  connectionId: string
}

export interface ConnectRejectedPayload {
  connectionId: string
  code?: string
  message?: string
}

export interface SecureHandshakePayload {
  connectionId: string
  targetDeviceId: string
  step: number
  data: string
}

export interface ControlErrorPayload {
  code: string
  message: string
  retryable?: boolean
  connectionId?: string
}

export interface RelayPayload {
  connectionId: string
  targetDeviceId: string
  counter: number
  ciphertext: string
}

export const selectedTransports = ['p2p', 'turn', 'relay'] as const
export type SelectedTransport = typeof selectedTransports[number]

export interface SignalPayload {
  connectionId: string
  targetDeviceId: string
  sdp: string
}

export interface IceCandidatePayload {
  candidate?: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
  usernameFragment?: string | null
}

export interface SignalIcePayload {
  connectionId: string
  targetDeviceId: string
  candidate: IceCandidatePayload
}

export function normalizeSdpMLineIndex(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null
  return value
}

export interface TransportSelectedPayload {
  connectionId: string
  targetDeviceId: string
  transport: SelectedTransport
}

/** Capabilities both ends announce in ``hello`` to negotiate the data plane. */
export const transportCapabilities = [
  'transport.p2p',
  'transport.turn',
  'transport.relay',
] as const

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
  role: 'host' | 'client'
  platform: string
  identityKey: string
  clientVersion: string
  harnessVersion?: string
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

export type PermissionDecision = 'allow_once' | 'deny'

export interface TransportStats {
  mode: 'LAN' | 'P2P' | 'TURN' | 'Relay' | 'Disconnected'
  connected: boolean
  rttMs?: number
  bytesSent?: number
  bytesReceived?: number
}

/** Native Harness API request tunneled inside the authenticated business channel. */
export interface HarnessApiCallParams {
  method: string
  rpcId: string
  payload: unknown
}

export interface HarnessApiTransferOpenParams {
  transferId: string
  totalBytes: number
  totalChunks: number
}

export interface HarnessApiTransferChunkParams {
  transferId: string
  index: number
  data: string
}

export interface HarnessApiTransferCommitParams {
  transferId: string
}

export interface HarnessApiTransferReadParams {
  transferId: string
  index: number
}

export interface HarnessApiTransferCloseParams {
  transferId: string
}

export type HarnessApiTransferCommitResult =
  | { kind: 'inline'; response: unknown }
  | { kind: 'chunked'; transferId: string; totalBytes: number; totalChunks: number }

export interface HarnessApiTransferReadResult {
  transferId: string
  index: number
  data: string
}

/** Response to an answerable native Harness server request (approval/question). */
export interface HarnessApiRespondParams {
  message: {
    type: 'client-response'
    rpcId: string
    result: unknown
  }
}

export interface HarnessApiStreamOpenParams {
  streamId: string
  stream: 'mux' | 'host'
  rpcId: string
  payload: {
    /** Optional mux focus: only forward frames for this session. */
    sessionId?: string
  }
}

export interface HarnessApiStreamCloseParams {
  streamId: string
}

export interface HarnessApiFrameData {
  streamId: string
  frame: {
    rpcId: string
    payload: unknown
  }
}

export interface HarnessApiStreamClosedData {
  streamId: string
  reason: 'cancelled' | 'completed' | 'failed' | 'peer-disconnected'
}

const rpcMethodSchema = z.enum(rpcMethods)
const messageTypeSchema = z.enum(messageTypes)
const controlFrameTypeSchema = z.enum(controlFrameTypes)

export const remoteMessageSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  id: z.string().min(1),
  type: messageTypeSchema,
  timestamp: z.number().int().positive(),
  payload: z.unknown(),
}) as unknown as z.ZodType<RemoteMessage>

export const controlFrameSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  id: z.string().min(1),
  type: controlFrameTypeSchema,
  timestamp: z.number().int().positive(),
  payload: z.unknown(),
}).strict() as unknown as z.ZodType<ControlFrame>

// ────────────────────────────────────────────────────────────────────────────
// Control frame payload schemas (protocol.md §10-§23)
// ────────────────────────────────────────────────────────────────────────────

const transportEnum = z.enum(['lan', 'p2p', 'turn', 'relay'])
const selectedTransportEnum = z.enum(['p2p', 'turn', 'relay'])

export const helloPayloadSchema = z.object({
  role: z.enum(['host', 'client']),
  deviceId: z.string().min(1),
  accessToken: z.string().min(1),
  protocols: z.array(z.number().int()).min(1),
  capabilities: z.array(z.string()),
  clientVersion: z.string().optional(),
  harnessVersion: z.string().optional(),
})

export const helloAckPayloadSchema = z.object({
  protocol: z.literal(PROTOCOL_VERSION),
  serverVersion: z.string().min(1),
  connectionSessionId: z.string().min(1),
  heartbeatIntervalMs: z.number().int().positive(),
  maxControlFrameBytes: z.number().int().positive(),
  maxRelayFrameBytes: z.number().int().positive(),
  webrtcEnabled: z.boolean().optional(),
  webrtcFallbackTimeoutMs: z.number().int().positive().optional(),
})

export const connectRequestPayloadSchema = z.object({
  hostDeviceId: z.string().min(1),
  preferredTransports: z.array(transportEnum).min(1),
})

export const connectIncomingPayloadSchema = z.object({
  connectionId: z.string().min(1),
  clientDeviceId: z.string().min(1),
  clientIdentityKey: z.string().min(1),
  authorization: z.literal('account'),
  preferredTransports: z.array(transportEnum).min(1),
})

export const connectAcceptedPayloadSchema = z.object({
  connectionId: z.string().min(1),
})

export const connectRejectedPayloadSchema = z.object({
  connectionId: z.string().min(1),
  code: z.string().optional(),
  message: z.string().optional(),
})

export const secureHandshakePayloadSchema = z.object({
  connectionId: z.string().min(1),
  targetDeviceId: z.string().min(1),
  step: z.number().int().positive(),
  data: z.string().min(1),
})

export const relayPayloadSchema = z.object({
  connectionId: z.string().min(1),
  targetDeviceId: z.string().min(1),
  counter: z.number().int().nonnegative(),
  ciphertext: z.string().min(1),
})

export const signalPayloadSchema = z.object({
  connectionId: z.string().min(1),
  targetDeviceId: z.string().min(1),
  sdp: z.string().min(1),
})

export const signalIcePayloadSchema = z.object({
  connectionId: z.string().min(1),
  targetDeviceId: z.string().min(1),
  candidate: z.object({
    candidate: z.string().optional(),
    sdpMid: z.string().nullable().optional(),
    sdpMLineIndex: z.preprocess(normalizeSdpMLineIndex, z.number().int().nonnegative().nullable().optional()),
    usernameFragment: z.string().nullable().optional(),
  }),
})

export const transportSelectedPayloadSchema = z.object({
  connectionId: z.string().min(1),
  targetDeviceId: z.string().min(1),
  transport: selectedTransportEnum,
})

export const pingPongPayloadSchema = z.object({
  nonce: z.string().min(1),
})

export const controlErrorPayloadSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean().optional(),
  connectionId: z.string().min(1).optional(),
})

const controlFramePayloadSchemas: Record<ControlFrameType, z.ZodType> = {
  'hello': helloPayloadSchema,
  'hello.ack': helloAckPayloadSchema,
  'connect.request': connectRequestPayloadSchema,
  'connect.incoming': connectIncomingPayloadSchema,
  'connect.accepted': connectAcceptedPayloadSchema,
  'connect.rejected': connectRejectedPayloadSchema,
  'secure.handshake': secureHandshakePayloadSchema,
  'relay': relayPayloadSchema,
  'signal.offer': signalPayloadSchema,
  'signal.answer': signalPayloadSchema,
  'signal.ice': signalIcePayloadSchema,
  'transport.selected': transportSelectedPayloadSchema,
  'ping': pingPongPayloadSchema,
  'pong': pingPongPayloadSchema,
  'error': controlErrorPayloadSchema,
}

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

export function createControlFrame<TPayload>(
  type: ControlFrameType,
  payload: TPayload,
  id = cryptoRandomId(),
): ControlFrame<TPayload> {
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

export function parseControlFrame(input: unknown): ControlFrame {
  const frame = controlFrameSchema.parse(input)
  const payloadSchema = controlFramePayloadSchemas[frame.type]
  if (payloadSchema) {
    return { ...frame, payload: payloadSchema.parse(frame.payload) }
  }
  return frame
}

export function encodeMessage(message: RemoteMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(message))
}

export function decodeMessage(data: Uint8Array | string): RemoteMessage {
  const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
  return parseRemoteMessage(JSON.parse(text))
}

interface FragmentAssembly {
  total: number
  totalBytes: number
  receivedBytes: number
  chunks: Uint8Array[]
}

/**
 * Splits application plaintext before Noise encryption and reassembles it
 * after decryption. Noise transport messages have a 65,535-byte ceiling, so
 * large native ApiProxy responses cannot be encrypted as one message.
 */
export class SecureMessageCodec {
  private nextMessageId = 1
  private readonly assemblies = new Map<number, FragmentAssembly>()

  encode(message: Uint8Array): Uint8Array[] {
    if (message.byteLength > MAX_SECURE_MESSAGE_BYTES) {
      throw new Error('Secure message exceeds the reassembly limit.')
    }
    if (message.byteLength <= SECURE_FRAGMENT_CHUNK_BYTES) return [message]

    const messageId = this.nextMessageId
    this.nextMessageId = messageId === 0xffff_ffff ? 1 : messageId + 1
    const total = Math.ceil(message.byteLength / SECURE_FRAGMENT_CHUNK_BYTES)
    const frames: Uint8Array[] = []
    for (let index = 0; index < total; index += 1) {
      const start = index * SECURE_FRAGMENT_CHUNK_BYTES
      const chunk = message.subarray(start, Math.min(message.byteLength, start + SECURE_FRAGMENT_CHUNK_BYTES))
      const frame = new Uint8Array(SECURE_FRAGMENT_HEADER_BYTES + chunk.byteLength)
      frame.set(SECURE_FRAGMENT_MAGIC)
      frame[4] = SECURE_FRAGMENT_VERSION
      const view = new DataView(frame.buffer)
      view.setUint32(5, messageId)
      view.setUint16(9, index)
      view.setUint16(11, total)
      view.setUint32(13, message.byteLength)
      frame.set(chunk, SECURE_FRAGMENT_HEADER_BYTES)
      frames.push(frame)
    }
    return frames
  }

  decode(frame: Uint8Array): Uint8Array | undefined {
    if (!isSecureFragment(frame)) return frame
    if (frame.byteLength < SECURE_FRAGMENT_HEADER_BYTES || frame[4] !== SECURE_FRAGMENT_VERSION) {
      throw new Error('Secure fragment header is invalid.')
    }
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
    const messageId = view.getUint32(5)
    const index = view.getUint16(9)
    const total = view.getUint16(11)
    const totalBytes = view.getUint32(13)
    if (messageId === 0 || total < 2 || index >= total || totalBytes <= SECURE_FRAGMENT_CHUNK_BYTES
      || totalBytes > MAX_SECURE_MESSAGE_BYTES
      || total !== Math.ceil(totalBytes / SECURE_FRAGMENT_CHUNK_BYTES)) {
      throw new Error('Secure fragment metadata is invalid.')
    }
    const expectedChunkBytes = Math.min(
      SECURE_FRAGMENT_CHUNK_BYTES,
      totalBytes - index * SECURE_FRAGMENT_CHUNK_BYTES,
    )
    const chunk = frame.subarray(SECURE_FRAGMENT_HEADER_BYTES)
    if (chunk.byteLength !== expectedChunkBytes) throw new Error('Secure fragment length is invalid.')

    let assembly = this.assemblies.get(messageId)
    if (assembly === undefined) {
      if (index !== 0 || this.assemblies.size >= MAX_IN_FLIGHT_SECURE_MESSAGES) {
        throw new Error('Secure fragment sequence is invalid.')
      }
      assembly = { total, totalBytes, receivedBytes: 0, chunks: [] }
      this.assemblies.set(messageId, assembly)
    }
    if (assembly.total !== total || assembly.totalBytes !== totalBytes || index !== assembly.chunks.length) {
      this.assemblies.delete(messageId)
      throw new Error('Secure fragment sequence is invalid.')
    }
    assembly.chunks.push(Uint8Array.from(chunk))
    assembly.receivedBytes += chunk.byteLength
    if (assembly.chunks.length < total) return undefined
    this.assemblies.delete(messageId)
    if (assembly.receivedBytes !== totalBytes) throw new Error('Secure message length is invalid.')
    const message = new Uint8Array(totalBytes)
    let offset = 0
    for (const part of assembly.chunks) {
      message.set(part, offset)
      offset += part.byteLength
    }
    return message
  }

  reset(): void {
    this.nextMessageId = 1
    this.assemblies.clear()
  }
}

function isSecureFragment(frame: Uint8Array): boolean {
  if (frame.byteLength < SECURE_FRAGMENT_MAGIC.byteLength) return false
  for (let index = 0; index < SECURE_FRAGMENT_MAGIC.byteLength; index += 1) {
    if (frame[index] !== SECURE_FRAGMENT_MAGIC[index]) return false
  }
  return true
}

function cryptoRandomId(): string {
  const g = globalThis.crypto
  if (g?.randomUUID) return g.randomUUID()
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}
