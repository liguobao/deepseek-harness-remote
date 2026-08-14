import { describe, expect, it } from 'vitest'
import { generateKeyPair } from '@dsh-remote/crypto'
import type { RemoteTransport } from '@dsh-remote/webrtc'
import { SecureTransport } from '../src/services/secure-transport'
import type { DeviceIdentity, RemoteDevice } from '../src/types'

class MemoryTransport implements RemoteTransport {
  handler?: (data: Uint8Array) => void
  sent?: Uint8Array
  async connect() {}
  async send(data: Uint8Array) { this.sent = data }
  onMessage(handler: (data: Uint8Array) => void) { this.handler = handler; return () => { this.handler = undefined } }
  async close() {}
  getStats() { return { mode: 'Relay' as const, connected: true } }
}

describe('secure transport', () => {
  it('encrypts relay content and decrypts it for the trusted peer', async () => {
    const clientKeys = generateKeyPair(new Uint8Array(32).fill(1))
    const hostKeys = generateKeyPair(new Uint8Array(32).fill(2))
    const clientIdentity: DeviceIdentity = { deviceId: 'client', name: 'Phone', platform: 'android', ...clientKeys }
    const hostDevice: RemoteDevice = { deviceId: 'host', name: 'Host', platform: 'linux', online: true, identityKey: hostKeys.publicKey }
    const clientWire = new MemoryTransport()
    const hostWire = new MemoryTransport()
    const client = new SecureTransport(clientWire, clientIdentity, hostDevice)
    const host = new SecureTransport(hostWire, {
      deviceId: 'host', name: 'Host', platform: 'android', ...hostKeys,
    }, {
      deviceId: 'client', name: 'Phone', platform: 'android', online: true, identityKey: clientKeys.publicKey,
    })

    let received = ''
    host.onMessage(data => { received = new TextDecoder().decode(data) })
    await client.send(new TextEncoder().encode('private session text'))
    const wireText = new TextDecoder().decode(clientWire.sent)
    expect(wireText).not.toContain('private session text')
    hostWire.handler?.(clientWire.sent!)
    expect(received).toBe('private session text')

    received = ''
    hostWire.handler?.(clientWire.sent!)
    expect(received).toBe('')
  })
})
