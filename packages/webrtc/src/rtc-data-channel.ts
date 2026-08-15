import type { TransportStats } from '@dsh-remote/protocol'
import {
  RTC_DATA_CHANNEL_LABEL,
  RTC_DATA_CHANNEL_OPTIONS,
  type RtcDataChannel,
  type RtcIceCandidateInit,
  type RtcIceServer,
  type RtcPeerConnection,
  type RtcPeerConnectionFactory,
  type RtcStats,
  type RtcStatsEntry,
} from './rtc-adapter.js'

export type RtcRole = 'initiator' | 'responder'
export type RtcSelectedTransport = 'p2p' | 'turn'

export type RtcSignal =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: RtcIceCandidateInit }

export interface RtcDataChannelTransportOptions {
  role: RtcRole
  iceServers?: RtcIceServer[]
  factory: RtcPeerConnectionFactory
  onSignal: (signal: RtcSignal) => void
  negotiateTimeoutMs?: number
  channelLabel?: string
  highWatermarkBytes?: number
  lowWatermarkBytes?: number
  /** Human-readable diagnostic label; never logged with sensitive content. */
  label?: string
}

const DEFAULT_NEGOTIATE_TIMEOUT_MS = 8_000
const DEFAULT_HIGH_WATERMARK_BYTES = 1_048_576
const DEFAULT_LOW_WATERMARK_BYTES = 256 * 1024
const DRAIN_POLL_INTERVAL_MS = 20

/**
 * Complete WebRTC DataChannel transport state machine (webrtc plan §6.1).
 *
 * Owns one `RTCPeerConnection` + ordered `dsh` DataChannel for a single
 * connection establishment. It emits offer/answer/trickle-ICE via `onSignal`
 * and consumes the peer's signaling through `handleSignal`; the owner wires
 * those two ends to the Server control channel. `connect()` resolves only
 * once the DataChannel reaches `open`.
 */
export class RtcDataChannelTransport {
  private readonly pc: RtcPeerConnection
  private readonly role: RtcRole
  private readonly onSignal: (signal: RtcSignal) => void
  private readonly negotiateTimeoutMs: number
  private readonly channelLabel: string
  private readonly highWatermarkBytes: number
  private readonly lowWatermarkBytes: number

  private channel?: RtcDataChannel
  private readonly remoteCandidates: RtcIceCandidateInit[] = []
  private remoteDescriptionSet = false
  private opened = false
  private closed = false

  private readonly messageHandlers = new Set<(data: Uint8Array) => void>()
  private readonly closeHandlers = new Set<() => void>()
  private readonly errorHandlers = new Set<(error: Error) => void>()

  private connectPromise?: Promise<void>
  private openResolve?: () => void
  private openReject?: (error: Error) => void
  private negotiateTimer?: ReturnType<typeof setTimeout>
  private removeAbort?: () => void

  private bytesSent = 0
  private bytesReceived = 0
  private selected?: RtcSelectedTransport

  constructor(options: RtcDataChannelTransportOptions) {
    this.role = options.role
    this.onSignal = options.onSignal
    this.negotiateTimeoutMs = options.negotiateTimeoutMs ?? DEFAULT_NEGOTIATE_TIMEOUT_MS
    this.channelLabel = options.channelLabel ?? RTC_DATA_CHANNEL_LABEL
    this.highWatermarkBytes = Math.max(options.highWatermarkBytes ?? DEFAULT_HIGH_WATERMARK_BYTES, 64 * 1024)
    this.lowWatermarkBytes = Math.max(Math.min(options.lowWatermarkBytes ?? DEFAULT_LOW_WATERMARK_BYTES, this.highWatermarkBytes), 16 * 1024)

    this.pc = options.factory.create({ iceServers: options.iceServers })
    this.pc.ondatachannel = event => this.adoptChannel(event.channel)
    this.pc.onicecandidate = event => {
      if (event.candidate !== null && !this.closed) {
        this.onSignal({ type: 'ice', candidate: event.candidate })
      }
    }
    this.pc.onconnectionstatechange = () => this.checkConnectionState()
    this.pc.oniceconnectionstatechange = () => this.checkConnectionState()
  }

  /** Begin negotiation; resolves when the DataChannel is open. */
  connect(signal?: AbortSignal): Promise<void> {
    if (this.opened) return Promise.resolve()
    if (this.connectPromise !== undefined) return this.connectPromise
    this.armAbort(signal)
    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.openResolve = resolve
      this.openReject = reject
      this.negotiateTimer = setTimeout(() => {
        this.failOpen(new RtcConnectError('RTC_CONNECT_TIMEOUT', `WebRTC negotiation timed out after ${this.negotiateTimeoutMs}ms.`))
      }, this.negotiateTimeoutMs)
      if (this.role === 'initiator') {
        void this.startInitiator().catch(error => this.failOpen(asError(error)))
      }
    })
    return this.connectPromise
  }

  handleSignal(signal: RtcSignal): void {
    if (this.closed) return
    if (signal.type === 'offer') void this.handleOffer(signal.sdp)
    else if (signal.type === 'answer') void this.handleAnswer(signal.sdp)
    else void this.handleIce(signal.candidate)
  }

  async send(data: Uint8Array): Promise<void> {
    const channel = this.requireOpenChannel()
    await this.drain(channel)
    if (channel.readyState !== 'open') throw new Error('WebRTC data channel is not open.')
    channel.send(toArrayBuffer(data))
    this.bytesSent += data.byteLength
  }

  onMessage(handler: (data: Uint8Array) => void): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onClose(handler: () => void): () => void {
    this.closeHandlers.add(handler)
    return () => this.closeHandlers.delete(handler)
  }

  onError(handler: (error: Error) => void): () => void {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  selectedTransport(): RtcSelectedTransport | undefined {
    return this.selected
  }

  getStats(): TransportStats {
    const connected = this.channel?.readyState === 'open'
    return {
      mode: !connected ? 'Disconnected' : this.selected === 'turn' ? 'TURN' : 'P2P',
      connected,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
    }
  }

  /** Idempotent close: releases PeerConnection, DataChannel, timers and listeners. */
  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.clearNegotiation()
    const channel = this.channel
    this.channel = undefined
    if (channel !== undefined) {
      channel.onopen = null
      channel.onmessage = null
      channel.onclose = null
      channel.onerror = null
      channel.onbufferedamountlow = null
      try { channel.close() } catch { /* already closed */ }
    }
    this.pc.onicecandidate = null
    this.pc.ondatachannel = null
    this.pc.onconnectionstatechange = null
    this.pc.oniceconnectionstatechange = null
    try { this.pc.close() } catch { /* already closed */ }
    if (this.opened) {
      this.opened = false
      for (const handler of this.closeHandlers) handler()
    }
  }

  private armAbort(signal: AbortSignal | undefined): void {
    this.removeAbort?.()
    this.removeAbort = undefined
    if (signal === undefined) return
    const onAbort = () => {
      this.failOpen(new RtcConnectError('RTC_ABORTED', 'WebRTC negotiation was aborted.'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    this.removeAbort = () => signal.removeEventListener('abort', onAbort)
    if (signal.aborted) onAbort()
  }

  private async startInitiator(): Promise<void> {
    const channel = this.pc.createDataChannel(this.channelLabel, RTC_DATA_CHANNEL_OPTIONS)
    this.adoptChannel(channel)
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    this.onSignal({ type: 'offer', sdp: requireSdp(offer) })
  }

  private async handleOffer(sdp: string): Promise<void> {
    if (this.role !== 'responder' || this.remoteDescriptionSet) {
      this.failOpen(new RtcConnectError('RTC_INVALID_STATE', 'Received an unexpected WebRTC offer.'))
      return
    }
    try {
      await this.pc.setRemoteDescription({ type: 'offer', sdp })
      this.remoteDescriptionSet = true
      await this.flushRemoteCandidates()
      const answer = await this.pc.createAnswer()
      await this.pc.setLocalDescription(answer)
      this.onSignal({ type: 'answer', sdp: requireSdp(answer) })
    } catch (error) {
      this.failOpen(asError(error))
    }
  }

  private async handleAnswer(sdp: string): Promise<void> {
    if (this.role !== 'initiator' || this.remoteDescriptionSet) {
      this.failOpen(new RtcConnectError('RTC_INVALID_STATE', 'Received an unexpected WebRTC answer.'))
      return
    }
    try {
      await this.pc.setRemoteDescription({ type: 'answer', sdp })
      this.remoteDescriptionSet = true
      await this.flushRemoteCandidates()
    } catch (error) {
      this.failOpen(asError(error))
    }
  }

  private async handleIce(candidate: RtcIceCandidateInit): Promise<void> {
    if (!this.remoteDescriptionSet) {
      this.remoteCandidates.push(candidate)
      return
    }
    try {
      await this.pc.addIceCandidate(candidate)
    } catch {
      // Ignore malformed/duplicate candidates; the connection either proceeds
      // or the negotiation timeout surfaces the failure.
    }
  }

  private async flushRemoteCandidates(): Promise<void> {
    const buffered = this.remoteCandidates.splice(0, this.remoteCandidates.length)
    for (const candidate of buffered) {
      try { await this.pc.addIceCandidate(candidate) } catch { /* ignored */ }
    }
  }

  private adoptChannel(channel: RtcDataChannel): void {
    if (this.channel !== undefined && this.channel !== channel) {
      try { channel.close() } catch { /* ignored */ }
      return
    }
    this.channel = channel
    channel.binaryType = 'arraybuffer'
    channel.onopen = () => {
      if (this.closed || this.opened) return
      this.opened = true
      const resolve = this.openResolve
      this.clearNegotiation()
      void this.resolveSelectedTransport().then(() => resolve?.())
    }
    channel.onmessage = event => {
      if (this.closed || !this.opened) return
      const data = event.data
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
      this.bytesReceived += bytes.byteLength
      for (const handler of this.messageHandlers) handler(bytes)
    }
    channel.onclose = () => {
      if (this.closed) return
      this.failOpen(new RtcConnectError('RTC_CLOSED', 'WebRTC data channel closed.'))
      if (this.opened) {
        this.opened = false
        for (const handler of this.closeHandlers) handler()
      }
    }
    channel.onerror = () => {
      const error = new RtcConnectError('RTC_FAILED', 'WebRTC data channel reported an error.')
      this.failOpen(error)
      for (const handler of this.errorHandlers) handler(error)
    }
  }

  private async resolveSelectedTransport(): Promise<void> {
    try {
      this.selected = detectSelectedTransport(await this.pc.getStats())
    } catch {
      this.selected = undefined
    }
  }

  private checkConnectionState(): void {
    if (this.closed || this.opened) return
    if (this.pc.connectionState === 'failed' || this.pc.iceConnectionState === 'failed'
      || this.pc.connectionState === 'closed' || this.pc.iceConnectionState === 'closed') {
      this.failOpen(new RtcConnectError('RTC_FAILED', 'WebRTC peer connection failed before the data channel opened.'))
    }
  }

  private failOpen(error: Error): void {
    if (this.closed || this.opened || this.openReject === undefined) return
    const reject = this.openReject
    this.clearNegotiation()
    this.openResolve = undefined
    this.openReject = undefined
    reject(error)
    void this.close()
  }

  private clearNegotiation(): void {
    if (this.negotiateTimer !== undefined) clearTimeout(this.negotiateTimer)
    this.negotiateTimer = undefined
    this.removeAbort?.()
    this.removeAbort = undefined
    this.openResolve = undefined
    this.openReject = undefined
  }

  private requireOpenChannel(): RtcDataChannel {
    const channel = this.channel
    if (channel === undefined || channel.readyState !== 'open' || this.closed || !this.opened) {
      throw new Error('WebRTC data channel is not open.')
    }
    return channel
  }

  private async drain(channel: RtcDataChannel): Promise<void> {
    if (channel.bufferedAmount < this.highWatermarkBytes) return
    while (channel.readyState === 'open' && channel.bufferedAmount >= this.lowWatermarkBytes) {
      await sleep(DRAIN_POLL_INTERVAL_MS)
    }
  }
}

export class RtcConnectError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

export function detectSelectedTransport(stats: RtcStats): RtcSelectedTransport | undefined {
  // candidate-pair `localCandidateId`/`remoteCandidateId` reference the `id`
  // member of the local/remote-candidate stats (not the report map key).
  const candidateTypes = new Map<string, string>()
  const selectedPairs: RtcStatsEntry[] = []
  for (const [, entry] of stats) {
    if (entry.type === 'local-candidate' || entry.type === 'remote-candidate') {
      if (typeof entry.candidateType === 'string' && entry.id !== undefined) {
        candidateTypes.set(String(entry.id), entry.candidateType)
      }
    } else if (entry.type === 'candidate-pair' || entry.type === 'transport') {
      if (entry.selected === true || entry.nominated === true) selectedPairs.push(entry)
    }
  }
  for (const pair of selectedPairs) {
    const local = candidateTypes.get(String(pair.localCandidateId))
    const remote = candidateTypes.get(String(pair.remoteCandidateId))
    if (local === 'relay' || remote === 'relay') return 'turn'
    if (local !== undefined || remote !== undefined) return 'p2p'
  }
  return undefined
}

function requireSdp(description: { type: 'offer' | 'answer'; sdp?: string }): string {
  if (typeof description.sdp !== 'string' || description.sdp.length === 0) {
    throw new RtcConnectError('RTC_FAILED', 'The RTC backend produced an empty session description.')
  }
  return description.sdp
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) return data.buffer as ArrayBuffer
  return data.slice().buffer as ArrayBuffer
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new RtcConnectError('RTC_FAILED', 'WebRTC negotiation failed.')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
