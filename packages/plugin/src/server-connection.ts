import {
  NoiseIkSession,
  createNoisePrologue,
  fromBase64Url,
  toBase64Url,
} from '@dsh-remote/crypto'
import {
  PROTOCOL_VERSION,
  createControlFrame,
  decodeMessage,
  encodeMessage,
  parseControlFrame,
  type ConnectIncomingPayload,
  type ControlErrorPayload,
  type HelloAckPayload,
  type PairingClaimedPayload,
  type RelayPayload,
  type RemoteMessage,
  type SecureHandshakePayload,
} from '@dsh-remote/protocol'
import type { ConnectionController } from './connection-controller.js'
import type { ResolvedConfig } from './config.js'
import type { HostIdentity, IdentityStore, TrustedPeer } from './identity-store.js'
import type { SafeLogger } from './logging.js'
import type { PairingController } from './pairing-controller.js'
import { PairingError } from './pairing-controller.js'
import type { HostServerApi } from './server-api.js'
import { ServerApiError } from './server-api.js'
import type { AuthenticatedPeerChannel } from './types.js'

interface WebSocketLike {
  readonly readyState: number
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: unknown) => void) | null
  onclose: ((event: { code: number; reason: string }) => void) | null
  send(data: string): void
  close(code?: number, reason?: string): void
}

export type WebSocketFactory = (url: string) => WebSocketLike

interface PendingTunnel {
  connectionId: string
  membershipId: string
  peer: TrustedPeer
  noise: NoiseIkSession
  channel?: ServerNoiseChannel
}

export class HostServerConnection {
  private socket?: WebSocketLike
  private running?: Promise<void>
  private stopped = true
  private online = false
  private retryWake?: () => void
  private readonly tunnels = new Map<string, PendingTunnel>()
  private terminalError?: string
  private resumeQueued = false

  constructor(
    private readonly config: ResolvedConfig,
    private readonly identity: HostIdentity,
    private readonly identities: IdentityStore,
    private readonly api: HostServerApi,
    private readonly pairings: PairingController,
    private readonly connections: ConnectionController,
    private readonly logger: SafeLogger,
    private readonly createWebSocket: WebSocketFactory = url => new WebSocket(url) as unknown as WebSocketLike,
  ) {}

  start(): void {
    if (this.running !== undefined) return
    this.stopped = false
    this.running = this.run().finally(() => { this.running = undefined })
  }

  resume(): void {
    this.terminalError = undefined
    this.stopped = false
    if (this.running === undefined) {
      this.start()
      return
    }
    if (this.resumeQueued) return
    this.resumeQueued = true
    void this.running.finally(() => {
      this.resumeQueued = false
      if (!this.stopped) this.start()
    })
  }

  async stop(): Promise<void> {
    this.stopped = true
    this.retryWake?.()
    this.retryWake = undefined
    this.socket?.close(1000, 'plugin stopped')
    await this.running
    await this.dropTunnels()
  }

  isOnline(): boolean { return this.online }

  lastError(): string | undefined { return this.terminalError }

  private async run(): Promise<void> {
    let delayMs = this.config.reconnect.initialDelayMs
    while (!this.stopped) {
      try {
        await this.connectOnce()
        delayMs = this.config.reconnect.initialDelayMs
      } catch (error) {
        const code = errorCode(error)
        this.terminalError = code
        this.logger.warn('server control connection failed', { code, retryable: isRetryable(error) })
        if (TERMINAL_AUTH_ERRORS.has(code) || !this.config.reconnect.enabled) return
      }
      if (this.stopped) return
      await this.waitBeforeRetry(delayMs)
      delayMs = Math.min(this.config.reconnect.maxDelayMs, delayMs * 2)
    }
  }

  private async connectOnce(): Promise<void> {
    const credentials = await this.api.authenticate(this.identity)
    if (this.stopped) return
    const socket = this.createWebSocket(websocketUrl(this.api.baseUrl))
    this.socket = socket
    let acknowledged = false
    let messageQueue = Promise.resolve()
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const helloTimer = setTimeout(() => socket.close(4001, 'hello timeout'), 10_000)
      const finish = (error?: Error): void => {
        if (settled) return
        settled = true
        clearTimeout(helloTimer)
        this.online = false
        if (this.socket === socket) this.socket = undefined
        void this.dropTunnels().finally(() => error === undefined ? resolve() : reject(error))
      }
      socket.onopen = () => {
        this.sendControl('hello', {
          role: 'host',
          deviceId: this.identity.deviceId,
          accessToken: credentials.accessToken,
          protocols: [PROTOCOL_VERSION],
          capabilities: ['transport.relay'],
        })
      }
      socket.onmessage = event => {
        messageQueue = messageQueue.then(async () => {
          const frame = decodeControl(event.data)
          if (frame.type === 'hello.ack') {
            const payload = requireHelloAck(frame.payload)
            acknowledged = true
            clearTimeout(helloTimer)
            this.online = true
            this.terminalError = undefined
            this.logger.info('server control connection online', {
              serverVersion: payload.serverVersion,
              connectionSessionId: shortId(payload.connectionSessionId),
            })
            return
          }
          if (!acknowledged) throw new ControlConnectionError('INVALID_MESSAGE', 'Server sent a frame before hello.ack.')
          await this.handleFrame(frame)
        }).catch(error => {
          this.terminalError = errorCode(error)
          socket.close(4008, 'invalid control frame')
        })
      }
      socket.onerror = () => {
        if (!acknowledged) finish(new ControlConnectionError('CONNECTION_FAILED', 'Unable to open the Server WebSocket.'))
      }
      socket.onclose = event => {
        const close = async (): Promise<void> => {
          await messageQueue.catch(() => undefined)
          if (event.code === 4002) {
            try { await this.api.refreshCredentials() } catch (error) { finish(asError(error)); return }
          }
          if (event.code === 4004) { finish(new ControlConnectionError('DEVICE_REVOKED', 'The Server revoked this Host device.')); return }
          finish(acknowledged ? undefined : new ControlConnectionError(closeCode(event.code), event.reason || 'Server control connection closed.'))
        }
        void close()
      }
    })
  }

  private async handleFrame(frame: ReturnType<typeof parseControlFrame>): Promise<void> {
    if (frame.type === 'ping') {
      const nonce = objectValue(frame.payload, 'nonce')
      if (typeof nonce !== 'string') throw new ControlConnectionError('INVALID_MESSAGE', 'Control ping has no nonce.')
      this.sendControl('pong', { nonce })
      return
    }
    if (frame.type === 'pong') return
    if (frame.type === 'pairing.claimed') {
      try {
        this.pairings.receiveClaim(requirePairingClaim(frame.payload))
        this.logger.info('pairing claim awaiting local confirmation', {
          pairingId: shortId(objectValue(frame.payload, 'pairingId') as string),
          clientDeviceId: shortId((objectValue(frame.payload, 'client') as { deviceId: string }).deviceId),
        })
      } catch (error) {
        if (!(error instanceof PairingError)) throw error
        this.logger.warn('pairing claim rejected locally', { code: error.code })
      }
      return
    }
    if (frame.type === 'connect.incoming') {
      await this.handleConnectIncoming(requireConnectIncoming(frame.payload))
      return
    }
    if (frame.type === 'secure.handshake') {
      await this.handleHandshake(requireHandshake(frame.payload))
      return
    }
    if (frame.type === 'relay') {
      await this.handleRelay(requireRelay(frame.payload))
      return
    }
    if (frame.type === 'error') {
      const payload = requireControlError(frame.payload)
      this.terminalError = payload.code
      if (payload.code === 'DEVICE_REVOKED') {
        this.socket?.close(4004, 'device revoked')
      } else {
        this.logger.warn('server returned a control error', { code: payload.code, retryable: payload.retryable })
      }
      return
    }
    throw new ControlConnectionError('INVALID_MESSAGE', `Unexpected Server control frame: ${frame.type}`)
  }

  private async handleConnectIncoming(payload: ConnectIncomingPayload): Promise<void> {
    const peer = this.identities.trustedPeer(payload.clientDeviceId)
    if (peer === undefined || peer.publicKey !== payload.clientIdentityKey) {
      this.sendControl('connect.rejected', { connectionId: payload.connectionId })
      this.logger.warn('connection rejected by local trust', { clientDeviceId: shortId(payload.clientDeviceId) })
      return
    }
    let membershipId = peer.membershipId
    membershipId ??= await this.api.membershipFor(peer.deviceId)
    if (membershipId === undefined) {
      this.sendControl('connect.rejected', { connectionId: payload.connectionId })
      return
    }
    const previous = this.tunnels.get(payload.connectionId)
    previous?.noise.destroy()
    const noise = new NoiseIkSession({
      role: 'responder',
      localPrivateKey: this.identity.privateKey,
      localPublicKey: this.identity.publicKey,
      remotePublicKey: peer.publicKey,
      prologue: createNoisePrologue(payload.connectionId, this.identity.deviceId, peer.deviceId),
    })
    this.tunnels.set(payload.connectionId, { connectionId: payload.connectionId, membershipId, peer, noise })
    this.sendControl('connect.accepted', { connectionId: payload.connectionId })
  }

  private async handleHandshake(payload: SecureHandshakePayload): Promise<void> {
    const tunnel = this.tunnels.get(payload.connectionId)
    if (tunnel === undefined || payload.targetDeviceId !== this.identity.deviceId || payload.step !== 1 || tunnel.channel !== undefined) {
      throw new ControlConnectionError('SECURE_CHANNEL_FAILED', 'Noise IK handshake is not valid for this connection.')
    }
    tunnel.noise.readHandshake(fromBase64Url(payload.data))
    const reply = tunnel.noise.writeHandshake()
    if (!tunnel.noise.complete) throw new ControlConnectionError('SECURE_CHANNEL_FAILED', 'Noise IK handshake did not complete.')
    this.sendControl('secure.handshake', {
      connectionId: tunnel.connectionId,
      targetDeviceId: tunnel.peer.deviceId,
      step: 2,
      data: toBase64Url(reply),
    } satisfies SecureHandshakePayload)
    const channel = new ServerNoiseChannel(tunnel, ciphertext => this.sendRelay(tunnel, ciphertext), () => {
      if (this.tunnels.get(tunnel.connectionId) === tunnel) this.tunnels.delete(tunnel.connectionId)
    })
    tunnel.channel = channel
    await this.connections.accept(channel)
    this.logger.info('authenticated peer channel ready', {
      connectionId: shortId(tunnel.connectionId),
      peerDeviceId: shortId(tunnel.peer.deviceId),
      transport: 'Relay',
    })
  }

  private async handleRelay(payload: RelayPayload): Promise<void> {
    const tunnel = this.tunnels.get(payload.connectionId)
    if (tunnel?.channel === undefined || payload.targetDeviceId !== this.identity.deviceId) {
      throw new ControlConnectionError('CONNECTION_NOT_FOUND', 'Relay frame does not belong to an authenticated connection.')
    }
    try {
      tunnel.channel.receive(payload.counter, fromBase64Url(payload.ciphertext))
    } catch (error) {
      await tunnel.channel.close()
      throw new ControlConnectionError('SECURE_CHANNEL_FAILED', asError(error).message)
    }
  }

  private async sendRelay(tunnel: PendingTunnel, ciphertext: Uint8Array): Promise<void> {
    const counter = Number(tunnel.noise.sendingCounter() - 1n)
    if (!Number.isSafeInteger(counter) || counter < 0) throw new ControlConnectionError('FRAME_TOO_LARGE', 'Noise transport counter overflowed.')
    this.sendControl('relay', {
      connectionId: tunnel.connectionId,
      targetDeviceId: tunnel.peer.deviceId,
      counter,
      ciphertext: toBase64Url(ciphertext),
    } satisfies RelayPayload)
  }

  private sendControl(type: Parameters<typeof createControlFrame>[0], payload: unknown): void {
    const socket = this.socket
    if (socket === undefined || socket.readyState !== 1) throw new ControlConnectionError('CONNECTION_FAILED', 'Server control socket is not open.')
    socket.send(JSON.stringify(createControlFrame(type, payload)))
  }

  private async dropTunnels(): Promise<void> {
    const tunnels = [...this.tunnels.values()]
    this.tunnels.clear()
    await Promise.all(tunnels.map(async tunnel => {
      if (tunnel.channel !== undefined) await tunnel.channel.close()
      else tunnel.noise.destroy()
    }))
    await this.connections.close()
  }

  private waitBeforeRetry(baseDelay: number): Promise<void> {
    const spread = baseDelay * this.config.reconnect.jitter
    const delay = Math.max(0, Math.round(baseDelay - spread + Math.random() * spread * 2))
    return new Promise(resolve => {
      const timer = setTimeout(() => { this.retryWake = undefined; resolve() }, delay)
      this.retryWake = () => { clearTimeout(timer); resolve() }
    })
  }
}

const TERMINAL_AUTH_ERRORS = new Set([
  'ACCOUNT_AUTH_REQUIRED',
  'AUTH_INVALID',
  'DEVICE_OWNERSHIP_REQUIRED',
  'DEVICE_REVOKED',
  'TOKEN_EXPIRED',
])

class ServerNoiseChannel implements AuthenticatedPeerChannel {
  readonly security
  readonly peerDeviceId: string
  readonly peerIdentityKey: string
  readonly mode = 'Relay' as const
  private readonly handlers = new Set<(message: RemoteMessage) => void>()
  private closed = false

  constructor(
    private readonly tunnel: PendingTunnel,
    private readonly transmit: (ciphertext: Uint8Array) => Promise<void>,
    private readonly onClose: () => void,
  ) {
    this.security = {
      protocol: 'Noise_IK_25519_ChaChaPoly_SHA256' as const,
      connectionId: tunnel.connectionId,
      membershipId: tunnel.membershipId,
    }
    this.peerDeviceId = tunnel.peer.deviceId
    this.peerIdentityKey = tunnel.peer.publicKey
  }

  async send(message: RemoteMessage): Promise<void> {
    if (this.closed) throw new Error('secure channel is closed')
    await this.transmit(this.tunnel.noise.encrypt(encodeMessage(message)))
  }

  onMessage(handler: (message: RemoteMessage) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  receive(counter: number, ciphertext: Uint8Array): void {
    if (this.closed) return
    const expected = Number(this.tunnel.noise.receivingCounter())
    if (!Number.isSafeInteger(counter) || counter !== expected) {
      throw new ControlConnectionError('INVALID_MESSAGE', 'Relay counter is duplicated or out of order.')
    }
    const message = decodeMessage(this.tunnel.noise.decrypt(ciphertext))
    for (const handler of this.handlers) handler(message)
  }

  async close(_code?: string): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.handlers.clear()
    this.tunnel.noise.destroy()
    this.onClose()
  }
}

class ControlConnectionError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

function websocketUrl(baseUrl: string): string {
  const url = new URL(baseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws/v1/connect`
  return url.toString()
}

function decodeControl(data: unknown): ReturnType<typeof parseControlFrame> {
  if (typeof data !== 'string') throw new ControlConnectionError('INVALID_MESSAGE', 'Server control frames must be text JSON.')
  try { return parseControlFrame(JSON.parse(data)) } catch { throw new ControlConnectionError('INVALID_MESSAGE', 'Server sent an invalid control frame.') }
}

function requireHelloAck(value: unknown): HelloAckPayload {
  const payload = requireObject(value)
  if (payload.protocol !== PROTOCOL_VERSION || typeof payload.serverVersion !== 'string'
    || typeof payload.connectionSessionId !== 'string' || !Number.isSafeInteger(payload.heartbeatIntervalMs)
    || !Number.isSafeInteger(payload.maxControlFrameBytes) || !Number.isSafeInteger(payload.maxRelayFrameBytes)) {
    throw new ControlConnectionError('INVALID_MESSAGE', 'hello.ack payload is invalid.')
  }
  return payload as unknown as HelloAckPayload
}

function requirePairingClaim(value: unknown): PairingClaimedPayload {
  const payload = requireObject(value)
  const client = requireObject(payload.client)
  for (const item of [payload.pairingId, client.deviceId, client.name, client.platform, client.identityKey, client.fingerprint]) {
    if (typeof item !== 'string' || item.length === 0) throw new ControlConnectionError('INVALID_MESSAGE', 'pairing.claimed payload is invalid.')
  }
  return payload as unknown as PairingClaimedPayload
}

function requireConnectIncoming(value: unknown): ConnectIncomingPayload {
  const payload = requireObject(value)
  if (typeof payload.connectionId !== 'string' || typeof payload.clientDeviceId !== 'string'
    || typeof payload.clientIdentityKey !== 'string' || !Array.isArray(payload.preferredTransports)) {
    throw new ControlConnectionError('INVALID_MESSAGE', 'connect.incoming payload is invalid.')
  }
  return payload as unknown as ConnectIncomingPayload
}

function requireHandshake(value: unknown): SecureHandshakePayload {
  const payload = requireObject(value)
  if (typeof payload.connectionId !== 'string' || typeof payload.targetDeviceId !== 'string'
    || !Number.isSafeInteger(payload.step) || typeof payload.data !== 'string') {
    throw new ControlConnectionError('INVALID_MESSAGE', 'secure.handshake payload is invalid.')
  }
  return payload as unknown as SecureHandshakePayload
}

function requireRelay(value: unknown): RelayPayload {
  const payload = requireObject(value)
  if (typeof payload.connectionId !== 'string' || typeof payload.targetDeviceId !== 'string'
    || !Number.isSafeInteger(payload.counter) || typeof payload.ciphertext !== 'string') {
    throw new ControlConnectionError('INVALID_MESSAGE', 'relay payload is invalid.')
  }
  return payload as unknown as RelayPayload
}

function requireControlError(value: unknown): ControlErrorPayload {
  const payload = requireObject(value)
  if (typeof payload.code !== 'string' || typeof payload.message !== 'string') {
    throw new ControlConnectionError('INVALID_MESSAGE', 'error payload is invalid.')
  }
  return payload as unknown as ControlErrorPayload
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ControlConnectionError('INVALID_MESSAGE', 'Control payload must be an object.')
  }
  return value as Record<string, unknown>
}

function objectValue(value: unknown, key: string): unknown { return requireObject(value)[key] }
function shortId(value: string): string { return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}` }
function asError(error: unknown): Error { return error instanceof Error ? error : new Error('Unknown Server connection error.') }
function errorCode(error: unknown): string { return error instanceof ServerApiError || error instanceof ControlConnectionError ? error.code : 'CONNECTION_FAILED' }
function isRetryable(error: unknown): boolean { return error instanceof ServerApiError ? error.retryable : errorCode(error) !== 'DEVICE_REVOKED' }
function closeCode(code: number): string {
  if (code === 4002) return 'AUTH_INVALID'
  if (code === 4004) return 'DEVICE_REVOKED'
  if (code === 4007) return 'RATE_LIMITED'
  if (code === 4011) return 'UNSUPPORTED_VERSION'
  return 'CONNECTION_FAILED'
}
