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
} from '@dsh-remote/protocol'
import { z } from 'zod'
import type { SafeLogger } from './logging.js'
import { RpcError } from './rpc-router.js'

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

/**
 * Harness API methods that are safe to expose to an authenticated remote UI.
 * Settings, credentials, native open/picker calls, directory mutation, file
 * contents, downloads, and attachment upload intentionally remain outside
 * this bridge. Directory listing exposes metadata only for workspace picking.
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

/**
 * Native Harness ApiProxy call timeout. The Remote Web frontend gives each
 * `harness.api.call` RPC a 60s window; this bridge must fail faster so the
 * RPC error (not a silent Web-side timeout) reaches the peer and the pending
 * call is released. 30s gives slow native methods room while still beating the
 * Web-side 60s timer by a wide margin.
 */
const NATIVE_CALL_TIMEOUT_MS = 30_000

export class HarnessApiBridge {
  private readonly methods: ReadonlyMap<string, NativeMethod>
  private readonly streams = new Map<string, ActiveStream>()
  private readonly respondable = new Map<string, string>()
  private readonly mux: ApiProxy['events']['mux']
  private readonly host: ApiProxy['events']['host']
  private readonly answer: ApiProxy['respond']

  constructor(
    private readonly api: ApiProxy,
    private readonly publish: PublishFrame,
    private readonly maxStreams = 3,
    private readonly logger?: SafeLogger,
  ) {
    this.methods = createMethodMap(api)
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
      const response = await withTimeout(
        method(request, signal),
        NATIVE_CALL_TIMEOUT_MS,
        `Harness API call ${params.method} timed out after ${NATIVE_CALL_TIMEOUT_MS}ms`,
      )
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
    for (const stream of streams) stream.controller.abort(reason)
    // A native ApiProxy stream may not observe AbortSignal until its next
    // frame. Waiting for every pump here would block a replacement peer from
    // installing its message handler indefinitely. The detached pumps own
    // their errors and terminal event publication, so abort and release them
    // without holding up the authenticated connection handoff.
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

function createMethodMap(api: ApiProxy): ReadonlyMap<string, NativeMethod> {
  const domains = api as unknown as Record<string, Record<string, NativeMethod>>
  const methods = new Map<string, NativeMethod>()
  for (const method of HARNESS_API_ALLOWLIST) {
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
