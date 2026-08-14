import { describe, expect, it } from 'vitest'
import {
  NoiseIkSession,
  createNoisePrologue,
  generateKeyPair,
} from '../src/index.js'

describe('Noise IK secure session', () => {
  it('authenticates both static identities and protects both transport directions', () => {
    const host = generateKeyPair(fixedBytes(1))
    const client = generateKeyPair(fixedBytes(2))
    const prologue = createNoisePrologue('connection-1', 'host-1', 'client-1')
    const initiator = new NoiseIkSession({
      role: 'initiator',
      localPrivateKey: client.privateKey,
      localPublicKey: client.publicKey,
      remotePublicKey: host.publicKey,
      prologue,
      random: deterministicRandom(10),
    })
    const responder = new NoiseIkSession({
      role: 'responder',
      localPrivateKey: host.privateKey,
      localPublicKey: host.publicKey,
      remotePublicKey: client.publicKey,
      prologue,
      random: deterministicRandom(20),
    })

    responder.readHandshake(initiator.writeHandshake())
    initiator.readHandshake(responder.writeHandshake())

    expect(initiator.complete).toBe(true)
    expect(responder.complete).toBe(true)
    const request = initiator.encrypt(new TextEncoder().encode('request'))
    expect(new TextDecoder().decode(responder.decrypt(request))).toBe('request')
    const response = responder.encrypt(new TextEncoder().encode('response'))
    expect(new TextDecoder().decode(initiator.decrypt(response))).toBe('response')
  })

  it('rejects a peer static key mismatch and transport tampering', () => {
    const host = generateKeyPair(fixedBytes(3))
    const client = generateKeyPair(fixedBytes(4))
    const stranger = generateKeyPair(fixedBytes(5))
    const prologue = createNoisePrologue('connection-2', 'host-2', 'client-2')
    const initiator = session('initiator', client, host.publicKey, prologue, 30)
    const wrongResponder = session('responder', host, stranger.publicKey, prologue, 40)
    expect(() => wrongResponder.readHandshake(initiator.writeHandshake())).toThrow(/static key/)

    const goodInitiator = session('initiator', client, host.publicKey, prologue, 50)
    const goodResponder = session('responder', host, client.publicKey, prologue, 60)
    goodResponder.readHandshake(goodInitiator.writeHandshake())
    goodInitiator.readHandshake(goodResponder.writeHandshake())
    const ciphertext = goodInitiator.encrypt(new TextEncoder().encode('authentic'))
    ciphertext[0] ^= 1
    expect(() => goodResponder.decrypt(ciphertext)).toThrow()
  })
})

function session(
  role: 'initiator' | 'responder',
  local: ReturnType<typeof generateKeyPair>,
  remotePublicKey: string,
  prologue: Uint8Array,
  seed: number,
): NoiseIkSession {
  return new NoiseIkSession({
    role,
    localPrivateKey: local.privateKey,
    localPublicKey: local.publicKey,
    remotePublicKey,
    prologue,
    random: deterministicRandom(seed),
  })
}

function fixedBytes(value: number): Uint8Array { return new Uint8Array(32).fill(value) }

function deterministicRandom(seed: number): (length: number) => Uint8Array {
  let next = seed
  return length => Uint8Array.from({ length }, () => (next++ % 251) + 1)
}
