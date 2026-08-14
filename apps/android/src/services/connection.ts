import { RemoteClientCore, type EventPayload } from '@dsh-remote/client-core'
import type { PermissionDecision } from '@dsh-remote/protocol'
import { RelayTransport } from '@dsh-remote/webrtc'
import { websocketUrl } from '../lib/server-url'
import type {
  DeviceIdentity,
  RemoteDevice,
  RemoteSession,
  SystemInfo,
  WorkspaceInfo,
} from '../types'
import { SecureTransport } from './secure-transport'

export type RemoteEventHandler = (event: EventPayload) => void

export class AndroidRemoteConnection {
  private core?: RemoteClientCore
  private unsubscribeEvent?: () => void

  async connect(
    baseUrl: string,
    identity: DeviceIdentity,
    host: RemoteDevice,
    accessToken: string,
    onEvent: RemoteEventHandler,
  ): Promise<void> {
    await this.close()
    const relay = new RelayTransport(
      websocketUrl(baseUrl),
      {
        role: 'client',
        deviceId: identity.deviceId,
        accessToken,
        targetDeviceId: host.deviceId,
        capabilities: ['transport.relay'],
        preferredTransports: ['relay'],
      },
    )
    const secure = new SecureTransport(relay, identity, host)
    const core = new RemoteClientCore(secure, 20_000)
    this.core = core
    this.unsubscribeEvent = core.onEvent(onEvent)
    await core.connect()
    await core.rpc('connection.ping', {})
  }

  systemInfo(): Promise<SystemInfo> {
    return this.requireCore().rpc<SystemInfo>('system.info', {})
  }

  workspace(): Promise<WorkspaceInfo> {
    return this.requireCore().rpc<WorkspaceInfo>('workspace.get', {})
  }

  sessions(): Promise<RemoteSession[]> {
    return this.requireCore().rpc<RemoteSession[]>('sessions.list', {})
  }

  session(sessionId: string): Promise<RemoteSession> {
    return this.requireCore().rpc<RemoteSession, { sessionId: string }>('sessions.get', { sessionId })
  }

  createSession(cwd?: string): Promise<RemoteSession> {
    return this.requireCore().rpc<RemoteSession, { cwd?: string }>('sessions.create', { cwd })
  }

  async sendMessage(sessionId: string, text: string): Promise<void> {
    await this.requireCore().rpc('session.send', { sessionId, text })
  }

  async stop(sessionId: string): Promise<void> {
    await this.requireCore().rpc('session.stop', { sessionId })
  }

  async respondPermission(sessionId: string, requestId: string, decision: PermissionDecision): Promise<void> {
    await this.requireCore().rpc('permissions.respond', { sessionId, requestId, decision })
  }

  getStats() {
    return this.core?.getStats?.()
  }

  async close(): Promise<void> {
    this.unsubscribeEvent?.()
    this.unsubscribeEvent = undefined
    const core = this.core
    this.core = undefined
    if (core !== undefined) await core.close()
  }

  private requireCore(): RemoteClientCore {
    if (this.core === undefined) throw new Error('Connect to the host first.')
    return this.core
  }
}
