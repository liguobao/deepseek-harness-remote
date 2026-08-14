import {
  PROTOCOL_VERSION,
  createControlFrame,
  parseControlFrame,
  type ConnectAcceptedPayload,
  type HelloAckPayload,
  type RelayPayload,
  type SecureHandshakePayload,
  type TransportStats,
} from '@dsh-remote/protocol'

export interface RemoteTransport {
  connect(): Promise<void>
  send(data: Uint8Array): Promise<void>
  onMessage(cb: (data: Uint8Array) => void): () => void
  onClose?(cb: () => void): () => void
  close(): Promise<void>
  getStats(): TransportStats
}

export interface SecureHandshakeTransport extends RemoteTransport {
  connectionInfo(): { connectionId: string; localDeviceId: string; remoteDeviceId: string }
  sendHandshake(step: number, data: Uint8Array): Promise<void>
  onHandshake(cb: (step: number, data: Uint8Array) => void): () => void
}

type MessageHandler = (data: Uint8Array) => void

export abstract class BaseTransport implements RemoteTransport {
  protected handlers = new Set<MessageHandler>()
  protected closeHandlers = new Set<() => void>()

  onMessage(cb: MessageHandler): () => void {
    this.handlers.add(cb)
    return () => this.handlers.delete(cb)
  }

  onClose(cb: () => void): () => void {
    this.closeHandlers.add(cb)
    return () => this.closeHandlers.delete(cb)
  }

  protected emit(data: Uint8Array): void {
    for (const handler of this.handlers) handler(data)
  }

  protected emitClose(): void {
    for (const handler of this.closeHandlers) handler()
  }

  abstract connect(): Promise<void>
  abstract send(data: Uint8Array): Promise<void>
  abstract close(): Promise<void>
  abstract getStats(): TransportStats
}

export interface RelayTransportOptions {
  role: 'client'
  deviceId: string
  accessToken: string
  targetDeviceId: string
  capabilities?: string[]
  preferredTransports?: Array<'lan' | 'p2p' | 'turn' | 'relay'>
  handshakeTimeoutMs?: number
}

export class RelayTransport extends BaseTransport {
  private readonly handshakeHandlers = new Set<(step: number, data: Uint8Array) => void>()
  private socket?: WebSocket
  private bytesSent = 0
  private bytesReceived = 0
  private connectionId?: string
  private relayCounter = 0
  private readyResolve?: () => void
  private readyReject?: (error: Error) => void
  private handshakeTimer?: ReturnType<typeof setTimeout>

  constructor(
    private readonly url: string,
    private readonly options: RelayTransportOptions,
  ) {
    super()
  }

  async connect(): Promise<void> {
    if (this.socket !== undefined) return
    this.socket = new WebSocket(this.url)
    this.socket.binaryType = 'arraybuffer'
    await new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
      this.handshakeTimer = setTimeout(
        () => this.failConnection(new Error('Relay control handshake timed out')),
        this.options.handshakeTimeoutMs ?? 10_000,
      )
      const socket = this.socket!
      socket.onmessage = event => {
        void this.handleSocketMessage(event.data)
      }
      socket.onopen = () => {
        this.sendControl('hello', {
          role: this.options.role,
          deviceId: this.options.deviceId,
          accessToken: this.options.accessToken,
          protocols: [PROTOCOL_VERSION],
          capabilities: this.options.capabilities ?? ['transport.relay'],
        })
      }
      socket.onerror = () => this.failConnection(new Error(`RelayTransport failed to connect to ${this.url}`))
      socket.onclose = () => {
        const pending = this.readyReject !== undefined
        if (pending) this.failConnection(new Error('Relay control channel closed before it was ready'))
        this.socket = undefined
        this.connectionId = undefined
        this.emitClose()
      }
    })
  }

  async send(data: Uint8Array): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('relay transport is not connected')
    if (this.connectionId === undefined) throw new Error('relay connection has not been authorized')
    this.bytesSent += data.byteLength
    this.sendControl('relay', {
      connectionId: this.connectionId,
      targetDeviceId: this.options.targetDeviceId,
      counter: this.relayCounter,
      ciphertext: toBase64Url(data),
    } satisfies RelayPayload)
    this.relayCounter += 1
  }

  connectionInfo(): { connectionId: string; localDeviceId: string; remoteDeviceId: string } {
    if (this.connectionId === undefined) throw new Error('relay connection has not been authorized')
    return {
      connectionId: this.connectionId,
      localDeviceId: this.options.deviceId,
      remoteDeviceId: this.options.targetDeviceId,
    }
  }

  async sendHandshake(step: number, data: Uint8Array): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN || this.connectionId === undefined) {
      throw new Error('relay connection has not been authorized')
    }
    this.sendControl('secure.handshake', {
      connectionId: this.connectionId,
      targetDeviceId: this.options.targetDeviceId,
      step,
      data: toBase64Url(data),
    } satisfies SecureHandshakePayload)
  }

  onHandshake(cb: (step: number, data: Uint8Array) => void): () => void {
    this.handshakeHandlers.add(cb)
    return () => this.handshakeHandlers.delete(cb)
  }

  async close(): Promise<void> {
    this.clearHandshake()
    this.socket?.close()
    this.socket = undefined
    this.connectionId = undefined
  }

  getStats(): TransportStats {
    return {
      mode: this.socket?.readyState === WebSocket.OPEN ? 'Relay' : 'Disconnected',
      connected: this.socket?.readyState === WebSocket.OPEN,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
    }
  }

  private async handleSocketMessage(raw: string | ArrayBuffer | Blob): Promise<void> {
    try {
      const text = await socketText(raw)
      const frame = parseControlFrame(JSON.parse(text))
      if (frame.type === 'hello.ack') {
        const payload = frame.payload as Partial<HelloAckPayload>
        if (payload.protocol !== PROTOCOL_VERSION) throw new Error('Server selected an unsupported protocol version')
        this.sendControl('connect.request', {
          hostDeviceId: this.options.targetDeviceId,
          preferredTransports: this.options.preferredTransports ?? ['relay'],
        })
        return
      }
      if (frame.type === 'connect.accepted') {
        const payload = frame.payload as Partial<ConnectAcceptedPayload>
        if (typeof payload.connectionId !== 'string' || payload.connectionId.length === 0) {
          throw new Error('connect.accepted did not include a connectionId')
        }
        this.connectionId = payload.connectionId
        this.finishConnection()
        return
      }
      if (frame.type === 'connect.rejected' || frame.type === 'error') {
        const payload = frame.payload as { message?: unknown; code?: unknown }
        const message = typeof payload.message === 'string' ? payload.message : 'Server rejected the relay connection'
        throw Object.assign(new Error(message), { code: payload.code })
      }
      if (frame.type === 'relay') {
        const payload = frame.payload as Partial<RelayPayload>
        if (payload.connectionId !== this.connectionId
          || payload.targetDeviceId !== this.options.deviceId
          || !Number.isSafeInteger(payload.counter)
          || typeof payload.ciphertext !== 'string') {
          throw new Error('Received a relay frame for an unknown connection')
        }
        const data = fromBase64Url(payload.ciphertext)
        this.bytesReceived += data.byteLength
        this.emit(data)
        return
      }
      if (frame.type === 'secure.handshake') {
        const payload = frame.payload as Partial<SecureHandshakePayload>
        if (payload.connectionId !== this.connectionId
          || payload.targetDeviceId !== this.options.deviceId
          || !Number.isSafeInteger(payload.step)
          || typeof payload.data !== 'string') {
          throw new Error('Received a secure handshake frame for an unknown connection')
        }
        const data = fromBase64Url(payload.data)
        for (const handler of this.handshakeHandlers) handler(payload.step!, data)
        return
      }
      if (frame.type === 'ping') this.sendControl('pong', frame.payload)
    } catch (error) {
      this.failConnection(error instanceof Error ? error : new Error('Invalid relay control frame'))
    }
  }

  private sendControl(type: Parameters<typeof createControlFrame>[0], payload: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('relay control socket is not open')
    this.socket.send(JSON.stringify(createControlFrame(type, payload)))
  }

  private finishConnection(): void {
    this.clearHandshake()
    this.readyResolve?.()
    this.readyResolve = undefined
    this.readyReject = undefined
  }

  private failConnection(error: Error): void {
    this.clearHandshake()
    const reject = this.readyReject
    this.readyResolve = undefined
    this.readyReject = undefined
    reject?.(error)
    this.socket?.close()
    this.socket = undefined
    this.connectionId = undefined
  }

  private clearHandshake(): void {
    if (this.handshakeTimer !== undefined) clearTimeout(this.handshakeTimer)
    this.handshakeTimer = undefined
  }
}

export class WebRTCTransport extends BaseTransport {
  private pc?: RTCPeerConnection
  private channel?: RTCDataChannel

  constructor(private readonly iceServers: RTCIceServer[] = []) {
    super()
  }

  async connect(): Promise<void> {
    this.pc = new RTCPeerConnection({ iceServers: this.iceServers })
    this.channel = this.pc.createDataChannel('dsh', { ordered: true })
    this.channel.binaryType = 'arraybuffer'
    this.channel.onmessage = event => {
      const data = typeof event.data === 'string'
        ? new TextEncoder().encode(event.data)
        : new Uint8Array(event.data)
      this.emit(data)
    }
    this.channel.onclose = () => this.emitClose()
  }

  async send(data: Uint8Array): Promise<void> {
    if (this.channel?.readyState !== 'open') throw new Error('webrtc data channel is not open')
    this.channel.send(new Uint8Array(data).buffer)
  }

  async close(): Promise<void> {
    this.channel?.close()
    this.pc?.close()
    this.channel = undefined
    this.pc = undefined
  }

  getStats(): TransportStats {
    const state = this.pc?.connectionState
    return {
      mode: state === 'connected' ? 'P2P' : 'Disconnected',
      connected: state === 'connected',
    }
  }
}

export class LanTransport extends RelayTransport {}

async function socketText(data: string | ArrayBuffer | Blob): Promise<string> {
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data)
  return new TextDecoder().decode(await data.arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64')
  return base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  if (typeof atob === 'function') return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
  return new Uint8Array(Buffer.from(padded, 'base64'))
}
