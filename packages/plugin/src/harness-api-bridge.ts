import type {
  ApiProxy,
  ClientResponse,
  HostFrame,
  MuxFrame,
  RpcRequest,
  RpcResponse,
} from '@deepseek-ai/dsh-host-apiproxy/api'
import type {
  HarnessApiCallParams,
  HarnessApiFrameData,
  HarnessApiRespondParams,
  HarnessApiStreamClosedData,
  HarnessApiStreamOpenParams,
  HarnessApiTransferChunkParams,
  HarnessApiTransferCommitResult,
  HarnessApiTransferOpenParams,
  HarnessApiTransferReadParams,
  HarnessApiTransferReadResult,
} from '@dsh-remote/protocol'
import {
  createRpcResponse,
  encodeMessage,
  HARNESS_API_TRANSFER_CHUNK_BYTES,
  MAX_HARNESS_API_TRANSFER_BYTES,
  MAX_SECURE_MESSAGE_BYTES,
} from '@dsh-remote/protocol'
import { z } from 'zod'
import type { SafeLogger } from './logging.js'
import { RpcError } from './rpc-router.js'
import { listRemoteDirectory } from './remote-directory-browser.js'

type HarnessStream = AsyncIterable<RpcRequest<MuxFrame | HostFrame>>
type NativeMethod = (request: RpcRequest<unknown>, signal?: AbortSignal) => Promise<RpcResponse<unknown>>
type PublishFrame = (event: 'harness.api.frame' | 'harness.api.stream.closed', data: HarnessApiFrameData | HarnessApiStreamClosedData) => Promise<void>

const callSchema = z.object({
  method: z.string().min(1).max(80),
  rpcId: z.string().min(1).max(128),
  payload: z.unknown(),
}).strict()

const respondSchema = z.object({
  message: z.object({
    type: z.literal('client-response'),
    rpcId: z.string().min(1).max(128),
    result: z.unknown(),
  }).strict(),
}).strict()

const streamOpenSchema = z.object({
  streamId: z.string().min(1).max(128),
  stream: z.enum(['mux', 'host']),
  rpcId: z.string().min(1).max(128),
  payload: z.object({
    // Optional focus for a mux stream: only frames belonging to this session
    // are forwarded. The Remote Web selects one session at a time, so without
    // this every active session's events (potentially megabytes) would be
    // pushed over the tunnel and stall the WebRTC data channel.
    sessionId: z.string().min(1).max(128).optional(),
  }).strict(),
}).strict()

const streamCloseSchema = z.object({ streamId: z.string().min(1).max(128) }).strict()

const transferIdSchema = z.string().min(1).max(128)
const transferOpenSchema = z.object({
  transferId: transferIdSchema,
  totalBytes: z.number().int().positive().max(MAX_HARNESS_API_TRANSFER_BYTES),
  totalChunks: z.number().int().positive().max(Math.ceil(MAX_HARNESS_API_TRANSFER_BYTES / HARNESS_API_TRANSFER_CHUNK_BYTES)),
}).strict()
const transferChunkSchema = z.object({
  transferId: transferIdSchema,
  index: z.number().int().nonnegative(),
  data: z.string().max(Math.ceil(HARNESS_API_TRANSFER_CHUNK_BYTES / 3) * 4),
}).strict()
const transferCommitSchema = z.object({ transferId: transferIdSchema }).strict()
const transferReadSchema = z.object({ transferId: transferIdSchema, index: z.number().int().nonnegative() }).strict()
const transferCloseSchema = z.object({ transferId: transferIdSchema }).strict()

const commandExecuteSchema = z.object({
  agentId: z.string().min(1).max(128),
  line: z.string().min(1).max(2048),
}).strict()

const commandListSchema = z.object({
  agentId: z.string().min(1).max(128),
}).strict()

/**
 * Harness API methods that are safe to expose to an authenticated remote UI.
 * Settings, credentials, native open/picker calls, directory mutation, file
 * contents, downloads, and attachment upload intentionally remain outside
 * this bridge. `session.attachment` is the native read-only lookup used by
 * Harness rc.2 to render an image already referenced by that same session.
 * Directory listing exposes metadata only for workspace picking.
 * `commands.*` follows the official Host registry so the authenticated Remote
 * UI sees the same effective command catalog and handlers as the local UI.
 */
export const HARNESS_API_ALLOWLIST = [
  'session.list',
  'session.search',
  'session.create',
  'session.history',
  'session.models',
  'session.selectModel',
  'session.rename',
  'session.fork',
  'session.prompt',
  'session.attachment',
  'session.updateQueue',
  'session.cancel',
  'subagent.list',
  'subagent.history',
  'subagent.prompt',
  'subagent.interrupt',
  'host.describe',
  'host.listDirectory',
  'workspace.list',
  'workspace.create',
  'workspace.rename',
  'workspace.delete',
  'workspace.insertBefore',
  'workspace.insertSessionBefore',
  'workspace.archiveSession',
  'skill.list',
  'agentPreset.list',
  'agentPreset.select',
  'agentPreset.read',
  'goal.create',
  'goal.edit',
  'goal.pause',
  'goal.resume',
  'goal.complete',
  'goal.clear',
  'commands.execute',
  'commands.list',
  'llm.providers',
  'llm.models',
] as const

export type AllowedHarnessApiMethod = typeof HARNESS_API_ALLOWLIST[number]

interface ActiveStream {
  controller: AbortController
  task: Promise<void>
  /** For a mux stream: only forward frames for this session (undefined = all). */
  focusSessionId?: string
}

interface IncomingApiTransfer {
  totalBytes: number
  totalChunks: number
  chunks: Uint8Array[]
  receivedBytes: number
  touchedAt: number
}

interface OutgoingApiTransfer {
  bytes: Uint8Array
  totalChunks: number
  nextIndex: number
  touchedAt: number
}

/**
 * Native Harness ApiProxy call timeout. The Remote Web frontend gives each
 * `harness.api.call` RPC a 60s window; this bridge must fail faster so the
 * RPC error (not a silent Web-side timeout) reaches the peer and the pending
 * call is released. 30s gives slow native methods room while still beating the
 * Web-side 60s timer by a wide margin.
 */
const NATIVE_CALL_TIMEOUT_MS = 30_000

const MAX_ACTIVE_API_TRANSFERS = 2
const API_TRANSFER_IDLE_MS = 2 * 60_000
const INLINE_TRANSFER_RESPONSE_BYTES = 2 * 1024 * 1024

const SESSION_HISTORY_PAGE_SIZES = [50, 30, 20, 12, 6, 3, 1] as const

/**
 * The official Typert gateway surface (`typertGateway` service from
 * `dsh-api-gateway`) used to dispatch Harness command endpoints. The ApiProxy
 * has no `commands` domain — commands live behind the Typert registry, which
 * is exactly the path the official Web UI exercises via `/api/commands/*`.
 */
export interface TypertGatewayLike {
  invoke(request: {
    namespace: string
    method: string
    args: Record<string, unknown>
    signal?: AbortSignal
  }): Promise<unknown>
}

export class HarnessApiBridge {
  private readonly methods: ReadonlyMap<string, NativeMethod>
  private readonly streams = new Map<string, ActiveStream>()
  private readonly respondable = new Map<string, string>()
  private readonly incomingTransfers = new Map<string, IncomingApiTransfer>()
  private readonly outgoingTransfers = new Map<string, OutgoingApiTransfer>()
  private readonly mux: ApiProxy['events']['mux']
  private readonly host: ApiProxy['events']['host']
  private readonly answer: ApiProxy['respond']

  constructor(
    private readonly api: ApiProxy,
    private readonly publish: PublishFrame,
    private readonly maxStreams = 8,
    private readonly logger?: SafeLogger,
    typertGateway?: TypertGatewayLike,
  ) {
    this.methods = createMethodMap(api, typertGateway)
    this.mux = api.events.mux.bind(api.events)
    this.host = api.events.host.bind(api.events)
    this.answer = api.respond.bind(api)
  }

  async call(input: unknown): Promise<RpcResponse<unknown>> {
    const params = callSchema.parse(input) as HarnessApiCallParams
    const method = this.methods.get(params.method)
    if (method === undefined) throw deniedMethod(params.method)
    const startedAt = performance.now()
    const signal = AbortSignal.timeout(NATIVE_CALL_TIMEOUT_MS)
    const request = { rpcId: params.rpcId as never, payload: params.payload }
    try {
      // Race the native call against the timeout: some native ApiProxy
      // methods ignore AbortSignal, and without this the Host would never
      // answer and the Web-side 60s timer would fire instead. A guaranteed
      // local response turns that into a fast, explicit RPC error.
      const callWithTimeout = (overridePayload: unknown) => withTimeout(
        method({ rpcId: params.rpcId as never, payload: overridePayload }, signal),
        NATIVE_CALL_TIMEOUT_MS,
        `Harness API call ${params.method} timed out after ${NATIVE_CALL_TIMEOUT_MS}ms`,
      )
      let response: RpcResponse<unknown>
      if (params.method === 'session.history') {
        response = await callSessionHistory(callWithTimeout, params.payload, params.rpcId as never)
      } else {
        response = await callWithTimeout(request.payload)
      }
      if (params.method === 'host.listDirectory' && needsRemoteDirectoryFallback(response)) {
        const payload = typeof params.payload === 'object' && params.payload !== null ? params.payload as { path?: unknown } : {}
        const value = await listRemoteDirectory(typeof payload.path === 'string' ? payload.path : undefined, signal)
        response = { rpcId: params.rpcId as never, result: { ok: true, value } }
      }
      this.logger?.debug('harness api call ok', {
        method: params.method,
        durationMs: Math.round(performance.now() - startedAt),
      })
      return response
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt)
      this.logger?.warn('harness api call failed', {
        method: params.method,
        durationMs,
        timedOut: signal.aborted,
        reason: diagnosticReason(error),
      })
      throw error
    }
  }

  openTransfer(input: unknown): { opened: true; transferId: string } {
    this.pruneTransfers()
    const params = transferOpenSchema.parse(input) as HarnessApiTransferOpenParams
    if (params.totalChunks !== Math.ceil(params.totalBytes / HARNESS_API_TRANSFER_CHUNK_BYTES)) {
      throw new RpcError('INVALID_MESSAGE', 'The Harness API transfer chunk count is invalid.')
    }
    if (this.incomingTransfers.has(params.transferId) || this.outgoingTransfers.has(params.transferId)) {
      throw new RpcError('REQUEST_CONFLICT', 'The Harness API transfer id is already active.')
    }
    if (this.incomingTransfers.size >= MAX_ACTIVE_API_TRANSFERS) {
      throw new RpcError('RATE_LIMITED', 'Too many Harness API transfers are active.', undefined, true)
    }
    this.incomingTransfers.set(params.transferId, {
      totalBytes: params.totalBytes,
      totalChunks: params.totalChunks,
      chunks: [],
      receivedBytes: 0,
      touchedAt: Date.now(),
    })
    return { opened: true, transferId: params.transferId }
  }

  appendTransfer(input: unknown): { accepted: true; transferId: string; index: number } {
    this.pruneTransfers()
    const params = transferChunkSchema.parse(input) as HarnessApiTransferChunkParams
    const transfer = this.incomingTransfers.get(params.transferId)
    if (transfer === undefined) throw new RpcError('TRANSFER_NOT_FOUND', 'The Harness API transfer is not active.')
    if (params.index !== transfer.chunks.length || params.index >= transfer.totalChunks) {
      this.incomingTransfers.delete(params.transferId)
      throw new RpcError('INVALID_MESSAGE', 'Harness API transfer chunks must arrive exactly once and in order.')
    }
    let chunk: Uint8Array
    try {
      chunk = decodeCanonicalBase64(params.data)
    } catch (error) {
      this.incomingTransfers.delete(params.transferId)
      throw error
    }
    const expectedBytes = Math.min(
      HARNESS_API_TRANSFER_CHUNK_BYTES,
      transfer.totalBytes - params.index * HARNESS_API_TRANSFER_CHUNK_BYTES,
    )
    if (chunk.byteLength !== expectedBytes) {
      this.incomingTransfers.delete(params.transferId)
      throw new RpcError('INVALID_MESSAGE', 'The Harness API transfer chunk size is invalid.')
    }
    transfer.chunks.push(chunk)
    transfer.receivedBytes += chunk.byteLength
    transfer.touchedAt = Date.now()
    return { accepted: true, transferId: params.transferId, index: params.index }
  }

  async commitTransfer(input: unknown): Promise<HarnessApiTransferCommitResult> {
    this.pruneTransfers()
    const params = transferCommitSchema.parse(input)
    const transfer = this.incomingTransfers.get(params.transferId)
    if (transfer === undefined) throw new RpcError('TRANSFER_NOT_FOUND', 'The Harness API transfer is not active.')
    this.incomingTransfers.delete(params.transferId)
    if (transfer.chunks.length !== transfer.totalChunks || transfer.receivedBytes !== transfer.totalBytes) {
      throw new RpcError('INVALID_MESSAGE', 'The Harness API transfer is incomplete.')
    }
    let request: unknown
    try {
      const bytes = concatChunks(transfer.chunks, transfer.totalBytes)
      request = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    } catch {
      throw new RpcError('INVALID_MESSAGE', 'The Harness API transfer does not contain a valid request.')
    }
    // Parse before dispatch so a transfer cannot bypass the exact same native
    // envelope validation and method allowlist used by harness.api.call.
    const nativeRequest = callSchema.parse(request) as HarnessApiCallParams
    const response = await this.call(nativeRequest)
    const responseBytes = new TextEncoder().encode(JSON.stringify(response))
    if (responseBytes.byteLength <= INLINE_TRANSFER_RESPONSE_BYTES) {
      return { kind: 'inline', response }
    }
    if (responseBytes.byteLength > MAX_HARNESS_API_TRANSFER_BYTES) {
      throw new RpcError('RESPONSE_TOO_LARGE', 'The Harness API response exceeds the bounded transfer limit.')
    }
    this.pruneTransfers()
    if (this.outgoingTransfers.size >= MAX_ACTIVE_API_TRANSFERS) {
      throw new RpcError('RATE_LIMITED', 'Too many Harness API response transfers are active.', undefined, true)
    }
    const totalChunks = Math.ceil(responseBytes.byteLength / HARNESS_API_TRANSFER_CHUNK_BYTES)
    this.outgoingTransfers.set(params.transferId, {
      bytes: responseBytes,
      totalChunks,
      nextIndex: 0,
      touchedAt: Date.now(),
    })
    return { kind: 'chunked', transferId: params.transferId, totalBytes: responseBytes.byteLength, totalChunks }
  }

  readTransfer(input: unknown): HarnessApiTransferReadResult {
    this.pruneTransfers()
    const params = transferReadSchema.parse(input) as HarnessApiTransferReadParams
    const transfer = this.outgoingTransfers.get(params.transferId)
    if (transfer === undefined) throw new RpcError('TRANSFER_NOT_FOUND', 'The Harness API response transfer is not active.')
    if (params.index !== transfer.nextIndex || params.index >= transfer.totalChunks) {
      this.outgoingTransfers.delete(params.transferId)
      throw new RpcError('INVALID_MESSAGE', 'Harness API response chunks must be read exactly once and in order.')
    }
    const start = params.index * HARNESS_API_TRANSFER_CHUNK_BYTES
    const end = Math.min(start + HARNESS_API_TRANSFER_CHUNK_BYTES, transfer.bytes.byteLength)
    transfer.nextIndex += 1
    transfer.touchedAt = Date.now()
    return {
      transferId: params.transferId,
      index: params.index,
      data: Buffer.from(transfer.bytes.subarray(start, end)).toString('base64'),
    }
  }

  closeTransfer(input: unknown): { closed: boolean; transferId: string } {
    const params = transferCloseSchema.parse(input)
    const incoming = this.incomingTransfers.delete(params.transferId)
    const outgoing = this.outgoingTransfers.delete(params.transferId)
    return { closed: incoming || outgoing, transferId: params.transferId }
  }

  async respond(input: unknown): Promise<unknown> {
    const params = respondSchema.parse(input) as HarnessApiRespondParams
    this.logger?.debug('harness api respond', { rpcId: shortId(params.message.rpcId) })
    if (!this.respondable.has(params.message.rpcId)) {
      throw new RpcError('PERMISSION_NOT_PENDING', 'The response id was not emitted on this peer connection.')
    }
    const receipt = await this.answer(params.message as ClientResponse)
    if (receipt.accepted || receipt.reason === 'not-pending') this.respondable.delete(params.message.rpcId)
    return receipt
  }

  openStream(input: unknown): { opened: true; streamId: string } {
    const params = streamOpenSchema.parse(input) as HarnessApiStreamOpenParams
    if (this.streams.has(params.streamId)) throw new RpcError('REQUEST_CONFLICT', 'The Harness event stream is already open.')
    if (this.streams.size >= this.maxStreams) throw new RpcError('RATE_LIMITED', 'Too many Harness event streams are open.', undefined, true)
    const controller = new AbortController()
    const request = { rpcId: params.rpcId as never, payload: params.payload }
    const stream = params.stream === 'mux'
      ? this.mux(request as never, controller.signal)
      : this.host(request as never, controller.signal)
    const focusSessionId = params.stream === 'mux' ? params.payload.sessionId : undefined
    const task = this.pump(params.streamId, stream, controller.signal, focusSessionId)
    this.streams.set(params.streamId, { controller, task, ...(focusSessionId === undefined ? {} : { focusSessionId }) })
    this.logger?.debug('harness api stream open', {
      stream: params.stream,
      streamId: shortId(params.streamId),
      ...(focusSessionId === undefined ? {} : { focusSessionId: shortId(focusSessionId) }),
    })
    return { opened: true, streamId: params.streamId }
  }

  closeStream(input: unknown): { closed: boolean; streamId: string } {
    const params = streamCloseSchema.parse(input)
    const active = this.streams.get(params.streamId)
    if (active !== undefined) {
      // Free the slot synchronously. A native ApiProxy stream may not observe
      // the abort until its next frame, so a session-focused mux stream on an
      // idle session could otherwise hold its slot forever and block the
      // client's documented close-then-reopen session switch with
      // RATE_LIMITED. The pump's finally performs a no-op delete later.
      this.streams.delete(params.streamId)
      active.controller.abort()
    }
    this.logger?.debug('harness api stream close', { streamId: shortId(params.streamId), closed: active !== undefined })
    return { closed: active !== undefined, streamId: params.streamId }
  }

  async closeAll(reason: HarnessApiStreamClosedData['reason'] = 'peer-disconnected'): Promise<void> {
    const streams = [...this.streams.values()]
    this.streams.clear()
    this.respondable.clear()
    this.incomingTransfers.clear()
    this.outgoingTransfers.clear()
    for (const stream of streams) stream.controller.abort(reason)
    // A native ApiProxy stream may not observe AbortSignal until its next
    // frame. Waiting for every pump here would block a replacement peer from
    // installing its message handler indefinitely. The detached pumps own
    // their errors and terminal event publication, so abort and release them
    // without holding up the authenticated connection handoff.
  }

  private pruneTransfers(): void {
    const cutoff = Date.now() - API_TRANSFER_IDLE_MS
    for (const [transferId, transfer] of this.incomingTransfers) {
      if (transfer.touchedAt < cutoff) this.incomingTransfers.delete(transferId)
    }
    for (const [transferId, transfer] of this.outgoingTransfers) {
      if (transfer.touchedAt < cutoff) this.outgoingTransfers.delete(transferId)
    }
  }

  private async pump(
    streamId: string,
    stream: HarnessStream,
    signal: AbortSignal,
    focusSessionId?: string,
  ): Promise<void> {
    let reason: HarnessApiStreamClosedData['reason'] = 'completed'
    try {
      for await (const frame of stream) {
        if (signal.aborted) break
        if (focusSessionId !== undefined && frameSessionId(frame) !== undefined && frameSessionId(frame) !== focusSessionId) {
          // Keep pushing to the native stream (the peer's upstream may still
          // emit approvals for the focused session through the same pump) but
          // do not forward other sessions' traffic over the tunnel.
          continue
        }
        this.trackRespondable(frame)
        await this.publish('harness.api.frame', { streamId, frame } satisfies HarnessApiFrameData)
      }
      if (signal.aborted) reason = 'cancelled'
    } catch {
      reason = signal.aborted ? 'cancelled' : 'failed'
    } finally {
      this.streams.delete(streamId)
      await this.publish('harness.api.stream.closed', { streamId, reason } satisfies HarnessApiStreamClosedData).catch(() => undefined)
    }
  }

  private trackRespondable(frame: RpcRequest<MuxFrame | HostFrame>): void {
    const payload = frame.payload
    if (payload.type === 'approval/requested') {
      this.respondable.set(String(frame.rpcId), `approval:${String(payload.approvalId)}`)
      return
    }
    if (payload.type === 'question/requested') {
      this.respondable.set(String(frame.rpcId), `question:${String(frame.rpcId)}`)
      return
    }
    if (payload.type === 'approval/resolved') {
      this.deleteRespondable(`approval:${String(payload.approvalId)}`)
      return
    }
    if (payload.type === 'question/resolved') {
      this.respondable.delete(String(payload.questionRpcId))
    }
  }

  private deleteRespondable(value: string): void {
    for (const [rpcId, correlation] of this.respondable) {
      if (correlation === value) this.respondable.delete(rpcId)
    }
  }
}

function needsRemoteDirectoryFallback(response: RpcResponse<unknown>): boolean {
  const result = response.result
  return typeof result === 'object' && result !== null && 'ok' in result && result.ok === false
    && 'error' in result && typeof result.error === 'object' && result.error !== null
    && 'code' in result.error && result.error.code === 'directory-picker-unavailable'
}

function createMethodMap(api: ApiProxy, typertGateway?: TypertGatewayLike): ReadonlyMap<string, NativeMethod> {
  const domains = api as unknown as Record<string, Record<string, NativeMethod>>
  const methods = new Map<string, NativeMethod>()
  for (const method of HARNESS_API_ALLOWLIST) {
    if (method === 'commands.execute' || method === 'commands.list') {
      // Commands live behind the official Typert registry (the ApiProxy has
      // no `commands` domain). Dispatch them through the gateway when it is
      // available; without it the method stays denied (fail-closed).
      if (typertGateway === undefined) continue
      const [namespace, commandMethod] = method.split('.') as [string, string]
      const implementation: NativeMethod = async (request, signal) => {
        if (commandMethod === 'execute') {
          const args = commandExecuteSchema.parse(request.payload)
          const value = await typertGateway.invoke({
            namespace,
            method: 'execute',
            args,
            ...(signal === undefined ? {} : { signal }),
          })
          return { rpcId: request.rpcId, result: { ok: true, value } }
        }
        const args = commandListSchema.parse(request.payload)
        const value = await typertGateway.invoke({
          namespace,
          method: 'list',
          args,
          ...(signal === undefined ? {} : { signal }),
        })
        return { rpcId: request.rpcId, result: { ok: true, value } }
      }
      methods.set(method, implementation)
      continue
    }
    const [wireDomain, action] = method.split('.') as [string, string]
    const domain = domainProperty(wireDomain)
    const implementation = domains[domain]?.[action]
    if (typeof implementation !== 'function') continue
    methods.set(method, implementation.bind(domains[domain]))
  }
  return methods
}

function domainProperty(wireDomain: string): string {
  if (wireDomain === 'session') return 'sessions'
  if (wireDomain === 'subagent') return 'subagents'
  if (wireDomain === 'skill') return 'skills'
  if (wireDomain === 'agentPreset') return 'agentPresets'
  if (wireDomain === 'goal') return 'goals'
  return wireDomain
}

function deniedMethod(method: string): RpcError {
  return new RpcError('METHOD_NOT_ALLOWED', `Harness API method ${JSON.stringify(method)} is not available in remote mode.`)
}

function diagnosticReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[\r\n]+/g, ' ').slice(0, 160) || 'Unknown Harness API failure.'
}

/** Session id of a mux frame, or undefined for frames without one (e.g. stream/error). */
function frameSessionId(frame: RpcRequest<MuxFrame | HostFrame>): string | undefined {
  const payload = frame.payload as { sessionId?: unknown }
  return typeof payload.sessionId === 'string' && payload.sessionId.length > 0 ? payload.sessionId : undefined
}

function callSessionHistory(
  callWithTimeout: (payload: unknown) => Promise<RpcResponse<unknown>>,
  payload: unknown,
  rpcId: string,
): Promise<RpcResponse<unknown>> {
  const fallbackPageSizes = sessionHistoryFallbackPageSizes(payloadMaxMessages(payload))
  return callHistoryWithRetry(callWithTimeout, payload, rpcId, fallbackPageSizes)
}

async function callHistoryWithRetry(
  callWithTimeout: (payload: unknown) => Promise<RpcResponse<unknown>>,
  payload: unknown,
  rpcId: string,
  pageSizes: readonly number[],
): Promise<RpcResponse<unknown>> {
  for (const maxMessages of pageSizes) {
    const requestPayload = historyRequestPayload(payload, maxMessages)
    const response = await callWithTimeout(requestPayload)
    const request = createRpcResponse(rpcId, response.result)
    if (encodeMessage(request).byteLength <= MAX_SECURE_MESSAGE_BYTES) return response
    if (maxMessages === pageSizes[pageSizes.length - 1]) {
      throw new RpcError(
        'RESPONSE_TOO_LARGE',
        'The Host response is too large for the remote channel. Request a smaller page.',
        { maxBytes: MAX_SECURE_MESSAGE_BYTES },
        true,
      )
    }
  }
  throw new RpcError('INTERNAL_ERROR', 'Failed to load session history with a fallback page size.')
}

function sessionHistoryFallbackPageSizes(requestedMaxMessages: number | undefined): readonly number[] {
  const requested = normalizeSessionHistoryPageSize(requestedMaxMessages)
  const sizes: number[] = []
  if (requested === undefined) {
    sizes.push(...SESSION_HISTORY_PAGE_SIZES)
    return sizes
  }
  sizes.push(requested)
  for (const value of SESSION_HISTORY_PAGE_SIZES) {
    if (value < requested && !sizes.includes(value)) sizes.push(value)
  }
  return sizes
}

function normalizeSessionHistoryPageSize(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isInteger(value)) return undefined
  if (value <= 0) return undefined
  return Math.max(1, value)
}

function payloadMaxMessages(payload: unknown): number | undefined {
  if (payload === null || typeof payload !== 'object') return undefined
  const value = (payload as { maxMessages?: unknown }).maxMessages
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

function historyRequestPayload(payload: unknown, maxMessages: number): unknown {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return { maxMessages }
  return { ...payload, maxMessages }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RpcError('TIMEOUT', message, undefined, true))
    }, ms)
    timer.unref?.()
    promise.then(
      value => { clearTimeout(timer); resolve(value) },
      error => { clearTimeout(timer); reject(error) },
    )
  })
}

function shortId(value: string): string { return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}` }

function decodeCanonicalBase64(value: string): Uint8Array {
  const bytes = Buffer.from(value, 'base64')
  if (bytes.toString('base64') !== value) {
    throw new RpcError('INVALID_MESSAGE', 'The Harness API transfer chunk is not canonical base64.')
  }
  return bytes
}

function concatChunks(chunks: readonly Uint8Array[], totalBytes: number): Uint8Array {
  const result = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}
