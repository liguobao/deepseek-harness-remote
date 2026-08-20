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
import { RtcChunkCodec, RTC_CHUNK_MAX_MESSAGE_BYTES } from './rtc-chunking.js'

export type RtcRole = 'initiator' | 'responder'
export type RtcSelectedTransport = 'p2p' | 'turn'
export type RtcPathMode = 'LAN' | 'P2P' | 'TURN'

export interface RtcSelectedPath {
  transport: RtcSelectedTransport
  mode: RtcPathMode
}

export interface RtcPathDetails {
  transport?: RtcSelectedTransport
  mode?: RtcPathMode
  localCandidateType?: string
  remoteCandidateType?: string
  localAddress?: string
  remoteAddress?: string
  protocol?: string
  relayProtocol?: string
  currentRoundTripTimeMs?: number
  availableOutgoingBitrate?: number
  bytesSent?: number
  bytesReceived?: number
}

export interface RtcConnectionDetails extends RtcPathDetails {
  connectionState: string
  iceConnectionState: string
  dataChannelState?: RtcDataChannel['readyState']
}

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
  /** Send watchdog: if a frame stays queued longer than this, the transport is failed. */
  sendTimeoutMs?: number
  /** Human-readable diagnostic label; never logged with sensitive content. */
  label?: string
}

const DEFAULT_NEGOTIATE_TIMEOUT_MS = 8_000
const DEFAULT_SEND_TIMEOUT_MS = 5_000

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
  private readonly sendTimeoutMs: number

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
  private watchdogTimer?: ReturnType<typeof setTimeout>

  private readonly outgoing = new RtcChunkCodec()
  private readonly incoming = new RtcChunkCodec()
  private bytesSent = 0
  private bytesReceived = 0
  private selected?: RtcSelectedTransport
  private selectedMode?: RtcPathMode
  private lastBufferedAmount = 0

  constructor(options: RtcDataChannelTransportOptions) {
    this.role = options.role
    this.onSignal = options.onSignal
    this.negotiateTimeoutMs = options.negotiateTimeoutMs ?? DEFAULT_NEGOTIATE_TIMEOUT_MS
    this.channelLabel = options.channelLabel ?? RTC_DATA_CHANNEL_LABEL
    this.sendTimeoutMs = options.sendTimeoutMs ?? DEFAULT_SEND_TIMEOUT_MS

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
    if (channel.readyState !== 'open') throw new Error('WebRTC data channel is not open.')
    for (const frame of this.outgoing.encode(data)) {
      try {
        channel.send(toArrayBuffer(frame))
      } catch (error) {
        console.error('[rtc-send-error] bytes=' + frame.byteLength, error instanceof Error ? error.message : error)
        throw error
      }
    }
    this.bytesSent += data.byteLength
    this.armWatchdog(channel)
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

  selectedPathMode(): RtcPathMode | undefined {
    return this.selectedMode
  }

  async connectionDetails(): Promise<RtcConnectionDetails> {
    let statsDetails: RtcPathDetails = {}
    try {
      statsDetails = inspectSelectedPath(await this.pc.getStats())
    } catch {
      // Peer/DataChannel state remains useful if the RTC backend withholds stats.
    }
    return {
      ...statsDetails,
      mode: statsDetails.mode ?? this.selectedMode,
      connectionState: this.pc.connectionState,
      iceConnectionState: this.pc.iceConnectionState,
      dataChannelState: this.channel?.readyState,
    }
  }

  getStats(): TransportStats {
    const connected = this.channel?.readyState === 'open'
    return {
      mode: !connected ? 'Disconnected' : this.selectedMode ?? (this.selected === 'turn' ? 'TURN' : 'P2P'),
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
    this.clearWatchdog()
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
      const frame = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
      this.bytesReceived += frame.byteLength
      try {
        const message = this.incoming.decode(frame)
        if (message === undefined) return
        for (const handler of this.messageHandlers) handler(message)
      } catch {
        void this.close()
      }
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
      const selected = inspectSelectedPath(await this.pc.getStats())
      this.selected = selected?.transport
      this.selectedMode = selected?.mode
    } catch {
      this.selected = undefined
      this.selectedMode = undefined
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

  private armWatchdog(channel: RtcDataChannel): void {
    if (this.watchdogTimer !== undefined || this.closed) return
    const baseline = channel.bufferedAmount
    if (baseline <= 0) return
    this.lastBufferedAmount = baseline
    this.watchdogTimer = setTimeout(() => {
      this.watchdogTimer = undefined
      if (this.closed || this.channel !== channel || channel.readyState !== 'open') return
      const current = channel.bufferedAmount
      if (current > 0 && current >= this.lastBufferedAmount) {
        // The outbound queue has not drained since the last check: the peer is
        // not ACKing. Treat the transport as unhealthy so the owner can fall
        // back instead of leaving the RPC sender queue blocked forever.
        const error = new RtcConnectError('RTC_SEND_TIMEOUT', 'DataChannel send stalled.')
        for (const handler of this.errorHandlers) handler(error)
        void this.close()
        return
      }
      this.lastBufferedAmount = current
      if (current > 0) this.armWatchdog(channel)
    }, this.sendTimeoutMs)
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer !== undefined) clearTimeout(this.watchdogTimer)
    this.watchdogTimer = undefined
    this.lastBufferedAmount = 0
  }
}

export class RtcConnectError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

export function detectSelectedTransport(stats: RtcStats): RtcSelectedTransport | undefined {
  return detectSelectedPath(stats)?.transport
}

export function detectSelectedPath(stats: RtcStats): RtcSelectedPath | undefined {
  const details = inspectSelectedPath(stats)
  return details.transport === undefined || details.mode === undefined
    ? undefined
    : { transport: details.transport, mode: details.mode }
}

export function inspectSelectedPath(stats: RtcStats): RtcPathDetails {
  // candidate-pair `localCandidateId`/`remoteCandidateId` reference the `id`
  // member of the local/remote-candidate stats (not the report map key).
  const candidates = new Map<string, RtcStatsEntry>()
  const candidatePairs = new Map<string, RtcStatsEntry>()
  const selectedPairs: RtcStatsEntry[] = []
  const selectedPairIds = new Set<string>()
  for (const [reportId, entry] of stats) {
    if (entry.type === 'local-candidate' || entry.type === 'remote-candidate') {
      if (typeof entry.candidateType === 'string' && entry.id !== undefined) {
        candidates.set(String(entry.id), entry)
      }
    } else if (entry.type === 'candidate-pair') {
      candidatePairs.set(String(entry.id ?? reportId), entry)
      if (entry.selected === true || entry.nominated === true) selectedPairs.push(entry)
    } else if (entry.type === 'transport' && typeof entry.selectedCandidatePairId === 'string') {
      selectedPairIds.add(entry.selectedCandidatePairId)
    }
  }
  const pairs = [
    ...[...selectedPairIds].map(id => candidatePairs.get(id)).filter((pair): pair is RtcStatsEntry => pair !== undefined),
    ...selectedPairs,
  ]
  for (const pair of pairs) {
    const local = candidates.get(String(pair.localCandidateId))
    const remote = candidates.get(String(pair.remoteCandidateId))
    const localType = local?.candidateType
    const remoteType = remote?.candidateType
    let selected: RtcSelectedPath | undefined
    if (localType === 'relay' || remoteType === 'relay') selected = { transport: 'turn', mode: 'TURN' }
    if (local === undefined && remote === undefined) continue
    selected ??= {
      transport: 'p2p',
      mode: localType === 'host' && remoteType === 'host' ? 'LAN' : 'P2P',
    }
    const currentRoundTripTime = numberStat(pair, 'currentRoundTripTime')
    return {
      ...selected,
      localCandidateType: stringStat(local, 'candidateType'),
      remoteCandidateType: stringStat(remote, 'candidateType'),
      localAddress: candidateAddress(local),
      remoteAddress: candidateAddress(remote),
      protocol: stringStat(local, 'protocol') ?? stringStat(remote, 'protocol'),
      relayProtocol: stringStat(local, 'relayProtocol') ?? stringStat(remote, 'relayProtocol'),
      currentRoundTripTimeMs: currentRoundTripTime === undefined
        ? undefined
        : Math.round(currentRoundTripTime * 1000),
      availableOutgoingBitrate: numberStat(pair, 'availableOutgoingBitrate'),
      bytesSent: numberStat(pair, 'bytesSent'),
      bytesReceived: numberStat(pair, 'bytesReceived'),
    }
  }
  return {}
}

function candidateAddress(candidate: RtcStatsEntry | undefined): string | undefined {
  const address = stringStat(candidate, 'address') ?? stringStat(candidate, 'ip')
  if (address === undefined) return undefined
  const port = numberStat(candidate, 'port')
  return port === undefined ? address : `${address}:${port}`
}

function stringStat(entry: RtcStatsEntry | undefined, key: string): string | undefined {
  const value = entry?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function numberStat(entry: RtcStatsEntry | undefined, key: string): number | undefined {
  const value = entry?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
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
