import { describe, expect, it } from 'vitest'
import { decryptFrame, deriveSharedKey, encryptFrame, generateKeyPair, identityFingerprint } from '../src/index.js'

describe('secure channel primitives', () => {
  it('derives matching shared keys and decrypts a frame', () => {
    const host = generateKeyPair()
    const client = generateKeyPair()
    const hostKey = deriveSharedKey(host.privateKey, client.publicKey)
    const clientKey = deriveSharedKey(client.privateKey, host.publicKey)
    expect(Buffer.from(hostKey).equals(Buffer.from(clientKey))).toBe(true)

    const plaintext = new TextEncoder().encode('hello remote')
    const frame = encryptFrame(hostKey, plaintext)
    expect(new TextDecoder().decode(decryptFrame(clientKey, frame))).toBe('hello remote')
    expect(identityFingerprint(host.publicKey)).toMatch(/^[A-F0-9]{12}$/)
  })
})
