import { describe, expect, it } from 'vitest'
import {
  RTC_CHUNK_HEADER_BYTES,
  RTC_CHUNK_MAGIC,
  RTC_CHUNK_MAX_MESSAGE_BYTES,
  RTC_CHUNK_PAYLOAD_BYTES,
  RtcChunkCodec,
} from '../src/rtc-chunking.js'
import { RtcDataChannelTransport } from '../src/rtc-data-channel.js'
import type {
  RtcDataChannel,
  RtcIceCandidateInit,
  RtcPeerConnection,
  RtcPeerConnectionFactory,
  RtcStatsEntry,
} from '../src/rtc-adapter.js'

function bytes(size: number): Uint8Array {
  const data = new Uint8Array(size)
  for (let index = 0; index < size; index += 1) data[index] = (index * 31 + 7) & 0xff
  return data
}

function expectRoundTrip(size: number): void {
  const encoder = new RtcChunkCodec()
  const decoder = new RtcChunkCodec()
  const original = bytes(size)
  const frames = encoder.encode(original)
  const parts = frames.map(frame => decoder.decode(frame))
  const reassembled = parts.filter((part): part is Uint8Array => part !== undefined)
  expect(reassembled).toHaveLength(1)
  expect(reassembled[0]).toEqual(original)
}

function chunkFrame(index: number, total: number, payloadBytes = RTC_CHUNK_PAYLOAD_BYTES): Uint8Array {
  const frame = new Uint8Array(RTC_CHUNK_HEADER_BYTES + payloadBytes)
  frame.set(RTC_CHUNK_MAGIC)
  const view = new DataView(frame.buffer)
  view.setUint32(4, 1)
  view.setUint16(8, index)
  view.setUint16(10, total)
  return frame
}

describe('RtcChunkCodec', () => {
  it('passes a small payload through without a chunk header', () => {
    const codec = new RtcChunkCodec()
    const original = bytes(RTC_CHUNK_PAYLOAD_BYTES)
    const frames = codec.encode(original)
    expect(frames).toHaveLength(1)
    expect(frames[0]).toEqual(original)
    expect(codec.decode(original)).toEqual(original)
  })

  it('round-trips 1 / 16 / 48 / 64 / 128 KiB messages', () => {
    for (const size of [1, 16 * 1024, 48 * 1024, 64 * 1024, 128 * 1024]) {
      expectRoundTrip(size)
    }
  })

  it('frames a large message with the RTCH magic and 12-byte header', () => {
    const codec = new RtcChunkCodec()
    const original = bytes(48 * 1024)
    const frames = codec.encode(original)
    const expected = Math.ceil(original.byteLength / RTC_CHUNK_PAYLOAD_BYTES)
    expect(frames.length).toBe(expected)
    for (const [index, frame] of frames.entries()) {
      expect(Array.from(frame.subarray(0, 4))).toEqual(Array.from(RTC_CHUNK_MAGIC))
      const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
      expect(view.getUint16(8)).toBe(index)
      expect(view.getUint16(10)).toBe(expected)
      expect(frame.byteLength - RTC_CHUNK_HEADER_BYTES).toBe(
        index < expected - 1 ? RTC_CHUNK_PAYLOAD_BYTES : original.byteLength - index * RTC_CHUNK_PAYLOAD_BYTES,
      )
    }
  })

  it('reassembles a large message followed by a small message in order', () => {
    const encoder = new RtcChunkCodec()
    const decoder = new RtcChunkCodec()
    const large = bytes(64 * 1024)
    const small = bytes(64)
    const results: Uint8Array[] = []
    for (const frame of [...encoder.encode(large), ...encoder.encode(small)]) {
      const decoded = decoder.decode(frame)
      if (decoded !== undefined) results.push(decoded)
    }
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual(large)
    expect(results[1]).toEqual(small)
  })

  it('round-trips 100 consecutive large messages without id collisions', () => {
    const encoder = new RtcChunkCodec()
    const decoder = new RtcChunkCodec()
    for (let message = 0; message < 100; message += 1) {
      const original = bytes(48 * 1024 + message)
      const parts = encoder.encode(original).map(frame => decoder.decode(frame))
      const reassembled = parts.filter((part): part is Uint8Array => part !== undefined)
      expect(reassembled).toHaveLength(1)
      expect(reassembled[0]).toEqual(original)
    }
  })

  it('is bidirectional: two codecs reassemble each other across both directions', () => {
    const a = new RtcChunkCodec()
    const b = new RtcChunkCodec()
    const aToB = bytes(128 * 1024)
    const bToA = bytes(48 * 1024)
    const receivedByB = a.encode(aToB).map(frame => b.decode(frame)).filter((x): x is Uint8Array => x !== undefined)
    const receivedByA = b.encode(bToA).map(frame => a.decode(frame)).filter((x): x is Uint8Array => x !== undefined)
    expect(receivedByB[0]).toEqual(aToB)
    expect(receivedByA[0]).toEqual(bToA)
  })

  it('rejects messages above the reassembly limit', () => {
    const codec = new RtcChunkCodec()
    expect(() => codec.encode(bytes(RTC_CHUNK_MAX_MESSAGE_BYTES + 1))).toThrow(/limit/)
  })

  it('enforces the reassembly limit for inbound frames', () => {
    const codec = new RtcChunkCodec()
    const maxChunks = Math.ceil(RTC_CHUNK_MAX_MESSAGE_BYTES / RTC_CHUNK_PAYLOAD_BYTES)

    expect(() => codec.decode(chunkFrame(0, maxChunks + 1))).toThrow(/metadata/)
    expect(() => codec.decode(new Uint8Array(RTC_CHUNK_MAX_MESSAGE_BYTES + 1))).toThrow(/limit/)
  })

  it('rejects an oversized final chunk', () => {
    const codec = new RtcChunkCodec()
    expect(codec.decode(chunkFrame(0, 2))).toBeUndefined()
    expect(() => codec.decode(chunkFrame(1, 2, RTC_CHUNK_PAYLOAD_BYTES + 1))).toThrow(/length/)
  })

  it('round-trips a message at the reassembly limit', () => {
    const encoder = new RtcChunkCodec()
    const decoder = new RtcChunkCodec()
    let reassembled: Uint8Array | undefined
    for (const frame of encoder.encode(new Uint8Array(RTC_CHUNK_MAX_MESSAGE_BYTES))) {
      reassembled = decoder.decode(frame)
    }
    expect(reassembled?.byteLength).toBe(RTC_CHUNK_MAX_MESSAGE_BYTES)
  })
})

// --- Transport-level integration: the DataChannel state machine chunks outbound
// ciphertext frames and reassembles inbound chunked frames transparently.

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

class FakeChannel implements RtcDataChannel {
  readonly label = 'dsh'
  readonly ordered = true
  readyState: RtcDataChannel['readyState'] = 'connecting'
  bufferedAmount = 0
  binaryType = ''
  onopen: (() => void) | null = null
  onmessage: ((event: { data: ArrayBuffer | string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onbufferedamountlow: (() => void) | null = null
  sent: Uint8Array[] = []

  send(data: ArrayBuffer | string): void { this.sent.push(new Uint8Array(data as ArrayBuffer)) }
  close(): void { this.readyState = 'closed'; this.onclose?.() }
  open(): void { this.readyState = 'open'; this.onopen?.() }
  receive(data: ArrayBuffer | string): void { this.onmessage?.({ data }) }
}

class FakePeerConnection implements RtcPeerConnection {
  connectionState = 'new'
  iceConnectionState = 'new'
  iceGatheringState = 'new'
  signalingState = 'stable'
  onconnectionstatechange: (() => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  onicegatheringstatechange: (() => void) | null = null
  onicecandidate: ((event: { candidate: RtcIceCandidateInit | null }) => void) | null = null
  ondatachannel: ((event: { channel: RtcDataChannel }) => void) | null = null
  channels: FakeChannel[] = []
  stats: RtcStatsEntry[] = [
    { type: 'local-candidate', candidateType: 'host', id: 'lc' },
    { type: 'remote-candidate', candidateType: 'srflx', id: 'rc' },
    { type: 'candidate-pair', selected: true, nominated: true, localCandidateId: 'lc', remoteCandidateId: 'rc' },
  ]

  createDataChannel(): RtcDataChannel {
    const channel = new FakeChannel()
    this.channels.push(channel)
    return channel
  }
  async createOffer(): Promise<{ type: 'offer'; sdp?: string }> { return { type: 'offer', sdp: 'v=0 offer' } }
  async createAnswer(): Promise<{ type: 'answer'; sdp?: string }> { return { type: 'answer', sdp: 'v=0 answer' } }
  async setLocalDescription(description: { type: 'offer' | 'answer'; sdp?: string }): Promise<void> { void description }
  async setRemoteDescription(description: { type: 'offer' | 'answer'; sdp?: string }): Promise<void> { void description }
  async addIceCandidate(candidate: RtcIceCandidateInit): Promise<void> { void candidate }
  async getStats(): Promise<Iterable<readonly [string, RtcStatsEntry]>> {
    return this.stats.map((entry, index) => [String(index), entry] as const)
  }
  close(): void { this.connectionState = 'closed' }
}

function factoryFor(pc: FakePeerConnection): RtcPeerConnectionFactory {
  return { create: () => pc }
}

describe('RtcDataChannelTransport chunking integration', () => {
  it('splits a 48 KiB send into multiple wire frames and reassembles the reply', async () => {
    const pc = new FakePeerConnection()
    const transport = new RtcDataChannelTransport({
      role: 'initiator',
      factory: factoryFor(pc),
      onSignal: () => undefined,
    })
    const connecting = transport.connect()
    await flush()
    transport.handleSignal({ type: 'answer', sdp: 'v=0 answer' })
    await flush()
    pc.channels[0]!.open()
    await connecting

    const original = bytes(48 * 1024)
    await transport.send(original)
    const channel = pc.channels[0]!
    expect(channel.sent.length).toBe(Math.ceil(original.byteLength / RTC_CHUNK_PAYLOAD_BYTES))
    expect(Array.from(channel.sent[0]!.subarray(0, 4))).toEqual(Array.from(RTC_CHUNK_MAGIC))

    const received: Uint8Array[] = []
    transport.onMessage(data => received.push(data))
    for (const frame of channel.sent) channel.receive(frame.buffer)
    expect(received).toHaveLength(1)
    expect(received[0]).toEqual(original)

    await transport.close()
  })

  it('reassembles a chunked inbound 128 KiB message into one onMessage callback', async () => {
    const pc = new FakePeerConnection()
    const transport = new RtcDataChannelTransport({
      role: 'responder',
      factory: factoryFor(pc),
      onSignal: () => undefined,
    })
    void transport.connect()
    transport.handleSignal({ type: 'offer', sdp: 'v=0 offer' })
    await flush()
    const channel = new FakeChannel()
    pc.channels.push(channel)
    pc.ondatachannel?.({ channel })
    channel.open()

    const received: Uint8Array[] = []
    transport.onMessage(data => received.push(data))
    const original = bytes(128 * 1024)
    const codec = new RtcChunkCodec()
    for (const frame of codec.encode(original)) channel.receive(frame.buffer)
    expect(received).toHaveLength(1)
    expect(received[0]).toEqual(original)

    await transport.close()
  })
})
