import { NoiseIkSession, createNoisePrologue, generateKeyPair } from '@dsh-remote/crypto'
import { MAX_SECURE_MESSAGE_BYTES, SECURE_FRAGMENT_CHUNK_BYTES, SecureMessageCodec } from '@dsh-remote/protocol'
import type { SecureHandshakeTransport } from '@dsh-remote/webrtc'
import { describe, expect, it, vi } from 'vitest'
import { ClientSecureTransport } from '../src/client-secure-transport.js'
import type { HostIdentity, TrustedPeer } from '../src/identity-store.js'

class HostLoopbackTransport implements SecureHandshakeTransport {
  private messageHandler?: (data: Uint8Array) => void
  private handshakeHandler?: (step: number, data: Uint8Array) => void
  private closeHandler?: () => void
  private readonly incoming = new SecureMessageCodec()
  private readonly outgoing = new SecureMessageCodec()
  plaintext?: Uint8Array
  closed = false
  sendError?: Error

  constructor(private readonly hostNoise: NoiseIkSession) {}

  async connect(): Promise<void> {}

  async send(data: Uint8Array): Promise<void> {
    if (this.sendError !== undefined) throw this.sendError
    const message = this.incoming.decode(this.hostNoise.decrypt(data))
    if (message !== undefined) this.plaintext = message
  }

  async sendHandshake(step: number, data: Uint8Array): Promise<void> {
    expect(step).toBe(1)
    this.hostNoise.readHandshake(data)
    this.handshakeHandler?.(2, this.hostNoise.writeHandshake())
  }

  connectionInfo() { return { connectionId: 'connection-1', localDeviceId: 'client-1', remoteDeviceId: 'host-1' } }

  onHandshake(handler: (step: number, data: Uint8Array) => void): () => void {
    this.handshakeHandler = handler
    return () => { this.handshakeHandler = undefined }
  }

  onMessage(handler: (data: Uint8Array) => void): () => void {
    this.messageHandler = handler
    return () => { this.messageHandler = undefined }
  }

  onClose(handler: () => void): () => void {
    this.closeHandler = handler
    return () => { this.closeHandler = undefined }
  }

  async close(): Promise<void> { this.closed = true }

  getStats() { return { mode: 'Relay' as const, connected: !this.closed } }

  sendFromHost(data: Uint8Array): void {
    for (const frame of this.outgoing.encode(data)) this.messageHandler?.(this.hostNoise.encrypt(frame))
  }

  disconnect(): void { this.closeHandler?.() }
}

describe('ClientSecureTransport', () => {
  it('authenticates the Host, protects both directions, and forwards disconnects', async () => {
    const clientKeys = generateKeyPair(new Uint8Array(32).fill(21))
    const hostKeys = generateKeyPair(new Uint8Array(32).fill(22))
    const client: HostIdentity = {
      schemaVersion: 1,
      deviceId: 'client-1',
      name: 'Local Client',
      fingerprint: 'CLIENT',
      ...clientKeys,
    }
    const host: TrustedPeer = {
      deviceId: 'host-1',
      name: 'Remote Host',
      platform: 'linux',
      publicKey: hostKeys.publicKey,
      fingerprint: 'HOST',
      trustedAt: 1,
      membershipId: 'membership-1',
    }
    const hostNoise = new NoiseIkSession({
      role: 'responder',
      localPrivateKey: hostKeys.privateKey,
      localPublicKey: hostKeys.publicKey,
      remotePublicKey: clientKeys.publicKey,
      prologue: createNoisePrologue('connection-1', 'host-1', 'client-1'),
    })
    const wire = new HostLoopbackTransport(hostNoise)
    const secure = new ClientSecureTransport(wire, client, host)
    const closed = vi.fn()
    secure.onClose(closed)
    let received = new Uint8Array()
    secure.onMessage(data => { received = Uint8Array.from(data) })

    await secure.connect()
    await secure.send(new TextEncoder().encode('private request'))
    expect(new TextDecoder().decode(wire.plaintext)).toBe('private request')
    wire.sendFromHost(new TextEncoder().encode('private response'))
    expect(new TextDecoder().decode(received)).toBe('private response')

    const large = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES * 2 + 19).fill(7)
    await secure.send(large)
    expect(wire.plaintext).toEqual(large)
    wire.sendFromHost(large)
    expect(received).toEqual(large)

    wire.disconnect()
    expect(closed).toHaveBeenCalledOnce()
  })

  it('closes the Noise session when the encrypted transport send fails', async () => {
    const { secure, wire } = secureTransportFixture()
    await secure.connect()
    wire.sendError = new Error('Relay frame exceeds its limit.')

    await expect(secure.send(new Uint8Array(64 * 1024))).rejects.toThrow('Relay frame exceeds its limit.')
    expect(wire.closed).toBe(true)
    expect(secure.getStats().connected).toBe(false)
    await expect(secure.send(new Uint8Array([1]))).rejects.toThrow(
      'The authenticated Noise channel is not connected.',
    )
  })

  it('keeps the Noise session open when local message validation fails', async () => {
    const { secure, wire } = secureTransportFixture()
    await secure.connect()

    await expect(secure.send(new Uint8Array(MAX_SECURE_MESSAGE_BYTES + 1))).rejects.toThrow(
      'Secure message exceeds the reassembly limit.',
    )
    expect(wire.closed).toBe(false)
    await secure.send(new TextEncoder().encode('valid request'))
    expect(new TextDecoder().decode(wire.plaintext)).toBe('valid request')
  })
})

function secureTransportFixture(): { secure: ClientSecureTransport; wire: HostLoopbackTransport } {
  const clientKeys = generateKeyPair(new Uint8Array(32).fill(21))
  const hostKeys = generateKeyPair(new Uint8Array(32).fill(22))
  const client: HostIdentity = {
    schemaVersion: 1,
    deviceId: 'client-1',
    name: 'Local Client',
    fingerprint: 'CLIENT',
    ...clientKeys,
  }
  const host: TrustedPeer = {
    deviceId: 'host-1',
    name: 'Remote Host',
    platform: 'linux',
    publicKey: hostKeys.publicKey,
    fingerprint: 'HOST',
    trustedAt: 1,
    membershipId: 'membership-1',
  }
  const hostNoise = new NoiseIkSession({
    role: 'responder',
    localPrivateKey: hostKeys.privateKey,
    localPublicKey: hostKeys.publicKey,
    remotePublicKey: clientKeys.publicKey,
    prologue: createNoisePrologue('connection-1', 'host-1', 'client-1'),
  })
  const wire = new HostLoopbackTransport(hostNoise)
  return { secure: new ClientSecureTransport(wire, client, host), wire }
}
