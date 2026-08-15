/**
 * werift-backed Node RTC factory (webrtc-implementation-plan.md §6.2).
 *
 * werift is a pure-TypeScript WebRTC implementation with no native addons, so
 * it installs and runs on Linux x64/ARM64 without toolchains. The factory is
 * loaded lazily: `loadWeriftFactory` dynamically imports werift on first use,
 * keeping DSH startup time and memory unaffected for hosts that never receive
 * a WebRTC offer (or run with `forceRelay`).
 */

import type {
  RtcDataChannel,
  RtcIceCandidateInit,
  RtcIceServer,
  RtcPeerConnection,
  RtcPeerConnectionFactory,
  RtcStats,
} from '@dsh-remote/webrtc'

interface WeriftModule {
  RTCPeerConnection: new (config?: {
    iceServers?: Array<{ urls: string | string[]; username?: string; credential?: string }>
  }) => WeriftPeerConnection
}

interface WeriftPeerConnection {
  connectionState: string
  iceConnectionState: string
  iceGatheringState: string
  signalingState: string
  onconnectionstatechange: (() => void) | null
  oniceconnectionstatechange: (() => void) | null
  onicegatheringstatechange: (() => void) | null
  onicecandidate: ((event: { candidate?: { toJSON(): RtcIceCandidateInit } }) => void) | null
  ondatachannel: ((event: { channel: WeriftDataChannel }) => void) | null
  createDataChannel(label: string, options: { ordered: boolean }): WeriftDataChannel
  createOffer(): Promise<{ type: 'offer' | 'answer'; sdp: string }>
  createAnswer(): Promise<{ type: 'offer' | 'answer'; sdp: string }>
  setLocalDescription(description?: { type: string; sdp?: string }): Promise<unknown>
  setRemoteDescription(description: { type: string; sdp?: string }): Promise<void>
  addIceCandidate(candidate?: RtcIceCandidateInit | null): Promise<void>
  getStats(): Promise<RtcStats>
  close(): Promise<void>
}

interface WeriftDataChannel {
  readonly label: string
  readonly ordered: boolean
  readyState: string
  bufferedAmount: number
  onopen: (() => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
  onmessage: ((event: { data: string | Uint8Array }) => void) | null
  send(data: Buffer | string): void
  close(): void
}

let cachedFactory: RtcPeerConnectionFactory | undefined

/** Load (once) a werift-backed factory, or `undefined` when it cannot be loaded. */
export async function loadWeriftFactory(): Promise<RtcPeerConnectionFactory | undefined> {
  if (cachedFactory !== undefined) return cachedFactory
  try {
    const werift = (await import('werift')) as unknown as WeriftModule
    cachedFactory = buildWeriftFactory(werift)
    return cachedFactory
  } catch {
    return undefined
  }
}

/** Synchronous factory for tests and callers that already resolved werift. */
export function buildWeriftFactory(werift: WeriftModule): RtcPeerConnectionFactory {
  return {
    create(configuration) {
      const raw = new werift.RTCPeerConnection({
        iceServers: (configuration.iceServers ?? []) as RtcIceServer[],
      })

      let onIceCandidate: ((event: { candidate: RtcIceCandidateInit | null }) => void) | null = null
      let onDataChannel: ((event: { channel: RtcDataChannel }) => void) | null = null
      raw.onicecandidate = event => {
        if (onIceCandidate === null) return
        onIceCandidate({ candidate: event.candidate === undefined ? null : event.candidate.toJSON() })
      }
      raw.ondatachannel = event => {
        if (onDataChannel === null) return
        onDataChannel({ channel: adaptDataChannel(event.channel) })
      }

      const pc: RtcPeerConnection = {
        get connectionState(): string { return raw.connectionState },
        get iceConnectionState(): string { return raw.iceConnectionState },
        get iceGatheringState(): string { return raw.iceGatheringState },
        get signalingState(): string { return raw.signalingState },
        set onconnectionstatechange(value) { raw.onconnectionstatechange = value },
        get onconnectionstatechange() { return raw.onconnectionstatechange },
        set oniceconnectionstatechange(value) { raw.oniceconnectionstatechange = value },
        get oniceconnectionstatechange() { return raw.oniceconnectionstatechange },
        set onicegatheringstatechange(value) { raw.onicegatheringstatechange = value },
        get onicegatheringstatechange() { return raw.onicegatheringstatechange },
        set onicecandidate(value) { onIceCandidate = value },
        get onicecandidate() { return onIceCandidate },
        set ondatachannel(value) { onDataChannel = value },
        get ondatachannel() { return onDataChannel },
        createDataChannel(label, options) {
          return adaptDataChannel(raw.createDataChannel(label, { ordered: options?.ordered ?? true }))
        },
        createOffer() { return raw.createOffer() },
        createAnswer() { return raw.createAnswer() },
        setLocalDescription(description) { return raw.setLocalDescription(description).then(() => undefined) },
        setRemoteDescription(description) { return raw.setRemoteDescription(description) },
        addIceCandidate(candidate) { return raw.addIceCandidate(candidate) },
        getStats() { return raw.getStats() },
        close() { void raw.close().catch(() => undefined) },
      }
      return pc
    },
  }
}

function adaptDataChannel(raw: WeriftDataChannel): RtcDataChannel {
  return {
    get label(): string { return raw.label },
    get ordered(): boolean { return raw.ordered },
    get readyState() { return raw.readyState as RtcDataChannel['readyState'] },
    get bufferedAmount(): number { return raw.bufferedAmount },
    binaryType: 'arraybuffer',
    set onopen(value: (() => void) | null) { raw.onopen = value },
    get onopen(): (() => void) | null { return raw.onopen },
    set onmessage(value: ((event: { data: ArrayBuffer | string }) => void) | null) {
      raw.onmessage = value === null ? null : event => value({ data: toArrayBuffer(event.data) })
    },
    get onmessage(): ((event: { data: ArrayBuffer | string }) => void) | null { return null },
    set onclose(value: (() => void) | null) { raw.onclose = value },
    get onclose(): (() => void) | null { return raw.onclose },
    set onerror(value: (() => void) | null) { raw.onerror = value },
    get onerror(): (() => void) | null { return raw.onerror },
    onbufferedamountlow: null,
    send(data: ArrayBuffer | string) { raw.send(typeof data === 'string' ? data : Buffer.from(data)) },
    close() { raw.close() },
  }
}

function toArrayBuffer(data: string | Uint8Array): ArrayBuffer | string {
  if (typeof data === 'string') return data
  // `Buffer.prototype.slice()` (unlike `Uint8Array.prototype.slice()`) returns a
  // *view* over the pooled 8 KiB receive buffer, so slicing the underlying
  // ArrayBuffer by byte offset/length is required to extract just the message.
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
}
