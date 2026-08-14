import {
  createRpcRequest,
  decodeMessage,
  encodeMessage,
  type EventPayload,
  type RemoteEventName,
  type RemoteMessage,
  type RpcErrorPayload,
  type RpcMethod,
  type RpcResponsePayload,
} from '@dsh-remote/protocol'
import type { RemoteTransport } from '@dsh-remote/webrtc'

interface PendingCall {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class RemoteClientCore {
  private readonly pending = new Map<string, PendingCall>()
  private readonly eventHandlers = new Set<(event: EventPayload) => void>()
  private unsubscribeTransport?: () => void

  constructor(private readonly transport: RemoteTransport, private readonly timeoutMs = 30_000) {}

  async connect(): Promise<void> {
    if (this.unsubscribeTransport !== undefined) return
    this.unsubscribeTransport = this.transport.onMessage(data => this.handleMessage(data))
    try {
      await this.transport.connect()
    } catch (error) {
      this.unsubscribeTransport()
      this.unsubscribeTransport = undefined
      throw error
    }
  }

  async rpc<TResult = unknown, TParams = unknown>(method: RpcMethod, params: TParams): Promise<TResult> {
    const request = createRpcRequest(method, params)
    const result = new Promise<TResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.id)
        reject(new Error(`RPC ${method} timed out`))
      }, this.timeoutMs)
      this.pending.set(request.id, { resolve: resolve as (value: unknown) => void, reject, timer })
    })
    try {
      await this.transport.send(encodeMessage(request))
    } catch (error) {
      const pending = this.pending.get(request.id)
      if (pending !== undefined) clearTimeout(pending.timer)
      this.pending.delete(request.id)
      throw error
    }
    return result
  }

  onEvent(handler: (event: EventPayload) => void): () => void {
    this.eventHandlers.add(handler)
    return () => this.eventHandlers.delete(handler)
  }

  getStats() {
    return this.transport.getStats()
  }

  async close(): Promise<void> {
    this.unsubscribeTransport?.()
    this.unsubscribeTransport = undefined
    await this.transport.close()
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('remote client closed'))
    }
    this.pending.clear()
  }

  private handleMessage(data: Uint8Array): void {
    const message = decodeMessage(data)
    if (message.type === 'rpc.response') this.handleResponse(message as RemoteMessage<RpcResponsePayload>)
    if (message.type === 'rpc.error') this.handleError(message as RemoteMessage<RpcErrorPayload>)
    if (message.type === 'event') {
      const event = message.payload as EventPayload
      for (const handler of this.eventHandlers) handler(event)
    }
  }

  private handleResponse(message: RemoteMessage<RpcResponsePayload>): void {
    const pending = this.pending.get(message.payload.requestId)
    if (pending === undefined) return
    this.pending.delete(message.payload.requestId)
    clearTimeout(pending.timer)
    pending.resolve(message.payload.result)
  }

  private handleError(message: RemoteMessage<RpcErrorPayload>): void {
    const pending = this.pending.get(message.payload.requestId)
    if (pending === undefined) return
    this.pending.delete(message.payload.requestId)
    clearTimeout(pending.timer)
    pending.reject(Object.assign(new Error(message.payload.message), { code: message.payload.code }))
  }
}

export type { EventPayload, RemoteEventName, RemoteTransport }
