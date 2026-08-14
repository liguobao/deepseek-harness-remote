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
  removeAbort?: () => void
}

export class RemoteClientCore {
  private readonly pending = new Map<string, PendingCall>()
  private readonly eventHandlers = new Set<(event: EventPayload) => void>()
  private unsubscribeTransport?: () => void
  private unsubscribeClose?: () => void
  private readonly closeHandlers = new Set<() => void>()

  constructor(private readonly transport: RemoteTransport, private readonly timeoutMs = 30_000) {}

  async connect(): Promise<void> {
    if (this.unsubscribeTransport !== undefined) return
    this.unsubscribeTransport = this.transport.onMessage(data => this.handleMessage(data))
    this.unsubscribeClose = this.transport.onClose?.(() => this.handleTransportClose())
    try {
      await this.transport.connect()
    } catch (error) {
      this.unsubscribeTransport()
      this.unsubscribeTransport = undefined
      this.unsubscribeClose?.()
      this.unsubscribeClose = undefined
      throw error
    }
  }

  async rpc<TResult = unknown, TParams = unknown>(method: RpcMethod, params: TParams, signal?: AbortSignal): Promise<TResult> {
    signal?.throwIfAborted()
    const request = createRpcRequest(method, params)
    const result = new Promise<TResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        const pending = this.pending.get(request.id)
        pending?.removeAbort?.()
        this.pending.delete(request.id)
        reject(new Error(`RPC ${method} timed out`))
      }, this.timeoutMs)
      const pending: PendingCall = { resolve: resolve as (value: unknown) => void, reject, timer }
      if (signal !== undefined) {
        const onAbort = () => {
          if (this.pending.get(request.id) !== pending) return
          clearTimeout(timer)
          this.pending.delete(request.id)
          reject(signal.reason instanceof Error ? signal.reason : new Error('RPC was cancelled'))
        }
        signal.addEventListener('abort', onAbort, { once: true })
        pending.removeAbort = () => signal.removeEventListener('abort', onAbort)
      }
      this.pending.set(request.id, pending)
    })
    try {
      await this.transport.send(encodeMessage(request))
    } catch (error) {
      const pending = this.pending.get(request.id)
      if (pending !== undefined) {
        clearTimeout(pending.timer)
        pending.removeAbort?.()
      }
      this.pending.delete(request.id)
      throw error
    }
    return result
  }

  onEvent(handler: (event: EventPayload) => void): () => void {
    this.eventHandlers.add(handler)
    return () => this.eventHandlers.delete(handler)
  }

  onClose(handler: () => void): () => void {
    this.closeHandlers.add(handler)
    return () => this.closeHandlers.delete(handler)
  }

  getStats() {
    return this.transport.getStats()
  }

  async close(): Promise<void> {
    this.unsubscribeTransport?.()
    this.unsubscribeTransport = undefined
    this.unsubscribeClose?.()
    this.unsubscribeClose = undefined
    await this.transport.close()
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.removeAbort?.()
      pending.reject(new Error('remote client closed'))
    }
    this.pending.clear()
  }

  private handleTransportClose(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.removeAbort?.()
      pending.reject(new Error('remote transport closed'))
    }
    this.pending.clear()
    for (const handler of this.closeHandlers) handler()
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
    pending.removeAbort?.()
    pending.resolve(message.payload.result)
  }

  private handleError(message: RemoteMessage<RpcErrorPayload>): void {
    const pending = this.pending.get(message.payload.requestId)
    if (pending === undefined) return
    this.pending.delete(message.payload.requestId)
    clearTimeout(pending.timer)
    pending.removeAbort?.()
    pending.reject(Object.assign(new Error(message.payload.message), { code: message.payload.code }))
  }
}

export type { EventPayload, RemoteEventName, RemoteTransport }
