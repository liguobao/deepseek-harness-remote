import { randomUUID } from 'node:crypto'
import { RpcId, type ApiProxy } from '@deepseek-ai/dsh-host-apiproxy/api'
import { createEvent } from '@dsh-remote/protocol'
import { ConnectionController } from './connection-controller.js'
import type { ResolvedConfig } from './config.js'
import type { HostIdentity, IdentityStore } from './identity-store.js'
import {
  normalizeHarnessVersion,
  readHarnessDistributionVersion,
  selectHarnessVersion,
} from './harness-version.js'
import type { SafeLogger } from './logging.js'
import { RpcRouter } from './rpc-router.js'
import { RemoteFileViewerBridge, type FileViewerHostServiceLike } from './file-viewer-bridge.js'
import { HostServerApi, ServerApiError, type DeviceAuthorization } from './server-api.js'
import { HostServerConnection } from './server-connection.js'
import { ServerCredentialStore } from './server-credentials.js'
import { HarnessApiBridge, type TypertGatewayLike } from './harness-api-bridge.js'
import { loadWeriftFactory } from './werift-rtc.js'
import type { AuthenticatedPeerChannel } from './types.js'

export interface HostRemoteStatus {
  deviceId?: string
  configured: boolean
  online: boolean
  reconnecting: boolean
  lastActiveAt?: number
  error?: string
  account?: string
  authorized: boolean
  accountRequired: boolean
}

export class HostPluginRuntime {
  readonly connections: ConnectionController
  private identity?: HostIdentity
  private readonly serverApi?: HostServerApi
  private serverConnection?: HostServerConnection
  private harnessVersion?: string
  private closed = false

  constructor(
    private readonly config: ResolvedConfig,
    private readonly identities: IdentityStore,
    private readonly apiProxy: ApiProxy,
    private readonly logger: SafeLogger,
    typertGateway?: () => TypertGatewayLike | undefined,
    private readonly fileViewerHost?: () => FileViewerHostServiceLike | undefined,
  ) {
    this.connections = new ConnectionController(this.identities, (_context, send) => {
      const harnessApi = new HarnessApiBridge(
        this.apiProxy,
        (event, data) => send(createEvent(event, data)),
        undefined,
        this.logger,
        typertGateway?.(),
        this.harnessVersion,
      )
      const fileViewer = new RemoteFileViewerBridge(
        () => this.fileViewerHost?.(),
        this.logger,
      )
      return new RpcRouter(harnessApi, undefined, this.logger, fileViewer)
    }, this.logger)
    if (config.serverUrl !== undefined) {
      this.serverApi = new HostServerApi(config.serverUrl, new ServerCredentialStore(identities.directory))
    }
  }

  async start(): Promise<void> {
    if (this.closed) throw new Error('remote runtime is closed')
    this.identity = await this.identities.loadOrCreate(this.config.deviceName)
    this.logger.info('host identity ready', {
      deviceId: shortId(this.identity.deviceId),
      fingerprint: this.identity.fingerprint,
      server: this.config.serverUrl ?? 'not configured',
    })
    if (this.serverApi !== undefined) {
      this.harnessVersion = await this.readHarnessVersion()
      this.serverApi.setHarnessVersion(this.harnessVersion)
      this.serverApi.bindIdentity(this.identity)
      this.serverConnection = this.createServerConnection(this.identity)
      this.serverConnection.start()
    }
  }

  currentIdentity(): HostIdentity {
    if (this.identity === undefined) throw new Error('remote runtime has not started')
    return this.identity
  }

  acceptAuthenticatedPeer(channel: AuthenticatedPeerChannel): Promise<void> {
    this.currentIdentity()
    return this.connections.accept(channel)
  }

  hostStatus(): HostRemoteStatus {
    const error = this.serverConnection?.lastError()
    const authorization = this.serverApi?.currentAuthorization()
    return {
      ...(this.identity === undefined ? {} : { deviceId: this.identity.deviceId }),
      configured: this.serverApi !== undefined,
      online: this.serverConnection?.isOnline() ?? false,
      reconnecting: this.serverConnection?.isReconnecting() ?? false,
      ...(this.serverConnection?.lastActivity() === undefined
        ? {}
        : { lastActiveAt: this.serverConnection.lastActivity() }),
      ...(error === undefined ? {} : { error }),
      ...(authorization?.account === undefined ? {} : { account: authorization.account }),
      authorized: authorization !== undefined,
      accountRequired: error === 'ACCOUNT_AUTH_REQUIRED' || error === 'AUTH_INVALID' || error === 'TOKEN_EXPIRED',
    }
  }

  reconnectHost(): void {
    if (this.closed) throw new Error('remote runtime is closed')
    if (this.serverConnection === undefined) {
      throw new ServerApiError('SERVER_NOT_CONFIGURED', 'Configure serverUrl before reconnecting.', false)
    }
    this.serverConnection.reconnect()
  }

  async clearHostAuthorization(): Promise<void> {
    await this.serverConnection?.stop()
    await this.serverApi?.revokeCurrentDevice()
    this.identity = await this.identities.reset(this.config.deviceName)
    this.serverApi?.bindIdentity(this.identity)
    if (this.serverApi !== undefined) this.serverConnection = this.createServerConnection(this.identity)
    this.logger.info('Host authorization cleared')
  }

  async authorizeHostAsOwned(accessToken: string, account?: string): Promise<DeviceAuthorization> {
    if (this.serverApi === undefined) {
      throw new ServerApiError('SERVER_NOT_CONFIGURED', 'Configure serverUrl before enabling Host access.', false)
    }
    let result
    try {
      result = await this.serverApi.authorizeOwnedRole(this.currentIdentity(), accessToken, account)
    } catch (error) {
      if (!(error instanceof ServerApiError) || error.code !== 'DEVICE_REVOKED') throw error
      await this.serverConnection?.stop()
      this.identity = await this.identities.reset(this.config.deviceName)
      this.serverApi.bindIdentity(this.identity)
      this.serverConnection = this.createServerConnection(this.identity)
      result = await this.serverApi.authorizeOwnedRole(this.identity, accessToken, account)
      this.logger.info('Rotated revoked Host identity before owned-device authorization')
    }
    this.serverConnection?.resume()
    this.logger.info('Host authorized as an owned device')
    return result
  }

  async authorizeHostWithAccount(email: string, password: string): Promise<DeviceAuthorization> {
    if (this.serverApi === undefined) {
      throw new ServerApiError('SERVER_NOT_CONFIGURED', 'Configure serverUrl before signing in.', false)
    }
    const result = await this.serverApi.authorizeWithAccount(this.currentIdentity(), email, password)
    this.serverConnection?.resume()
    this.logger.info('Host account authorized')
    return result
  }

  async authorizeHostWithCode(code: string): Promise<DeviceAuthorization> {
    if (this.serverApi === undefined) {
      throw new ServerApiError('SERVER_NOT_CONFIGURED', 'Configure serverUrl before entering a Host registration code.', false)
    }
    const result = await this.serverApi.authorizeHostWithCode(this.currentIdentity(), code)
    this.serverConnection?.resume()
    this.logger.info('Host registration code authorized')
    return result
  }

  async revokePeer(deviceId: string): Promise<boolean> {
    const revoked = await this.identities.revokePeer(deviceId)
    if (revoked) await this.connections.revoke(deviceId)
    return revoked
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.serverConnection?.stop()
    await this.connections.close()
    this.logger.info('host runtime stopped')
  }

  diagnostics() {
    return {
      loaded: this.identity !== undefined,
      deviceId: this.identity === undefined ? undefined : shortId(this.identity.deviceId),
      identityValid: this.identity !== undefined,
      serverConfigured: this.config.serverUrl !== undefined,
      serverOnline: this.serverConnection?.isOnline() ?? false,
      serverError: this.serverConnection?.lastError(),
      online: this.connections.isOnline(),
      activeConnections: this.connections.connectionCount(),
      peerDeviceId: this.connections.peerDeviceId() === undefined ? undefined : shortId(this.connections.peerDeviceId()!),
      peerDeviceIds: this.connections.peerDeviceIds().map(shortId),
      trustedPeers: this.identities.listTrustedPeers().length,
    }
  }

  private createServerConnection(identity: HostIdentity): HostServerConnection {
    return new HostServerConnection(
      this.config,
      identity,
      this.identities,
      this.serverApi!,
      this.connections,
      this.logger,
      undefined,
      this.config.forceRelay
        ? undefined
        : () => loadWeriftFactory({ routeTargets: this.config.serverUrl === undefined ? [] : [this.config.serverUrl] }),
      () => this.fileViewerHost?.() === undefined
        ? ['harness.api.v1']
        : ['harness.api.v1', 'fileviewer.read.v1'],
      this.harnessVersion,
    )
  }

  private async readHarnessVersion(): Promise<string | undefined> {
    let reportedVersion: string | undefined
    let errorCode: string | undefined
    try {
      const response = await this.apiProxy.host.describe({ rpcId: RpcId(randomUUID()), payload: {} })
      if (!response.result.ok) {
        errorCode = response.result.error.code
      } else {
        reportedVersion = normalizeHarnessVersion(response.result.value.version)
      }
    } catch {
      // Older Harness builds may not expose host.describe.
    }
    const distributionVersion = reportedVersion === undefined || reportedVersion === '0.0.1'
      ? await readHarnessDistributionVersion()
      : undefined
    const version = selectHarnessVersion(reportedVersion, distributionVersion)
    if (version !== undefined) return version
    this.logger.warn('Harness version is unavailable', errorCode === undefined ? undefined : { code: errorCode })
    return undefined
  }
}

function shortId(value: string): string { return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}` }
