import { describe, expect, it, vi } from 'vitest'
import type {
  RtcDataChannel,
  RtcIceCandidateInit,
  RtcPeerConnection,
  RtcPeerConnectionFactory,
  RtcStats,
  RtcStatsEntry,
} from '../src/rtc-adapter.js'
import {
  detectSelectedPath,
  detectSelectedTransport,
  inspectSelectedPath,
  RtcConnectError,
  RtcDataChannelTransport,
} from '../src/rtc-data-channel.js'

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

function asStats(entries: RtcStatsEntry[]): RtcStats {
  return entries.map((entry, index) => [String(index), entry] as const)
}

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
  sent: (ArrayBuffer | string)[] = []

  send(data: ArrayBuffer | string): void { this.sent.push(data) }
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
  localDescription: { type: 'offer' | 'answer'; sdp?: string } | undefined
  remoteDescription: { type: 'offer' | 'answer'; sdp?: string } | undefined
  channels: FakeChannel[] = []
  candidates: RtcIceCandidateInit[] = []
  stats: RtcStatsEntry[] = []

  createDataChannel(): RtcDataChannel {
    const channel = new FakeChannel()
    this.channels.push(channel)
    return channel
  }
  async createOffer(): Promise<{ type: 'offer'; sdp?: string }> { return { type: 'offer', sdp: 'v=0 offer' } }
  async createAnswer(): Promise<{ type: 'answer'; sdp?: string }> { return { type: 'answer', sdp: 'v=0 answer' } }
  async setLocalDescription(description: { type: 'offer' | 'answer'; sdp?: string }): Promise<void> { this.localDescription = description }
  async setRemoteDescription(description: { type: 'offer' | 'answer'; sdp?: string }): Promise<void> { this.remoteDescription = description }
  async addIceCandidate(candidate: RtcIceCandidateInit): Promise<void> { this.candidates.push(candidate) }
  async getStats(): Promise<Iterable<readonly [string, RtcStatsEntry]>> {
    return this.stats.map((entry, index) => [String(index), entry] as const)
  }
  close(): void { this.connectionState = 'closed' }
  emitIceCandidate(candidate: RtcIceCandidateInit | null): void { this.onicecandidate?.({ candidate }) }
  emitDataChannel(channel: RtcDataChannel): void { this.ondatachannel?.({ channel }) }
}

function factoryFor(pc: FakePeerConnection): RtcPeerConnectionFactory {
  return { create: () => pc }
}

function p2pStats(): RtcStatsEntry[] {
  return [
    { type: 'local-candidate', candidateType: 'host', id: 'lc' },
    { type: 'remote-candidate', candidateType: 'srflx', id: 'rc' },
    { type: 'candidate-pair', selected: true, nominated: true, localCandidateId: 'lc', remoteCandidateId: 'rc' },
  ]
}

function lanStats(): RtcStatsEntry[] {
  return [
    { type: 'local-candidate', candidateType: 'host', address: '192.168.1.20', port: 51_001, protocol: 'udp', id: 'lc' },
    { type: 'remote-candidate', candidateType: 'host', address: '192.168.1.30', port: 51_002, protocol: 'udp', id: 'rc' },
    {
      type: 'candidate-pair', id: 'cp', state: 'succeeded', localCandidateId: 'lc', remoteCandidateId: 'rc',
      currentRoundTripTime: 0.0124, availableOutgoingBitrate: 8_500_000, bytesSent: 2_048, bytesReceived: 4_096,
    },
    { type: 'transport', selectedCandidatePairId: 'cp' },
  ]
}

function turnStats(): RtcStatsEntry[] {
  return [
    { type: 'local-candidate', candidateType: 'relay', id: 'lc' },
    { type: 'remote-candidate', candidateType: 'host', id: 'rc' },
    { type: 'candidate-pair', selected: true, localCandidateId: 'lc', remoteCandidateId: 'rc' },
  ]
}

describe('detectSelectedTransport', () => {
  it('classifies a selected private host-to-host pair as LAN while retaining p2p signaling', () => {
    expect(detectSelectedPath(asStats(lanStats()))).toEqual({ transport: 'p2p', mode: 'LAN' })
    expect(detectSelectedTransport(asStats(lanStats()))).toBe('p2p')
    expect(inspectSelectedPath(asStats(lanStats()))).toMatchObject({
      localCandidateType: 'host',
      remoteCandidateType: 'host',
      localAddress: '192.168.1.20:51001',
      remoteAddress: '192.168.1.30:51002',
      protocol: 'udp',
      currentRoundTripTimeMs: 12,
      availableOutgoingBitrate: 8_500_000,
      bytesSent: 2_048,
      bytesReceived: 4_096,
    })
  })

  it('detects p2p from a selected host/srflx candidate pair', () => {
    expect(detectSelectedTransport(asStats(p2pStats()))).toBe('p2p')
  })

  it('detects turn when any selected candidate is a relay candidate', () => {
    expect(detectSelectedTransport(asStats(turnStats()))).toBe('turn')
  })

  it('returns undefined when no selected pair exists', () => {
    expect(detectSelectedTransport(asStats([{ type: 'local-candidate', candidateType: 'host', id: 'lc' }]))).toBeUndefined()
  })
})

describe('RtcDataChannelTransport initiator', () => {
  it('reports LAN for a private host-to-host data path', async () => {
    const pc = new FakePeerConnection()
    pc.stats = lanStats()
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
    expect(transport.selectedTransport()).toBe('p2p')
    expect(transport.selectedPathMode()).toBe('LAN')
    expect(transport.getStats().mode).toBe('LAN')
    await expect(transport.connectionDetails()).resolves.toMatchObject({
      mode: 'LAN',
      connectionState: 'new',
      iceConnectionState: 'new',
      dataChannelState: 'open',
      localAddress: '192.168.1.20:51001',
      remoteAddress: '192.168.1.30:51002',
      currentRoundTripTimeMs: 12,
    })
    await transport.close()
  })

  it('creates an offer and resolves with p2p once the data channel opens', async () => {
    const pc = new FakePeerConnection()
    pc.stats = p2pStats()
    const signals: unknown[] = []
    const transport = new RtcDataChannelTransport({
      role: 'initiator',
      factory: factoryFor(pc),
      onSignal: signal => signals.push(signal),
    })
    let connected = false
    const connecting = transport.connect().then(() => { connected = true })
    await flush()

    expect(pc.channels).toHaveLength(1)
    expect(pc.localDescription?.type).toBe('offer')
    expect(signals).toEqual([{ type: 'offer', sdp: 'v=0 offer' }])

    transport.handleSignal({ type: 'answer', sdp: 'v=0 answer' })
    await flush()
    expect(pc.remoteDescription?.type).toBe('answer')

    pc.channels[0]!.open()
    await connecting
    expect(connected).toBe(true)
    expect(transport.selectedTransport()).toBe('p2p')
    expect(transport.getStats()).toMatchObject({ mode: 'P2P', connected: true })

    await transport.send(new Uint8Array([1, 2, 3]))
    expect(pc.channels[0]!.sent).toHaveLength(1)
    await transport.close()
  })

  it('does not treat continued sends as a stalled DataChannel queue', async () => {
    vi.useFakeTimers()
    try {
      const pc = new FakePeerConnection()
      pc.stats = lanStats()
      const transport = new RtcDataChannelTransport({
        role: 'initiator',
        factory: factoryFor(pc),
        onSignal: () => undefined,
        sendTimeoutMs: 5_000,
      })
      const connecting = transport.connect()
      await vi.advanceTimersByTimeAsync(0)
      transport.handleSignal({ type: 'answer', sdp: 'v=0 answer' })
      await vi.advanceTimersByTimeAsync(0)
      const channel = pc.channels[0]!
      channel.open()
      await connecting

      channel.bufferedAmount = 10
      await transport.send(new Uint8Array([1]))
      await vi.advanceTimersByTimeAsync(4_000)

      // Loading a conversation sends more requests while earlier writes are
      // still draining. The newer send must refresh the watchdog baseline;
      // it is evidence of active traffic, not evidence that the first write
      // has been stuck for five seconds.
      channel.bufferedAmount = 20
      await transport.send(new Uint8Array([2]))
      await vi.advanceTimersByTimeAsync(1_100)
      expect(transport.getStats()).toMatchObject({ mode: 'LAN', connected: true })

      channel.bufferedAmount = 0
      await vi.advanceTimersByTimeAsync(4_000)
      expect(transport.getStats()).toMatchObject({ mode: 'LAN', connected: true })
      await transport.close()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not infer a dead connection from bufferedAmount by default', async () => {
    vi.useFakeTimers()
    try {
      const pc = new FakePeerConnection()
      pc.stats = lanStats()
      const transport = new RtcDataChannelTransport({
        role: 'initiator',
        factory: factoryFor(pc),
        onSignal: () => undefined,
      })
      const connecting = transport.connect()
      await vi.advanceTimersByTimeAsync(0)
      transport.handleSignal({ type: 'answer', sdp: 'v=0 answer' })
      await vi.advanceTimersByTimeAsync(0)
      const channel = pc.channels[0]!
      channel.open()
      await connecting

      // React Native may retain a positive bufferedAmount even after SCTP has
      // delivered the frame. It is not an acknowledgement or liveness signal.
      channel.bufferedAmount = 64 * 1024
      await transport.send(new Uint8Array([1, 2, 3]))
      await vi.advanceTimersByTimeAsync(60_000)
      expect(transport.getStats()).toMatchObject({ mode: 'LAN', connected: true })
      await transport.close()
    } finally {
      vi.useRealTimers()
    }
  })

  it('detects turn from the selected candidate pair', async () => {
    const pc = new FakePeerConnection()
    pc.stats = turnStats()
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
    expect(transport.selectedTransport()).toBe('turn')
    expect(transport.getStats().mode).toBe('TURN')
    await transport.close()
  })

  it('rejects on negotiation timeout', async () => {
    vi.useFakeTimers()
    try {
      const pc = new FakePeerConnection()
      const transport = new RtcDataChannelTransport({
        role: 'initiator',
        factory: factoryFor(pc),
        onSignal: () => undefined,
        negotiateTimeoutMs: 1000,
      })
      let caught: Error | undefined
      const connecting = transport.connect().catch((error: Error) => { caught = error })
      await vi.advanceTimersByTimeAsync(1100)
      await connecting
      expect(caught).toMatchObject({ code: 'RTC_CONNECT_TIMEOUT' })
      expect(transport.getStats().connected).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('RtcDataChannelTransport responder', () => {
  it('answers an offer and resolves when the remote data channel opens', async () => {
    const pc = new FakePeerConnection()
    pc.stats = p2pStats()
    const signals: unknown[] = []
    const transport = new RtcDataChannelTransport({
      role: 'responder',
      factory: factoryFor(pc),
      onSignal: signal => signals.push(signal),
    })
    let connected = false
    const connecting = transport.connect().then(() => { connected = true })

    transport.handleSignal({ type: 'offer', sdp: 'v=0 offer' })
    await flush()
    expect(pc.remoteDescription?.type).toBe('offer')
    expect(signals).toEqual([{ type: 'answer', sdp: 'v=0 answer' }])

    const channel = new FakeChannel()
    pc.emitDataChannel(channel)
    channel.open()
    await connecting
    expect(connected).toBe(true)

    const received: Uint8Array[] = []
    transport.onMessage(data => received.push(data))
    channel.receive(new Uint8Array([9, 8, 7]).buffer)
    expect(received).toHaveLength(1)
    await transport.close()
  })

  it('buffers trickle ICE until the offer is processed', async () => {
    const pc = new FakePeerConnection()
    const transport = new RtcDataChannelTransport({
      role: 'responder',
      factory: factoryFor(pc),
      onSignal: () => undefined,
    })
    void transport.connect()
    const early: RtcIceCandidateInit = { candidate: 'candidate:1', sdpMid: '0', sdpMLineIndex: 0 }
    transport.handleSignal({ type: 'ice', candidate: early })
    await flush()
    expect(pc.candidates).toHaveLength(0) // buffered, remote description not set yet

    transport.handleSignal({ type: 'offer', sdp: 'v=0 offer' })
    await flush()
    expect(pc.candidates).toHaveLength(1)
    await transport.close()
  })

  it('is an idempotent close', async () => {
    const pc = new FakePeerConnection()
    const transport = new RtcDataChannelTransport({
      role: 'responder',
      factory: factoryFor(pc),
      onSignal: () => undefined,
    })
    await transport.close()
    await transport.close()
    expect(transport.getStats().connected).toBe(false)
  })
})

describe('RtcConnectError', () => {
  it('carries a stable code', () => {
    expect(new RtcConnectError('RTC_CONNECT_TIMEOUT', 'x').code).toBe('RTC_CONNECT_TIMEOUT')
  })
})
