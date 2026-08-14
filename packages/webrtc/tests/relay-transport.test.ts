import { afterEach, describe, expect, it, vi } from 'vitest'
import { createControlFrame } from '@dsh-remote/protocol'
import { RelayTransport } from '../src/index.js'

class FakeWebSocket {
  static readonly OPEN = 1
  static latest?: FakeWebSocket
  readyState = 0
  binaryType = ''
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null

  constructor(readonly url: string) {
    FakeWebSocket.latest = this
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.()
  }

  receive(value: unknown): void {
    this.onmessage?.({ data: JSON.stringify(value) })
  }

  send(value: string): void {
    this.sent.push(value)
  }

  close(): void {
    this.readyState = 3
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  FakeWebSocket.latest = undefined
})

describe('RelayTransport control handshake', () => {
  it('waits for authorization and sends canonical relay frames', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket)
    const transport = new RelayTransport('wss://remote.example/ws/v1/connect', {
      role: 'client',
      deviceId: 'client-1',
      accessToken: 'access-token',
      targetDeviceId: 'host-1',
    })
    let connected = false
    const connecting = transport.connect().then(() => { connected = true })
    const socket = FakeWebSocket.latest!
    socket.open()

    expect(JSON.parse(socket.sent[0]!)).toMatchObject({
      v: 1,
      type: 'hello',
      payload: { role: 'client', deviceId: 'client-1', accessToken: 'access-token', protocols: [1] },
    })
    expect(connected).toBe(false)

    socket.receive(createControlFrame('hello.ack', {
      protocol: 1,
      serverVersion: '0.1.0',
      connectionSessionId: 'control-1',
      heartbeatIntervalMs: 25_000,
      maxControlFrameBytes: 65_536,
      maxRelayFrameBytes: 1_048_576,
    }))
    await Promise.resolve()
    expect(JSON.parse(socket.sent[1]!)).toMatchObject({
      v: 1,
      type: 'connect.request',
      payload: { hostDeviceId: 'host-1', preferredTransports: ['relay'] },
    })
    expect(connected).toBe(false)

    socket.receive(createControlFrame('connect.accepted', {
      connectionId: 'connection-1',
      targetDeviceId: 'client-1',
      transport: 'relay',
    }))
    await connecting
    await transport.send(new TextEncoder().encode('encrypted-frame'))

    const relay = JSON.parse(socket.sent[2]!)
    expect(relay).toMatchObject({
      v: 1,
      type: 'relay',
      payload: { connectionId: 'connection-1', targetDeviceId: 'host-1', counter: 0 },
    })
    expect(relay.payload.ciphertext).not.toContain('encrypted-frame')
  })
})
