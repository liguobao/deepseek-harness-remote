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
  payload: z.unknown(),
}).strict()

const streamCloseSchema = z.object({ streamId: z.string().min(1).max(128) }).strict()

/**
 * Harness API methods that are safe to expose to an authenticated remote UI.
 * Settings, credentials, native open/picker calls, arbitrary directory reads,
 * downloads, and attachment upload intentionally remain outside this bridge.
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
}

export class HarnessApiBridge {
  private readonly methods: ReadonlyMap<string, NativeMethod>
  private readonly streams = new Map<string, ActiveStream>()
  private readonly mux: ApiProxy['events']['mux']
  private readonly host: ApiProxy['events']['host']
  private readonly answer: ApiProxy['respond']

  constructor(
    private readonly api: ApiProxy,
    private readonly publish: PublishFrame,
    private readonly maxStreams = 2,
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
    const signal = AbortSignal.timeout(60_000)
    return method({ rpcId: params.rpcId as never, payload: params.payload }, signal)
  }

  async respond(input: unknown): Promise<unknown> {
    const params = respondSchema.parse(input) as HarnessApiRespondParams
    return this.answer(params.message as ClientResponse)
  }

  openStream(input: unknown): { opened: true; streamId: string } {
    const params = streamOpenSchema.parse(input) as HarnessApiStreamOpenParams
    if (this.streams.has(params.streamId)) throw new RpcError('REQUEST_CONFLICT', 'The Harness event stream is already open.')
    if (this.streams.size >= this.maxStreams) throw new RpcError('RATE_LIMITED', 'Too many Harness event streams are open.', undefined, true)
    const controller = new AbortController()
    const request = { rpcId: params.rpcId as never, payload: params.payload }
    console.error('[stream-debug] calling native events', params.stream)
    const stream = params.stream === 'mux'
      ? this.mux(request as never, controller.signal)
      : this.host(request as never, controller.signal)
    console.error('[stream-debug] native events returned', params.stream, typeof stream, typeof (stream as AsyncIterable<unknown>)?.[Symbol.asyncIterator])
    const task = this.pump(params.streamId, stream, controller.signal)
    this.streams.set(params.streamId, { controller, task })
    return { opened: true, streamId: params.streamId }
  }

  closeStream(input: unknown): { closed: boolean; streamId: string } {
    const params = streamCloseSchema.parse(input)
    const active = this.streams.get(params.streamId)
    active?.controller.abort()
    return { closed: active !== undefined, streamId: params.streamId }
  }

  async closeAll(reason: HarnessApiStreamClosedData['reason'] = 'peer-disconnected'): Promise<void> {
    const streams = [...this.streams.values()]
    this.streams.clear()
    for (const stream of streams) stream.controller.abort(reason)
    // A native ApiProxy stream may not observe AbortSignal until its next
    // frame. Waiting for every pump here would block a replacement peer from
    // installing its message handler indefinitely. The detached pumps own
    // their errors and terminal event publication, so abort and release them
    // without holding up the authenticated connection handoff.
  }

  private async pump(streamId: string, stream: HarnessStream, signal: AbortSignal): Promise<void> {
    let reason: HarnessApiStreamClosedData['reason'] = 'completed'
    try {
      for await (const frame of stream) {
        if (signal.aborted) break
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
