import type { RemoteMessage } from '@dsh-remote/protocol'
import type { IdentityStore } from './identity-store.js'
import type { SafeLogger } from './logging.js'
import type { RpcRouter } from './rpc-router.js'
import type { AuthenticatedPeerChannel } from './types.js'

interface ActiveConnection {
  channel: AuthenticatedPeerChannel
  router: RpcRouter
  unsubscribe: () => void
}

export interface PeerConnectionContext {
  connectionId: string
  peerDeviceId: string
}

export type RpcRouterFactory = (
  context: PeerConnectionContext,
  send: (message: RemoteMessage) => Promise<void>,
) => RpcRouter

export class ConnectionController {
  private readonly active = new Map<string, ActiveConnection>()
  private acceptQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly identities: IdentityStore,
    private readonly createRouter: RpcRouterFactory,
    private readonly logger?: SafeLogger,
  ) {}

  accept(channel: AuthenticatedPeerChannel): Promise<void> {
    const operation = this.acceptQueue.then(() => this.acceptOne(channel))
    this.acceptQueue = operation.catch(() => undefined)
    return operation
  }

  private async acceptOne(channel: AuthenticatedPeerChannel): Promise<void> {
    if (channel.security?.protocol !== 'Noise_IK_25519_ChaChaPoly_SHA256'
      || channel.security.connectionId === ''
      || channel.security.membershipId === '') {
      await channel.close('SECURE_CHANNEL_FAILED')
      throw new ConnectionRejectedError('SECURE_CHANNEL_FAILED', 'The channel is missing its authenticated Noise or membership context.')
    }
    if (!this.identities.isTrusted(channel.peerDeviceId, channel.peerIdentityKey)) {
      await channel.close('PEER_IDENTITY_MISMATCH')
      throw new ConnectionRejectedError('PEER_IDENTITY_MISMATCH', 'The peer identity does not match local trust.')
    }
    const connectionId = channel.security.connectionId
    const connectionConflict = this.active.get(connectionId)
    if (connectionConflict !== undefined && connectionConflict.channel.peerDeviceId !== channel.peerDeviceId) {
      await channel.close('SECURE_CHANNEL_FAILED')
      throw new ConnectionRejectedError('SECURE_CHANNEL_FAILED', 'The connection id is already bound to another peer.')
    }

    const replaced = [...this.active.values()].filter(connection => (
      connection.channel.peerDeviceId === channel.peerDeviceId
      || connection.channel.security.connectionId === connectionId
    ))
    if (replaced.length > 0) {
      this.logger?.warn('replacing active peer connection', {
        peerDeviceId: shortId(channel.peerDeviceId),
        replacedCount: replaced.length,
        replacedPeerDeviceIds: replaced.map(connection => shortId(connection.channel.peerDeviceId)),
      })
    }
    await Promise.all(replaced.map(connection => this.disconnect(connection, 'CONNECTION_REPLACED')))

    const router = this.createRouter(
      { connectionId, peerDeviceId: channel.peerDeviceId },
      message => this.sendTo(connectionId, channel, message),
    )
    const connection: ActiveConnection = {
      channel,
      router,
      unsubscribe: () => undefined,
    }
    this.active.set(connectionId, connection)
    try {
      connection.unsubscribe = channel.onMessage(message => { void this.handle(connection, message) })
    } catch (error) {
      await this.disconnect(connection)
      throw error
    }
    this.logger?.info('peer connection accepted', {
      peerDeviceId: shortId(channel.peerDeviceId),
      connectionId: shortId(connectionId),
      mode: channel.mode,
    })
  }

  isOnline(): boolean { return this.active.size > 0 }

  connectionCount(): number { return this.active.size }

  peerDeviceIds(): string[] {
    return [...new Set([...this.active.values()].map(connection => connection.channel.peerDeviceId))]
  }

  peerDeviceId(): string | undefined {
    const peers = this.peerDeviceIds()
    return peers.length === 1 ? peers[0] : undefined
  }

  connectionMode(): 'LAN' | 'P2P' | 'TURN' | 'Relay' | 'Disconnected' {
    const connection = this.active.values().next().value as ActiveConnection | undefined
    return connection?.channel.mode ?? (connection === undefined ? 'Disconnected' : 'Relay')
  }

  async send(message: RemoteMessage): Promise<void> {
    await Promise.all([...this.active.values()].map(connection => this.sendConnection(connection, message)))
  }

  async revoke(deviceId: string): Promise<void> {
    const revoked = [...this.active.values()].filter(connection => connection.channel.peerDeviceId === deviceId)
    await Promise.all(revoked.map(connection => this.disconnect(connection, 'DEVICE_REVOKED')))
  }

  async close(): Promise<void> {
    await this.acceptQueue
    await Promise.all([...this.active.values()].map(connection => this.disconnect(connection)))
  }

  private async handle(connection: ActiveConnection, message: RemoteMessage): Promise<void> {
    if (!this.isActive(connection)) return
    try {
      const response = await connection.router.handle(message)
      if (!this.isActive(connection)) return
      await connection.channel.send(response)
    } catch (error) {
      this.logger?.warn('peer message handling failed; disconnecting', {
        peerDeviceId: shortId(connection.channel.peerDeviceId),
        reason: diagnosticReason(error),
      })
      await this.disconnect(connection)
    }
  }

  private async sendTo(connectionId: string, channel: AuthenticatedPeerChannel, message: RemoteMessage): Promise<void> {
    const connection = this.active.get(connectionId)
    if (connection === undefined || connection.channel !== channel) return
    await this.sendConnection(connection, message)
  }

  private async sendConnection(connection: ActiveConnection, message: RemoteMessage): Promise<void> {
    if (!this.isActive(connection)) return
    try {
      await connection.channel.send(message)
    } catch (error) {
      this.logger?.warn('peer send failed; disconnecting', {
        peerDeviceId: shortId(connection.channel.peerDeviceId),
        messageType: message.type,
        reason: diagnosticReason(error),
      })
      await this.disconnect(connection)
    }
  }

  private async disconnect(connection: ActiveConnection, code?: string): Promise<void> {
    if (!this.isActive(connection)) return
    this.active.delete(connection.channel.security.connectionId)
    connection.unsubscribe()
    try {
      await connection.router.closePeerStreams()
    } finally {
      await connection.channel.close(code)
    }
    this.logger?.info('peer connection disconnected', {
      peerDeviceId: shortId(connection.channel.peerDeviceId),
      connectionId: shortId(connection.channel.security.connectionId),
      code: code ?? 'closed',
    })
  }

  private isActive(connection: ActiveConnection): boolean {
    return this.active.get(connection.channel.security.connectionId) === connection
  }
}

export class ConnectionRejectedError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

function diagnosticReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[\r\n]+/g, ' ').slice(0, 160) || 'Unknown peer connection failure.'
}

function shortId(value: string): string { return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}` }
