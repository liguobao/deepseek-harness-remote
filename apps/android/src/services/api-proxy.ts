import type { RemoteClientCore } from '@dsh-remote/client-core'
import type { EventPayload, HarnessApiCallParams, HarnessApiFrameData, HarnessApiRespondParams, HarnessApiStreamOpenParams, HarnessApiStreamClosedData } from '@dsh-remote/protocol'
import type {
  AskUserQuestionAnswer,
  HistoryEntry,
  HostDescriptor,
  MuxFrame,
  MuxStreamFrame,
  RemoteSession,
  SessionHistoryPage,
  WorkspaceView,
} from '../types'

/** Native ApiProxy RpcResult envelope (mirrors @deepseek-ai/dsh-host-apiproxy/api). */
export type NativeRpcResult<T> = {
  ok: true
  value: T
} | {
  ok: false
  error: { code: string; message: string; details?: unknown }
}

/** Native ApiProxy RpcResponse envelope (mirrors @deepseek-ai/dsh-host-apiproxy/api). */
export interface NativeRpcResponse<T = unknown> {
  rpcId: string
  result: NativeRpcResult<T>
}

export interface ClientResponseMessage {
  type: 'client-response'
  rpcId: string
  result: NativeRpcResult<unknown>
}

interface NativeRpcReceipt {
  accepted: boolean
  reason?: 'not-pending' | 'bad-response'
}

/**
 * Android-side Remote ApiProxy tunnel client.
 *
 * Drives the Host's ApiProxy bridge through the four-tunnel contract
 * (`harness.api.call/respond/stream.open/stream.close`) and keeps the native
 * rpcId correlation semantics. Only allowlisted Harness methods are used;
 * the Host remains the authority for what a remote UI may call.
 */
export class RemoteApiProxy {
  private readonly streams = new Map<string, (frame: MuxStreamFrame) => void>()

  constructor(private readonly core: RemoteClientCore) {}

  /** Unary ApiProxy call; resolves with the native result value, rejects with the RPC error. */
  async call<TResult = unknown>(method: string, payload: unknown, signal?: AbortSignal): Promise<TResult> {
    return this.callWithRpcId(method, payload, createNativeRpcId(), signal)
  }

  private async callWithRpcId<TResult>(method: string, payload: unknown, rpcId: string, signal?: AbortSignal): Promise<TResult> {
    const response = await this.core.rpc<NativeRpcResponse<TResult>>('harness.api.call', {
      method,
      rpcId,
      payload,
    } satisfies HarnessApiCallParams, signal)
    if (String(response.rpcId) !== rpcId) {
      throw new ApiProxyError('INVALID_MESSAGE', 'The Host returned an ApiProxy response for a different request.')
    }
    if (response.result.ok) return response.result.value
    throw new ApiProxyError(
      response.result.error.code,
      response.result.error.message,
      response.result.error.details,
    )
  }

  /** Answer an approval/question ServerRequest frame emitted on this connection. */
  async respond(frameRpcId: string, result: NativeRpcResult<unknown>): Promise<void> {
    const message: ClientResponseMessage = {
      type: 'client-response',
      rpcId: frameRpcId,
      result,
    }
    const receipt = await this.core.rpc<NativeRpcReceipt>('harness.api.respond', {
      message,
    } satisfies HarnessApiRespondParams)
    if (receipt.accepted === true) return
    if (receipt.reason === 'not-pending') {
      throw new ApiProxyError('PERMISSION_NOT_PENDING', 'That Host request was already answered or expired.')
    }
    throw new ApiProxyError('INVALID_MESSAGE', 'The Host rejected the response payload.')
  }

  async respondApproval(frameRpcId: string, sessionId: string, approvalId: string, outcome: 'allowed-once' | 'rejected'): Promise<void> {
    await this.respond(frameRpcId, { ok: true, value: { sessionId, approvalId, outcome } })
  }

  async respondQuestion(frameRpcId: string, sessionId: string, answer: AskUserQuestionAnswer): Promise<void> {
    await this.respond(frameRpcId, { ok: true, value: { sessionId, answer } })
  }

  /**
   * Open the aggregated mux stream and route `harness.api.frame` events for
   * this stream to the handler. Returns a close function; the stream is
   * re-opened after reconnect, so callers must re-subscribe on connect.
   */
  async openMuxStream(handler: (frame: MuxStreamFrame) => void): Promise<() => Promise<void>> {
    const streamId = createNativeRpcId()
    this.streams.set(streamId, handler)
    const unsubscribe = this.core.onEvent(event => this.routeEvent(event, streamId))
    try {
      await this.core.rpc('harness.api.stream.open', {
        streamId,
        stream: 'mux',
        rpcId: createNativeRpcId(),
        payload: {},
      } satisfies HarnessApiStreamOpenParams)
    } catch (error) {
      this.streams.delete(streamId)
      unsubscribe()
      throw error
    }
    return async () => {
      this.streams.delete(streamId)
      unsubscribe()
      await this.core.rpc('harness.api.stream.close', { streamId }).catch(() => undefined)
    }
  }

  async sessionList(): Promise<RemoteSession[]> {
    const result = await this.call<{ items: RemoteSession[] }>('session.list', {})
    return Array.isArray(result.items) ? result.items : []
  }

  async sessionHistory(sessionId: string, beforeSeq?: number, maxMessages = 60): Promise<SessionHistoryPage> {
    const result = await this.call<{ events: HistoryEntry[]; hasMore: boolean }>('session.history', {
      sessionId,
      ...(beforeSeq === undefined ? {} : { beforeSeq }),
      maxMessages,
    })
    return { events: Array.isArray(result.events) ? result.events : [], hasMore: result.hasMore === true }
  }

  async sessionPrompt(sessionId: string, text: string, rpcId = createNativeRpcId()): Promise<void> {
    await this.callWithRpcId('session.prompt', {
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text }],
    }, rpcId)
  }

  async sessionCancel(sessionId: string): Promise<void> {
    await this.call('session.cancel', { sessionId })
  }

  async hostDescribe(): Promise<HostDescriptor> {
    const result = await this.call<HostDescriptor>('host.describe', {})
    if (typeof result.version !== 'string' || typeof result.cwd !== 'string') {
      throw new ApiProxyError('INVALID_MESSAGE', 'The Host returned an invalid host descriptor.')
    }
    return result
  }

  async workspaceList(): Promise<WorkspaceView[]> {
    const result = await this.call<{ items?: WorkspaceView[] }>('workspace.list', {})
    return Array.isArray(result.items) ? result.items : []
  }

  private routeEvent(event: EventPayload, streamId: string): void {
    if (event.event === 'harness.api.frame') {
      const data = event.data as Partial<HarnessApiFrameData>
      if (data.streamId !== streamId || typeof data.frame?.rpcId !== 'string' || !isRecord(data.frame.payload)) {
        return
      }
      const handler = this.streams.get(streamId)
      if (handler !== undefined) handler({ rpcId: data.frame.rpcId, payload: data.frame.payload as unknown as MuxFrame })
      return
    }
    if (event.event === 'harness.api.stream.closed') {
      const data = event.data as Partial<HarnessApiStreamClosedData>
      if (data.streamId === streamId) {
        const handler = this.streams.get(streamId)
        this.streams.delete(streamId)
        handler?.({ rpcId: '', payload: { type: 'stream/closed', reason: data.reason } })
      }
    }
  }
}

export class ApiProxyError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) { super(message) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function createNativeRpcId(): string {
  const g = globalThis.crypto
  if (g?.randomUUID !== undefined) return g.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
