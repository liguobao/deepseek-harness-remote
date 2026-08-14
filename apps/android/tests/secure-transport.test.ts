import { describe, expect, it } from 'vitest'
import { NoiseIkSession, createNoisePrologue, generateKeyPair } from '@dsh-remote/crypto'
import type { SecureHandshakeTransport } from '@dsh-remote/webrtc'
import { SecureTransport } from '../src/services/secure-transport'
import type { DeviceIdentity, RemoteDevice } from '../src/types'

class HostLoopbackTransport implements SecureHandshakeTransport {
  handler?: (data: Uint8Array) => void
  handshakeHandler?: (step: number, data: Uint8Array) => void
  plaintext?: Uint8Array
  closed = false

  constructor(private readonly hostNoise: NoiseIkSession) {}

  async connect() {}

  async send(data: Uint8Array) { this.plaintext = this.hostNoise.decrypt(data) }

  async sendHandshake(step: number, data: Uint8Array) {
    expect(step).toBe(1)
    this.hostNoise.readHandshake(data)
    this.handshakeHandler?.(2, this.hostNoise.writeHandshake())
  }

  connectionInfo() { return { connectionId: 'connection-1', localDeviceId: 'client', remoteDeviceId: 'host' } }

  onHandshake(handler: (step: number, data: Uint8Array) => void) {
    this.handshakeHandler = handler
    return () => { this.handshakeHandler = undefined }
  }

  onMessage(handler: (data: Uint8Array) => void) { this.handler = handler; return () => { this.handler = undefined } }

  async close() { this.closed = true }

  getStats() { return { mode: 'Relay' as const, connected: !this.closed } }

  sendFromHost(data: Uint8Array) { this.handler?.(this.hostNoise.encrypt(data)) }
}

describe('secure transport', () => {
  it('performs Noise IK and protects both relay directions', async () => {
    const clientKeys = generateKeyPair(new Uint8Array(32).fill(1))
    const hostKeys = generateKeyPair(new Uint8Array(32).fill(2))
    const clientIdentity: DeviceIdentity = { deviceId: 'client', name: 'Phone', platform: 'android', ...clientKeys }
    const hostDevice: RemoteDevice = { deviceId: 'host', name: 'Host', platform: 'linux', online: true, identityKey: hostKeys.publicKey }
    const hostNoise = new NoiseIkSession({
      role: 'responder',
      localPrivateKey: hostKeys.privateKey,
      localPublicKey: hostKeys.publicKey,
      remotePublicKey: clientKeys.publicKey,
      prologue: createNoisePrologue('connection-1', 'host', 'client'),
    })
    const wire = new HostLoopbackTransport(hostNoise)
    const client = new SecureTransport(wire, clientIdentity, hostDevice)

    let received = ''
    client.onMessage(data => { received = new TextDecoder().decode(data) })
    await client.connect()
    await client.send(new TextEncoder().encode('private session text'))
    expect(new TextDecoder().decode(wire.plaintext)).toBe('private session text')

    wire.sendFromHost(new TextEncoder().encode('private response'))
    expect(received).toBe('private response')
  })
})
