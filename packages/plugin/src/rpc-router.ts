import {
  createRpcError,
  createRpcResponse,
  type RemoteMessage,
  type RpcMethod,
  type RpcRequestPayload,
} from '@dsh-remote/protocol'
import { z } from 'zod'
import { AgentAdapterError, type AgentAdapter } from './adapters/agent-adapter.js'
import { SessionAdapterError, type SessionAdapter } from './adapters/session-adapter.js'
import { FullResyncRequiredError, type EventSequencer } from './event-sequencer.js'
import type { PendingApprovals } from './pending-approvals.js'
import type { HarnessApiBridge } from './harness-api-bridge.js'

const emptySchema = z.object({}).strict()
const wireRequestSchema = z.object({ method: z.string().min(1), params: z.unknown() }).strict()
const paramsSchemas = {
  'system.info': emptySchema,
  'workspace.get': z.object({ sessionId: z.string().min(1).optional() }).strict(),
  'sessions.list': z.object({ cursor: z.string().min(1).nullable().optional(), limit: z.number().int().min(1).max(100).optional() }).strict(),
  'sessions.get': z.object({ sessionId: z.string().min(1) }).strict(),
  'sessions.create': z.object({
    clientRequestId: z.string().min(1).max(128),
    cwd: z.string().min(1).optional(),
    title: z.string().max(200).nullable().optional(),
  }).strict(),
  'session.send': z.object({
    sessionId: z.string().min(1),
    clientMessageId: z.string().min(1).max(128),
    text: z.string().min(1).max(65_536),
  }).strict(),
  'session.stop': z.object({ sessionId: z.string().min(1) }).strict(),
  'permissions.respond': z.object({
    sessionId: z.string().min(1),
    requestId: z.string().min(1),
    decision: z.enum(['allow_once', 'deny']),
  }).strict(),
  'connection.ping': z.object({ sentAt: z.number().int().nonnegative() }).strict(),
  'sync.from': z.object({ afterSeq: z.number().int().nonnegative(), limit: z.number().int().min(1).max(1_000).optional() }).strict(),
  'harness.api.call': z.unknown(),
  'harness.api.respond': z.unknown(),
  'harness.api.stream.open': z.unknown(),
  'harness.api.stream.close': z.unknown(),
} satisfies Record<RpcMethod, z.ZodTypeAny>

export const HOST_CAPABILITIES = [
  'system.info',
  'workspace.get',
  'sessions.list',
  'sessions.get',
  'sessions.create',
  'session.send',
  'session.stop',
  'sync.from',
  'session.streaming',
  'permission.allow-once',
  'permission.deny',
  'harness.api.v1',
] as const

type SystemInfo = Record<string, unknown>

export class RpcRouter {
  private active = 0
  private readonly responseCache = new Map<string, RemoteMessage>()

  constructor(
    private readonly sessions: SessionAdapter,
    private readonly agents: AgentAdapter,
    private readonly pending: PendingApprovals,
    private readonly events: EventSequencer,
    private readonly systemInfo: () => SystemInfo,
    private readonly harnessApi?: HarnessApiBridge,
    private readonly maxPending = 128,
  ) {}

  closePeerStreams(): Promise<void> { return this.harnessApi?.closeAll() ?? Promise.resolve() }

  async handle(message: RemoteMessage): Promise<RemoteMessage> {
    if (message.type !== 'rpc.request') {
      return createRpcError(message.id, 'INVALID_MESSAGE', 'Only RPC requests are accepted on the Host business channel.')
    }
    const parsedPayload = wireRequestSchema.safeParse(message.payload)
    if (!parsedPayload.success) return createRpcError(message.id, 'INVALID_MESSAGE', 'The RPC request payload is invalid.')
    if (!(parsedPayload.data.method in paramsSchemas)) {
      return createRpcError(message.id, 'METHOD_NOT_FOUND', 'The requested method does not exist.')
    }
    const request = message as RemoteMessage<RpcRequestPayload>
    const cached = this.responseCache.get(request.id)
    if (cached !== undefined) return cached
    if (this.active >= this.maxPending) {
      return createRpcError(request.id, 'RATE_LIMITED', 'Too many Host requests are already pending.', undefined, true)
    }
    this.active += 1
    try {
      const result = await this.invoke(request.payload.method, request.payload.params)
      const response = createRpcResponse(request.id, result)
      if (isSideEffecting(request.payload.method)) this.cache(request.id, response)
      return response
    } catch (error: unknown) {
      const response = errorResponse(request.id, error)
      if (isSideEffecting(request.payload.method)) this.cache(request.id, response)
      return response
    } finally {
      this.active -= 1
    }
  }

  private async invoke(method: RpcMethod, input: unknown): Promise<unknown> {
    const params = paramsSchemas[method].parse(input)
    switch (method) {
      case 'system.info': return this.systemInfo()
      case 'workspace.get': return this.sessions.workspace((params as { sessionId?: string }).sessionId)
      case 'sessions.list': {
        const value = params as { cursor?: string | null; limit?: number }
        return this.sessions.list(value.cursor ?? null, value.limit ?? 50)
      }
      case 'sessions.get': return this.sessions.get((params as { sessionId: string }).sessionId)
      case 'sessions.create': {
        const session = await this.agents.create(params as { clientRequestId: string; cwd?: string; title?: string | null })
        return this.sessions.summary(session)
      }
      case 'session.send': return this.agents.send(params as { sessionId: string; clientMessageId: string; text: string })
      case 'session.stop': return this.agents.stop((params as { sessionId: string }).sessionId)
      case 'permissions.respond': {
        const value = params as { sessionId: string; requestId: string; decision: 'allow_once' | 'deny' }
        if (!this.pending.respond(value.sessionId, value.requestId, value.decision)) {
          throw new RpcError('PERMISSION_NOT_PENDING', 'The permission request is no longer pending.')
        }
        return { accepted: true, requestId: value.requestId }
      }
      case 'connection.ping': {
        const value = params as { sentAt: number }
        return { sentAt: value.sentAt, hostAt: Date.now() }
      }
      case 'sync.from': {
        const value = params as { afterSeq: number; limit?: number }
        return this.events.replay(value.afterSeq, value.limit ?? 1_000)
      }
      case 'harness.api.call': return this.requireHarnessApi().call(params)
      case 'harness.api.respond': return this.requireHarnessApi().respond(params)
      case 'harness.api.stream.open': return this.requireHarnessApi().openStream(params)
      case 'harness.api.stream.close': return this.requireHarnessApi().closeStream(params)
      default: throw new RpcError('METHOD_NOT_FOUND', 'The requested method does not exist.')
    }
  }

  private requireHarnessApi(): HarnessApiBridge {
    if (this.harnessApi === undefined) throw new RpcError('METHOD_NOT_ALLOWED', 'The native Harness API bridge is unavailable on this Host.')
    return this.harnessApi
  }

  private cache(id: string, response: RemoteMessage): void {
    this.responseCache.set(id, response)
    while (this.responseCache.size > 2_048) this.responseCache.delete(this.responseCache.keys().next().value!)
  }
}

export class RpcError extends Error {
  constructor(readonly code: string, message: string, readonly details?: unknown, readonly retryable = false) { super(message) }
}

function errorResponse(requestId: string, error: unknown): RemoteMessage {
  if (error instanceof RpcError || error instanceof AgentAdapterError || error instanceof SessionAdapterError) {
    return createRpcError(requestId, error.code, error.message, error instanceof RpcError ? error.details : undefined, error instanceof RpcError && error.retryable)
  }
  if (error instanceof FullResyncRequiredError) {
    return createRpcError(requestId, error.code, error.message, { currentSeq: error.currentSeq })
  }
  if (error instanceof z.ZodError) return createRpcError(requestId, 'INVALID_MESSAGE', 'The RPC parameters are invalid.')
  return createRpcError(requestId, 'INTERNAL_ERROR', 'The Host could not complete the request.')
}

function isSideEffecting(method: RpcMethod): boolean {
  return method === 'sessions.create'
    || method === 'session.send'
    || method === 'session.stop'
    || method === 'permissions.respond'
    || method === 'harness.api.call'
    || method === 'harness.api.respond'
    || method === 'harness.api.stream.open'
    || method === 'harness.api.stream.close'
}
