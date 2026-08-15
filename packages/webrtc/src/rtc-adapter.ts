/**
 * Environment-agnostic RTC peer-connection surface.
 *
 * The transport state machine only talks to these narrow interfaces so the
 * browser native `RTCPeerConnection` and a future Node host backend can both
 * provide the underlying peer connection without the business code depending
 * on a specific RTC implementation (webrtc-implementation-plan.md §6.1/§6.2).
 */

export interface RtcIceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

export interface RtcIceCandidateInit {
  candidate?: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
  usernameFragment?: string | null
}

export interface RtcSessionDescriptionInit {
  type: 'offer' | 'answer'
  sdp?: string
}

export interface RtcDataChannelInit {
  ordered?: boolean
}

export interface RtcDataChannel {
  readonly label: string
  readonly ordered: boolean
  readyState: 'connecting' | 'open' | 'closing' | 'closed'
  bufferedAmount: number
  binaryType: string
  onopen: (() => void) | null
  onmessage: ((event: { data: ArrayBuffer | string }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
  onbufferedamountlow: (() => void) | null
  send(data: ArrayBuffer | string): void
  close(): void
}

export interface RtcPeerConnection {
  connectionState: string
  iceConnectionState: string
  iceGatheringState: string
  signalingState: string
  onconnectionstatechange: (() => void) | null
  oniceconnectionstatechange: (() => void) | null
  onicegatheringstatechange: (() => void) | null
  onicecandidate: ((event: { candidate: RtcIceCandidateInit | null }) => void) | null
  ondatachannel: ((event: { channel: RtcDataChannel }) => void) | null
  createDataChannel(label: string, options?: RtcDataChannelInit): RtcDataChannel
  createOffer(): Promise<RtcSessionDescriptionInit>
  createAnswer(): Promise<RtcSessionDescriptionInit>
  setLocalDescription(description?: RtcSessionDescriptionInit): Promise<void>
  setRemoteDescription(description: RtcSessionDescriptionInit): Promise<void>
  addIceCandidate(candidate?: RtcIceCandidateInit): Promise<void>
  getStats(): Promise<RtcStats>
  close(): void
}

/** A single WebRTC stats report entry (id -> typed record). */
export interface RtcStatsEntry {
  type?: string
  [key: string]: unknown
}

export type RtcStats = Iterable<readonly [string, RtcStatsEntry]>

export interface RtcPeerConnectionFactory {
  create(configuration: { iceServers?: RtcIceServer[] }): RtcPeerConnection
}

export const RTC_DATA_CHANNEL_LABEL = 'dsh'
export const RTC_DATA_CHANNEL_OPTIONS = { ordered: true } as const

/**
 * Default browser-backed factory. This module is the only place in the webrtc
 * package that references the DOM `RTCPeerConnection` global, so Node hosts
 * inject their own factory and never import browser natives.
 */
export function browserRtcFactory(): RtcPeerConnectionFactory {
  return {
    create(configuration) {
      // `any` keeps the DOM handler `this`/event typing out of the adapter.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = new RTCPeerConnection(configuration) as any
      return {
        get connectionState(): string { return raw.connectionState as string },
        get iceConnectionState(): string { return raw.iceConnectionState as string },
        get iceGatheringState(): string { return raw.iceGatheringState as string },
        get signalingState(): string { return raw.signalingState as string },
        set onconnectionstatechange(value) { raw.onconnectionstatechange = value },
        get onconnectionstatechange() { return raw.onconnectionstatechange as (() => void) | null },
        set oniceconnectionstatechange(value) { raw.oniceconnectionstatechange = value },
        get oniceconnectionstatechange() { return raw.oniceconnectionstatechange as (() => void) | null },
        set onicegatheringstatechange(value) { raw.onicegatheringstatechange = value },
        get onicegatheringstatechange() { return raw.onicegatheringstatechange as (() => void) | null },
        set onicecandidate(value) { raw.onicecandidate = value },
        get onicecandidate() { return raw.onicecandidate as ((event: { candidate: RtcIceCandidateInit | null }) => void) | null },
        set ondatachannel(value) { raw.ondatachannel = value },
        get ondatachannel() { return raw.ondatachannel as ((event: { channel: RtcDataChannel }) => void) | null },
        createDataChannel(label, options) { return adaptDataChannel(raw.createDataChannel(label, options)) },
        createOffer() { return raw.createOffer() },
        createAnswer() { return raw.createAnswer() },
        setLocalDescription(description) { return raw.setLocalDescription(description) },
        setRemoteDescription(description) { return raw.setRemoteDescription(description) },
        addIceCandidate(candidate) { return raw.addIceCandidate(candidate) },
        async getStats() { return await raw.getStats() },
        close() { raw.close() },
      }
    },
  }
}

function adaptDataChannel(raw: RTCDataChannel): RtcDataChannel {
  return {
    get label(): string { return raw.label },
    get ordered(): boolean { return raw.ordered },
    get readyState() { return raw.readyState },
    get bufferedAmount(): number { return raw.bufferedAmount },
    get binaryType(): string { return raw.binaryType },
    set onopen(value) { raw.onopen = value },
    get onopen() { return raw.onopen as (() => void) | null },
    set onmessage(value) { raw.onmessage = value },
    get onmessage() { return raw.onmessage as ((event: { data: ArrayBuffer | string }) => void) | null },
    set onclose(value) { raw.onclose = value },
    get onclose() { return raw.onclose as (() => void) | null },
    set onerror(value) { raw.onerror = value },
    get onerror() { return raw.onerror as (() => void) | null },
    set onbufferedamountlow(value) { raw.onbufferedamountlow = value },
    get onbufferedamountlow() { return raw.onbufferedamountlow as (() => void) | null },
    send(data) { raw.send(data as never) },
    close() { raw.close() },
  }
}
