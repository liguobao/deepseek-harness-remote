import type { RemoteMessage } from '@dsh-remote/protocol'
import type { IdentityStore } from './identity-store.js'
import type { RpcRouter } from './rpc-router.js'
import type { AuthenticatedPeerChannel } from './types.js'

interface ActiveConnection {
  channel: AuthenticatedPeerChannel
  unsubscribe: () => void
}

export class ConnectionController {
  private active?: ActiveConnection

  constructor(
    private readonly identities: IdentityStore,
    private readonly router: RpcRouter,
  ) {}

  async accept(channel: AuthenticatedPeerChannel): Promise<void> {
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
    const previous = this.active
    if (previous !== undefined) {
      previous.unsubscribe()
      await previous.channel.close('CONNECTION_REPLACED')
      await this.router.closePeerStreams()
    }
    const connection: ActiveConnection = {
      channel,
      unsubscribe: () => undefined,
    }
    connection.unsubscribe = channel.onMessage(message => { void this.handle(connection, message) })
    this.active = connection
  }

  isOnline(): boolean { return this.active !== undefined }

  peerDeviceId(): string | undefined { return this.active?.channel.peerDeviceId }

  connectionMode(): 'LAN' | 'P2P' | 'TURN' | 'Relay' | 'Disconnected' {
    return this.active?.channel.mode ?? (this.active === undefined ? 'Disconnected' : 'Relay')
  }

  async send(message: RemoteMessage): Promise<void> {
    const active = this.active
    if (active === undefined) return
    try {
      await active.channel.send(message)
    } catch {
      await this.disconnect(active)
    }
  }

  async revoke(deviceId: string): Promise<void> {
    if (this.active?.channel.peerDeviceId === deviceId) await this.disconnect(this.active, 'DEVICE_REVOKED')
  }

  async close(): Promise<void> {
    if (this.active !== undefined) await this.disconnect(this.active)
  }

  private async handle(connection: ActiveConnection, message: RemoteMessage): Promise<void> {
    if (this.active !== connection) return
    try {
      const response = await this.router.handle(message)
      if (this.active !== connection) return
      console.error('[stream-debug] sending response', (message.payload as { method?: string })?.method)
      await connection.channel.send(response)
      console.error('[stream-debug] response sent', (message.payload as { method?: string })?.method)
    } catch {
      await this.disconnect(connection)
    }
  }

  private async disconnect(connection: ActiveConnection, code?: string): Promise<void> {
    if (this.active !== connection) return
    this.active = undefined
    connection.unsubscribe()
    await this.router.closePeerStreams()
    await connection.channel.close(code)
  }
}

export class ConnectionRejectedError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}
