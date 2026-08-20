import {
  PROTOCOL_VERSION,
  createControlFrame,
  parseControlFrame,
  type ConnectAcceptedPayload,
  type HelloAckPayload,
  type RelayPayload,
  type SecureHandshakePayload,
  type SelectedTransport,
  type TransportSelectedPayload,
  type TransportStats,
} from '@dsh-remote/protocol'
import { browserRtcFactory, type RtcIceServer, type RtcPeerConnectionFactory } from './rtc-adapter.js'
import {
  RtcConnectError,
  RtcDataChannelTransport,
  type RtcConnectionDetails,
  type RtcSelectedTransport,
  type RtcSignal,
} from './rtc-data-channel.js'
import { BaseTransport } from './transport.js'
import { fromBase64Url, socketText, toBase64Url } from './util.js'

export interface AdaptiveTransportOptions {
  role: 'client'
  deviceId: string
  accessToken: string
  targetDeviceId: string
  capabilities?: string[]
  preferredTransports?: Array<'lan' | 'p2p' | 'turn' | 'relay'>
  forceRelay?: boolean
  handshakeTimeoutMs?: number
  negotiateTimeoutMs?: number
  rtcFactory?: RtcPeerConnectionFactory
  fetchIceServers?: (connectionId: string) => Promise<RtcIceServer[]>
  onWebRtcFallback?: (error: Error) => void
}

export interface AdaptiveConnectionDetails {
  connectionId?: string
  connectedAt?: number
  controlChannelUrl: string
  controlChannelState: 'connecting' | 'open' | 'closing' | 'closed'
  preferredTransports: Array<'lan' | 'p2p' | 'turn' | 'relay'>
  webRtc?: RtcConnectionDetails
}

const DEFAULT_CAPABILITIES = ['transport.p2p', 'transport.turn', 'transport.relay', 'harness.api.v1']
const DEFAULT_PREFERRED_TRANSPORTS = ['lan', 'p2p', 'turn', 'relay'] as const

/**
 * Client-side adaptive transport: `p2p -> turn -> relay` (webrtc plan §4/§6.4).
 *
 * Owns the Server control WebSocket and negotiates the data plane after
 * `connect.accepted`. WebRTC (initiator) is attempted first unless
 * `forceRelay` is set or no RTC backend is available; every failure path
 * closes the RTC state and falls back to the WebSocket Relay data plane.
 * Noise IK always runs over `secure.handshake` control frames; only the Noise
 * ciphertext moves to the DataChannel once WebRTC is established.
 */
export class AdaptiveTransport extends BaseTransport {
  private readonly handshakeHandlers = new Set<(step: number, data: Uint8Array) => void>()
  private socket?: WebSocket
  private connectionId?: string
  private relayCounter = 0
  private bytesSent = 0
  private bytesReceived = 0
  private dataMode: 'relay' | 'webrtc' = 'relay'
  private selected?: SelectedTransport
  private rtc?: RtcDataChannelTransport
  private readyResolve?: () => void
  private readyReject?: (error: Error) => void
  private handshakeTimer?: ReturnType<typeof setTimeout>
  private webrtcEnabled = true
  private serverNegotiateTimeoutMs?: number
  private connectedAt?: number

  constructor(
    private readonly url: string,
    private readonly options: AdaptiveTransportOptions,
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
        () => this.failConnection(new Error('Adaptive control handshake timed out')),
        this.options.handshakeTimeoutMs ?? 15_000,
      )
      const socket = this.socket!
      socket.onmessage = event => { void this.handleSocketMessage(event.data) }
      socket.onopen = () => {
        this.sendControl('hello', {
          role: this.options.role,
          deviceId: this.options.deviceId,
          accessToken: this.options.accessToken,
          protocols: [PROTOCOL_VERSION],
          capabilities: this.options.capabilities ?? DEFAULT_CAPABILITIES,
        })
      }
      socket.onerror = () => this.failConnection(new Error(`AdaptiveTransport failed to connect to ${this.url}`))
      socket.onclose = event => {
        const pending = this.readyReject !== undefined
        if (pending) this.failConnection(adaptiveControlCloseError(event))
        this.socket = undefined
        this.connectionId = undefined
        this.emitClose()
      }
    })
  }

  async send(data: Uint8Array): Promise<void> {
    if (this.connectionId === undefined) throw new Error('adaptive transport has not been authorized')
    if (this.dataMode === 'webrtc') {
      const rtc = this.rtc
      if (rtc === undefined) throw new Error('webrtc data channel is not available')
      this.bytesSent += data.byteLength
      await rtc.send(data)
      return
    }
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('adaptive transport is not connected')
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
    if (this.connectionId === undefined) throw new Error('adaptive transport has not been authorized')
    return {
      connectionId: this.connectionId,
      localDeviceId: this.options.deviceId,
      remoteDeviceId: this.options.targetDeviceId,
    }
  }

  async connectionDetails(): Promise<AdaptiveConnectionDetails> {
    return {
      ...(this.connectionId === undefined ? {} : { connectionId: this.connectionId }),
      ...(this.connectedAt === undefined ? {} : { connectedAt: this.connectedAt }),
      controlChannelUrl: this.url,
      controlChannelState: socketState(this.socket?.readyState),
      preferredTransports: this.options.forceRelay === true
        ? ['relay']
        : [...(this.options.preferredTransports ?? DEFAULT_PREFERRED_TRANSPORTS)],
      ...(this.rtc === undefined ? {} : { webRtc: await this.rtc.connectionDetails() }),
    }
  }

  async sendHandshake(step: number, data: Uint8Array): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN || this.connectionId === undefined) {
      throw new Error('adaptive transport has not been authorized')
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
    await this.rtc?.close()
    this.rtc = undefined
    this.socket?.close()
    this.socket = undefined
    this.connectionId = undefined
  }

  getStats(): TransportStats {
    const webrtcConnected = this.dataMode === 'webrtc' && this.rtc?.getStats().connected === true
    const relayConnected = this.dataMode === 'relay'
      && this.socket?.readyState === WebSocket.OPEN
      && this.connectionId !== undefined
    const connected = webrtcConnected || relayConnected
    let mode: TransportStats['mode'] = 'Disconnected'
    if (this.selected === 'relay') mode = relayConnected ? 'Relay' : 'Disconnected'
    else if (this.selected === 'turn' || this.selected === 'p2p') {
      mode = webrtcConnected ? this.rtc!.getStats().mode : 'Disconnected'
    }
    return { mode, connected, bytesSent: this.bytesSent, bytesReceived: this.bytesReceived }
  }

  private async handleSocketMessage(raw: string | ArrayBuffer | Blob): Promise<void> {
    try {
      const text = await socketText(raw)
      const frame = parseControlFrame(JSON.parse(text))
      if (frame.type === 'hello.ack') {
        const payload = frame.payload as Partial<HelloAckPayload>
        if (payload.protocol !== PROTOCOL_VERSION) throw new Error('Server selected an unsupported protocol version')
        if (payload.webrtcEnabled === false) this.webrtcEnabled = false
        if (typeof payload.webrtcFallbackTimeoutMs === 'number'
          && Number.isSafeInteger(payload.webrtcFallbackTimeoutMs)
          && payload.webrtcFallbackTimeoutMs > 0) {
          this.serverNegotiateTimeoutMs = payload.webrtcFallbackTimeoutMs
        }
        this.sendControl('connect.request', {
          hostDeviceId: this.options.targetDeviceId,
          preferredTransports: this.options.forceRelay === true
            ? ['relay']
            : this.options.preferredTransports ?? [...DEFAULT_PREFERRED_TRANSPORTS],
        })
        return
      }
      if (frame.type === 'connect.accepted') {
        const payload = frame.payload as Partial<ConnectAcceptedPayload>
        if (typeof payload.connectionId !== 'string' || payload.connectionId.length === 0) {
          throw new Error('connect.accepted did not include a connectionId')
        }
        this.connectionId = payload.connectionId
        void this.negotiate()
        return
      }
      if (frame.type === 'connect.rejected' || frame.type === 'error') {
        const payload = frame.payload as { message?: unknown; code?: unknown }
        const message = typeof payload.message === 'string' ? payload.message : 'Server rejected the connection'
        throw Object.assign(new Error(message), { code: payload.code })
      }
      if (frame.type === 'relay') {
        if (this.dataMode !== 'relay') return
        this.handleRelay(frame.payload as Partial<RelayPayload>)
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
      if (frame.type === 'signal.answer') {
        const payload = frame.payload as { connectionId?: unknown; targetDeviceId?: unknown; sdp?: unknown }
        if (payload.connectionId === this.connectionId && typeof payload.sdp === 'string') {
          this.rtc?.handleSignal({ type: 'answer', sdp: payload.sdp })
        }
        return
      }
      if (frame.type === 'signal.ice') {
        const payload = frame.payload as { connectionId?: unknown; candidate?: unknown }
        if (payload.connectionId === this.connectionId && isObject(payload.candidate)) {
          this.rtc?.handleSignal({ type: 'ice', candidate: payload.candidate })
        }
        return
      }
      if (frame.type === 'signal.offer' || frame.type === 'transport.selected') return
      if (frame.type === 'ping') this.sendControl('pong', frame.payload)
    } catch (error) {
      this.failConnection(error instanceof Error ? error : new Error('Invalid adaptive control frame'))
    }
  }

  private handleRelay(payload: Partial<RelayPayload>): void {
    if (payload.connectionId !== this.connectionId
      || payload.targetDeviceId !== this.options.deviceId
      || !Number.isSafeInteger(payload.counter)
      || typeof payload.ciphertext !== 'string') {
      throw new Error('Received a relay frame for an unknown connection')
    }
    const data = fromBase64Url(payload.ciphertext)
    this.bytesReceived += data.byteLength
    this.emit(data)
  }

  private async negotiate(): Promise<void> {
    if (this.connectionId === undefined) return
    const preferred = this.options.preferredTransports ?? [...DEFAULT_PREFERRED_TRANSPORTS]
    const wantWebRtc = !this.options.forceRelay && this.webrtcEnabled
      && (preferred.includes('lan') || preferred.includes('p2p') || preferred.includes('turn'))
    let selected: SelectedTransport = 'relay'
    if (wantWebRtc) {
      try {
        const rtcSelected = await this.tryWebRtc()
        this.dataMode = 'webrtc'
        selected = rtcSelected
      } catch (error) {
        const reason = error instanceof Error ? error : new Error('WebRTC negotiation failed.')
        try { this.options.onWebRtcFallback?.(reason) } catch { /* diagnostics must not block fallback */ }
        await this.rtc?.close()
        this.rtc = undefined
        this.dataMode = 'relay'
        selected = 'relay'
      }
    } else {
      this.dataMode = 'relay'
      selected = 'relay'
    }
    this.selected = selected
    this.sendControl('transport.selected', {
      connectionId: this.connectionId,
      targetDeviceId: this.options.targetDeviceId,
      transport: selected,
    } satisfies TransportSelectedPayload)
    this.finishConnection()
  }

  private async tryWebRtc(): Promise<RtcSelectedTransport> {
    const connectionId = this.connectionId
    if (connectionId === undefined) throw new RtcConnectError('RTC_UNAVAILABLE', 'No connection id for WebRTC negotiation.')
    const factory = this.options.rtcFactory
      ?? (typeof RTCPeerConnection === 'undefined' ? undefined : browserRtcFactory())
    if (factory === undefined) {
      throw new RtcConnectError('RTC_UNAVAILABLE', 'No RTC backend is available in this environment.')
    }
    let iceServers: RtcIceServer[] = []
    try {
      iceServers = await (this.options.fetchIceServers?.(connectionId) ?? [])
    } catch {
      // TURN/STUN unavailable: still attempt direct P2P with host candidates.
      iceServers = []
    }
    const rtc = new RtcDataChannelTransport({
      role: 'initiator',
      factory,
      iceServers,
      onSignal: signal => this.sendRtcSignal(signal),
      negotiateTimeoutMs: this.serverNegotiateTimeoutMs ?? this.options.negotiateTimeoutMs,
      label: `client->${this.options.targetDeviceId}`,
    })
    this.rtc = rtc
    rtc.onMessage(data => {
      this.bytesReceived += data.byteLength
      this.emit(data)
    })
    rtc.onClose(() => this.emitClose())
    try {
      await rtc.connect()
    } catch (error) {
      await rtc.close()
      this.rtc = undefined
      throw error
    }
    return rtc.selectedTransport() ?? 'p2p'
  }

  private sendRtcSignal(signal: RtcSignal): void {
    if (this.connectionId === undefined) return
    if (signal.type === 'offer') {
      this.sendControl('signal.offer', {
        connectionId: this.connectionId,
        targetDeviceId: this.options.targetDeviceId,
        sdp: signal.sdp,
      })
    } else if (signal.type === 'answer') {
      this.sendControl('signal.answer', {
        connectionId: this.connectionId,
        targetDeviceId: this.options.targetDeviceId,
        sdp: signal.sdp,
      })
    } else {
      this.sendControl('signal.ice', {
        connectionId: this.connectionId,
        targetDeviceId: this.options.targetDeviceId,
        candidate: signal.candidate,
      })
    }
  }

  private sendControl(type: Parameters<typeof createControlFrame>[0], payload: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('adaptive control socket is not open')
    this.socket.send(JSON.stringify(createControlFrame(type, payload)))
  }

  private finishConnection(): void {
    this.clearHandshake()
    this.connectedAt ??= Date.now()
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
    void this.rtc?.close()
    this.rtc = undefined
    this.socket?.close()
    this.socket = undefined
    this.connectionId = undefined
  }

  private clearHandshake(): void {
    if (this.handshakeTimer !== undefined) clearTimeout(this.handshakeTimer)
    this.handshakeTimer = undefined
  }
}

function adaptiveControlCloseError(event: CloseEvent): Error {
  const reason = event.reason.trim().slice(0, 300)
  const detail = reason.length > 0
    ? `${reason} (WebSocket ${event.code})`
    : `WebSocket closed with code ${event.code}`
  return new Error(`Adaptive control channel closed before it was ready: ${detail}`)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function socketState(readyState: number | undefined): AdaptiveConnectionDetails['controlChannelState'] {
  if (readyState === 0) return 'connecting'
  if (readyState === 1) return 'open'
  if (readyState === 2) return 'closing'
  return 'closed'
}
