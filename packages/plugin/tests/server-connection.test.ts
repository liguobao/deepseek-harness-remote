import { NoiseIkSession, createNoisePrologue, generateKeyPair, toBase64Url } from '@dsh-remote/crypto'
import { createControlFrame, createRpcRequest, decodeMessage, encodeMessage, type RemoteMessage } from '@dsh-remote/protocol'
import { describe, expect, it, vi } from 'vitest'
import type { ConnectionController } from '../src/connection-controller.js'
import type { ResolvedConfig } from '../src/config.js'
import type { HostIdentity, IdentityStore, TrustedPeer } from '../src/identity-store.js'
import type { SafeLogger } from '../src/logging.js'
import type { PairingController } from '../src/pairing-controller.js'
import type { HostServerApi } from '../src/server-api.js'
import { HostServerConnection } from '../src/server-connection.js'
import type { AuthenticatedPeerChannel } from '../src/types.js'

class FakeWebSocket {
  readyState = 0
  sent: string[] = []
  onopen: ((event: unknown) => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onclose: ((event: { code: number; reason: string }) => void) | null = null

  open(): void { this.readyState = 1; this.onopen?.({}) }
  receive(frame: unknown): void { this.onmessage?.({ data: JSON.stringify(frame) }) }
  send(data: string): void { this.sent.push(data) }
  close(code = 1000, reason = ''): void { this.readyState = 3; this.onclose?.({ code, reason }) }
}

describe('HostServerConnection', () => {
  it('matches the deployed Server frames and exposes RPC only after Noise IK', async () => {
    const hostKeys = generateKeyPair(new Uint8Array(32).fill(11))
    const clientKeys = generateKeyPair(new Uint8Array(32).fill(12))
    const identity: HostIdentity = {
      schemaVersion: 1,
      deviceId: 'host-1',
      name: 'Host',
      fingerprint: 'HOST',
      ...hostKeys,
    }
    const peer: TrustedPeer = {
      deviceId: 'client-1',
      name: 'Phone',
      platform: 'android',
      publicKey: clientKeys.publicKey,
      fingerprint: 'CLIENT',
      trustedAt: 1,
      membershipId: 'membership-1',
    }
    const socket = new FakeWebSocket()
    let accepted: AuthenticatedPeerChannel | undefined
    const connections = {
      accept: vi.fn(async (channel: AuthenticatedPeerChannel) => { accepted = channel }),
      close: vi.fn(async () => undefined),
    } as unknown as ConnectionController
    const api = {
      baseUrl: 'https://dsh.r2049.cn',
      authenticate: vi.fn(async () => ({ accessToken: 'access-token-value' })),
      refreshCredentials: vi.fn(),
      membershipFor: vi.fn(async () => 'membership-1'),
    } as unknown as HostServerApi
    const server = new HostServerConnection(
      config(),
      identity,
      { trustedPeer: vi.fn(() => peer) } as unknown as IdentityStore,
      api,
      { receiveClaim: vi.fn() } as unknown as PairingController,
      connections,
      logger(),
      () => socket,
    )
    server.start()
    await flush()
    socket.open()
    expect(JSON.parse(socket.sent[0]!)).toMatchObject({ type: 'hello', payload: { role: 'host', deviceId: 'host-1' } })
    socket.receive(createControlFrame('hello.ack', {
      protocol: 1,
      serverVersion: '0.1.0',
      connectionSessionId: 'control-1',
      heartbeatIntervalMs: 25_000,
      maxControlFrameBytes: 65_536,
      maxRelayFrameBytes: 1_048_576,
    }))
    socket.receive(createControlFrame('connect.incoming', {
      connectionId: 'connection-1',
      clientDeviceId: 'client-1',
      clientIdentityKey: clientKeys.publicKey,
      preferredTransports: ['relay'],
    }))
    await flush()
    expect(JSON.parse(socket.sent[1]!)).toEqual(expect.objectContaining({
      type: 'connect.accepted',
      payload: { connectionId: 'connection-1' },
    }))

    const clientNoise = new NoiseIkSession({
      role: 'initiator',
      localPrivateKey: clientKeys.privateKey,
      localPublicKey: clientKeys.publicKey,
      remotePublicKey: hostKeys.publicKey,
      prologue: createNoisePrologue('connection-1', 'host-1', 'client-1'),
    })
    socket.receive(createControlFrame('secure.handshake', {
      connectionId: 'connection-1',
      targetDeviceId: 'host-1',
      step: 1,
      data: toBase64Url(clientNoise.writeHandshake()),
    }))
    await flush()
    const handshakeReply = JSON.parse(socket.sent[2]!)
    expect(handshakeReply).toMatchObject({ type: 'secure.handshake', payload: { step: 2, targetDeviceId: 'client-1' } })
    clientNoise.readHandshake(fromBase64UrlForTest(handshakeReply.payload.data))
    expect(accepted?.security).toEqual({
      protocol: 'Noise_IK_25519_ChaChaPoly_SHA256',
      connectionId: 'connection-1',
      membershipId: 'membership-1',
    })

    let received: RemoteMessage | undefined
    accepted!.onMessage(message => { received = message })
    const request = createRpcRequest('connection.ping', {})
    socket.receive(createControlFrame('relay', {
      connectionId: 'connection-1',
      targetDeviceId: 'host-1',
      counter: 0,
      ciphertext: toBase64Url(clientNoise.encrypt(encodeMessage(request))),
    }))
    await flush()
    expect(received).toEqual(request)

    await accepted!.send(request)
    const relay = JSON.parse(socket.sent[3]!)
    expect(relay).toMatchObject({ type: 'relay', payload: { counter: 0, targetDeviceId: 'client-1' } })
    expect(decodeMessage(clientNoise.decrypt(fromBase64UrlForTest(relay.payload.ciphertext)))).toEqual(request)
    await server.stop()
  })
})

function config(): ResolvedConfig {
  return {
    enabled: true,
    serverUrl: 'https://dsh.r2049.cn',
    deviceName: 'Host',
    forceRelay: true,
    logLevel: 'error',
    approvalTimeoutMs: 1_000,
    reconnect: { enabled: false, initialDelayMs: 100, maxDelayMs: 1_000, jitter: 0 },
  }
}

function logger(): SafeLogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as SafeLogger
}

function fromBase64UrlForTest(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value.replaceAll('-', '+').replaceAll('_', '/'), 'base64'))
}

async function flush(): Promise<void> { await new Promise(resolve => setTimeout(resolve, 0)) }
