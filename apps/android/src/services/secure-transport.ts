import { decryptFrame, deriveSharedKey, encryptFrame, type EncryptedFrame } from '@dsh-remote/crypto'
import type { RemoteTransport } from '@dsh-remote/webrtc'
import type { DeviceIdentity, RemoteDevice } from '../types'

interface SecureEnvelope {
  secure: 1
  counter: number
  frame: EncryptedFrame
}

export class SecureTransport implements RemoteTransport {
  private readonly key: Uint8Array
  private readonly aad: string
  private unsubscribeInner?: () => void
  private sendCounter = 0
  private receiveCounter = -1

  constructor(
    private readonly inner: RemoteTransport,
    identity: DeviceIdentity,
    host: RemoteDevice,
  ) {
    if (host.publicKey.length === 0) throw new Error('The host has no encryption key. Pair it again.')
    this.key = deriveSharedKey(identity.privateKey, host.publicKey)
    this.aad = channelAad(identity.deviceId, host.deviceId)
  }

  connect(): Promise<void> {
    return this.inner.connect()
  }

  async send(data: Uint8Array): Promise<void> {
    const counter = this.sendCounter
    this.sendCounter += 1
    const envelope: SecureEnvelope = {
      secure: 1,
      counter,
      frame: encryptFrame(this.key, data, frameAad(this.aad, counter)),
    }
    await this.inner.send(new TextEncoder().encode(JSON.stringify(envelope)))
  }

  onMessage(cb: (data: Uint8Array) => void): () => void {
    this.unsubscribeInner?.()
    this.unsubscribeInner = this.inner.onMessage(data => {
      try {
        const envelope = JSON.parse(new TextDecoder().decode(data)) as Partial<SecureEnvelope>
        if (envelope.secure !== 1 || envelope.frame === undefined || !Number.isSafeInteger(envelope.counter)) return
        const counter = envelope.counter!
        if (counter <= this.receiveCounter) return
        const plaintext = decryptFrame(this.key, envelope.frame, frameAad(this.aad, counter))
        this.receiveCounter = counter
        cb(plaintext)
      } catch {
        // Invalid or unauthenticated frames are intentionally dropped.
      }
    })
    return () => {
      this.unsubscribeInner?.()
      this.unsubscribeInner = undefined
    }
  }

  async close(): Promise<void> {
    this.unsubscribeInner?.()
    this.unsubscribeInner = undefined
    await this.inner.close()
  }

  getStats() {
    return this.inner.getStats()
  }
}

export function channelAad(firstDeviceId: string, secondDeviceId: string): string {
  return `dsh-remote-v1:${[firstDeviceId, secondDeviceId].sort().join(':')}`
}

function frameAad(channel: string, counter: number): string {
  return `${channel}:${counter}`
}
