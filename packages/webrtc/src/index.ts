import type { TransportStats } from '@dsh-remote/protocol'

export interface RemoteTransport {
  connect(): Promise<void>
  send(data: Uint8Array): Promise<void>
  onMessage(cb: (data: Uint8Array) => void): () => void
  close(): Promise<void>
  getStats(): TransportStats
}

type MessageHandler = (data: Uint8Array) => void

export abstract class BaseTransport implements RemoteTransport {
  protected handlers = new Set<MessageHandler>()

  onMessage(cb: MessageHandler): () => void {
    this.handlers.add(cb)
    return () => this.handlers.delete(cb)
  }

  protected emit(data: Uint8Array): void {
    for (const handler of this.handlers) handler(data)
  }

  abstract connect(): Promise<void>
  abstract send(data: Uint8Array): Promise<void>
  abstract close(): Promise<void>
  abstract getStats(): TransportStats
}

export class RelayTransport extends BaseTransport {
  private socket?: WebSocket
  private bytesSent = 0
  private bytesReceived = 0

  constructor(
    private readonly url: string,
    private readonly hello: unknown,
    private readonly targetDeviceId?: string,
  ) {
    super()
  }

  async connect(): Promise<void> {
    if (this.socket !== undefined) return
    this.socket = new WebSocket(this.url)
    this.socket.binaryType = 'arraybuffer'
    await new Promise<void>((resolve, reject) => {
      const socket = this.socket!
      socket.onmessage = event => {
        const data = decodeSocketMessage(event.data)
        this.bytesReceived += data.byteLength
        this.emit(data)
      }
      socket.onopen = () => {
        socket.send(JSON.stringify(this.hello))
        resolve()
      }
      socket.onerror = () => reject(new Error(`RelayTransport failed to connect to ${this.url}`))
    })
  }

  async send(data: Uint8Array): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('relay transport is not connected')
    this.bytesSent += data.byteLength
    const payload = new TextDecoder().decode(data)
    this.socket.send(this.targetDeviceId === undefined
      ? payload
      : JSON.stringify({ type: 'relay', targetDeviceId: this.targetDeviceId, payload }))
  }

  async close(): Promise<void> {
    this.socket?.close()
    this.socket = undefined
  }

  getStats(): TransportStats {
    return {
      mode: this.socket?.readyState === WebSocket.OPEN ? 'Relay' : 'Disconnected',
      connected: this.socket?.readyState === WebSocket.OPEN,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
    }
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

function decodeSocketMessage(data: string | ArrayBuffer | Blob): Uint8Array {
  if (typeof data !== 'string') {
    if (data instanceof ArrayBuffer) return new Uint8Array(data)
    throw new Error('Blob WebSocket frames are not supported by RelayTransport')
  }
  try {
    const envelope = JSON.parse(data) as { type?: unknown; payload?: unknown }
    if (envelope.type === 'relay' && typeof envelope.payload === 'string') {
      return new TextEncoder().encode(envelope.payload)
    }
  } catch {
    // A protocol message is JSON too, but not a relay envelope.
  }
  return new TextEncoder().encode(data)
}
