import type { ApiProxy, RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import { RemoteClientCore } from '@dsh-remote/client-core'
import { AdaptiveTransport } from '@dsh-remote/webrtc'
import { ApiProxySwitch, type HarnessMode } from './api-proxy-switch.js'
import { ClientSecureTransport } from './client-secure-transport.js'
import type { ResolvedConfig } from './config.js'
import type { HostIdentity, IdentityStore, TrustedPeer } from './identity-store.js'
import type { SafeLogger } from './logging.js'
import { RemoteHarnessApiProxy } from './remote-api-proxy.js'
import { ClientServerApi, type AuthorizedPeerDevice, type ServerHostDevice } from './server-api.js'

interface ConnectedRemote {
  client: RemoteClientCore
  target: TrustedPeer
}

export interface RemoteDirectoryEntry {
  name: string
  path: string
  hidden: boolean
}

export interface RemoteDirectoryListing {
  path: string
  home: string
  crumbs: RemoteDirectoryEntry[]
  entries: RemoteDirectoryEntry[]
  truncated: boolean
}

export interface RemoteWorkspaceView {
  workspaceId: string
  path: string
  title: string
}

export interface RemoteDeviceView {
  deviceId: string
  name: string
  platform: string
  membershipId: string
  online: boolean
  lastSeenAt?: number
}

export interface HostConnectionRpc {
  handle(
    channel: string,
    handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<RpcResult<unknown>>,
    options: { authority: 'loopback' | 'trusted-host' },
  ): () => Promise<void>
}

export interface HostConnectionHandle { rpc: HostConnectionRpc }

export interface HostAuthorizationControl {
  hostStatus(): {
    configured: boolean
    online: boolean
    reconnecting: boolean
    lastActiveAt?: number
    error?: string
    account?: string
    accountRequired: boolean
  }
  reconnectHost(): void
  authorizeHostWithAccount(email: string, password: string): Promise<unknown>
  authorizeHostWithCode(code: string): Promise<unknown>
}

export class ClientModeRuntime {
  private identity?: HostIdentity
  private connected?: ConnectedRemote
  private readonly proxySwitch: ApiProxySwitch
  private closed = false

  constructor(
    private readonly config: ResolvedConfig,
    private readonly identities: IdentityStore,
    private readonly server: ClientServerApi,
    apiProxy: ApiProxy,
    private readonly logger: SafeLogger,
    private readonly host?: HostAuthorizationControl,
  ) {
    this.proxySwitch = new ApiProxySwitch(apiProxy)
  }

  async start(): Promise<void> {
    if (this.closed) throw new Error('client remote-mode runtime is closed')
    this.identity = await this.identities.loadOrCreate(this.config.deviceName)
    this.server.bindIdentity(this.identity)
    this.proxySwitch.install()
    this.logger.info('client remote-mode identity ready', {
      deviceId: shortId(this.identity.deviceId),
      fingerprint: this.identity.fingerprint,
    })
  }

  registerControl(connection: HostConnectionHandle): () => Promise<void> {
    return connection.rpc.handle('/remote', (endpoint, payload, signal) => this.handleControl(endpoint, payload, signal), {
      authority: 'loopback',
    })
  }

  status(): Record<string, unknown> {
    return {
      available: this.config.serverUrl !== undefined,
      identityReady: this.identity !== undefined,
      deviceId: this.identity?.deviceId,
      serverUrl: this.config.serverUrl,
      ...this.proxySwitch.status(),
      connected: this.connected !== undefined,
      transport: this.connected?.client.getStats().mode ?? 'Disconnected',
      hostAuthorizationAvailable: this.host !== undefined,
      ...(this.host === undefined ? {} : { host: this.host.hostStatus() }),
    }
  }

  async devices(): Promise<RemoteDeviceView[]> {
    this.requireIdentity()
    const serverDevices = await this.server.listDevices()
    return Promise.all(serverDevices.map(async device => {
      await this.authorizeHostPeer(device)
      const presence = await this.server.presenceFor(device.deviceId).catch(() => ({ online: false }))
      return { ...device, ...presence }
    }))
  }

  async authorizeClientWithAccount(email: string, password: string): Promise<unknown> {
    const authorization = await this.server.authorizeWithAccount(this.requireIdentity(), email, password)
    this.logger.info('Client account authorized')
    return authorization
  }

  async setMode(mode: HarnessMode, targetDeviceId?: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    if (mode === 'local') {
      this.proxySwitch.selectLocal()
      const previous = this.connected
      this.connected = undefined
      await previous?.client.close().catch(() => undefined)
      this.logger.info('Harness target switched', { mode: 'local' })
      return this.status()
    }
    if (targetDeviceId === undefined || targetDeviceId.length === 0) {
      throw new ClientModeError('INVALID_MESSAGE', 'A targetDeviceId is required for remote mode.')
    }
    const next = await this.connect(targetDeviceId, signal)
    const previous = this.connected
    this.connected = next
    const remoteApi = new RemoteHarnessApiProxy(next.client).api
    this.proxySwitch.selectRemote(remoteApi, { deviceId: next.target.deviceId, name: next.target.name })
    await previous?.client.close().catch(() => undefined)
    this.logger.info('Harness target switched', { mode: 'remote', targetDeviceId: shortId(next.target.deviceId) })
    return this.status()
  }

  async listRemoteDirectory(targetDeviceId: string, path?: string, signal?: AbortSignal): Promise<RemoteDirectoryListing> {
    const remote = await this.ensureConnected(targetDeviceId, signal)
    const api = new RemoteHarnessApiProxy(remote.client).api
    const response = await api.host.listDirectory({
      rpcId: `remote-directory-${Date.now()}` as never,
      payload: path === undefined ? {} : { path },
    }, signal ?? new AbortController().signal)
    return unwrapNativeResult<RemoteDirectoryListing>(response)
  }

  async listRemoteWorkspaces(targetDeviceId: string, signal?: AbortSignal): Promise<RemoteWorkspaceView[]> {
    const remote = await this.ensureConnected(targetDeviceId, signal)
    const api = new RemoteHarnessApiProxy(remote.client).api
    const response = await api.workspace.list({
      rpcId: `remote-workspaces-${Date.now()}` as never,
      payload: {},
    })
    const value = unwrapNativeResult<{ items: RemoteWorkspaceView[] }>(response)
    return value.items
  }

  async openRemoteWorkspace(targetDeviceId: string, path: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    if (path.trim() === '') throw new ClientModeError('INVALID_MESSAGE', 'A remote working directory is required.')
    const remote = await this.ensureConnected(targetDeviceId, signal)
    const api = new RemoteHarnessApiProxy(remote.client).api
    const response = await api.workspace.create({
      rpcId: `remote-workspace-${Date.now()}` as never,
      payload: { path },
    })
    const workspace = unwrapNativeResult<{ workspace: unknown; created: boolean }>(response)
    this.proxySwitch.selectRemote(api, { deviceId: remote.target.deviceId, name: remote.target.name })
    this.logger.info('Remote workspace opened', { targetDeviceId: shortId(remote.target.deviceId) })
    return { ...this.status(), workspace }
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.proxySwitch.selectLocal()
    await this.connected?.client.close().catch(() => undefined)
    this.connected = undefined
    this.proxySwitch.restore()
  }

  private async connect(targetDeviceId: string, signal?: AbortSignal): Promise<ConnectedRemote> {
    signal?.throwIfAborted()
    const identity = this.requireIdentity()
    const serverDevice = (await this.server.listDevices()).find(device => device.deviceId === targetDeviceId)
    if (serverDevice === undefined) {
      throw new ClientModeError('MEMBERSHIP_REQUIRED', 'The selected Host is not authorized for this account.')
    }
    const target = await this.authorizeHostPeer(serverDevice)
    const presence = await this.server.presenceFor(targetDeviceId)
    if (!presence.online) throw new ClientModeError('HOST_OFFLINE', 'The selected Host is offline.', true)
    const credentials = await this.server.authenticate(identity)
    const transport = new AdaptiveTransport(websocketUrl(this.server.baseUrl), {
      role: 'client',
      deviceId: identity.deviceId,
      accessToken: credentials.accessToken,
      targetDeviceId,
      forceRelay: this.config.forceRelay,
      preferredTransports: this.config.forceRelay ? ['relay'] : ['p2p', 'turn', 'relay'],
      fetchIceServers: async connectionId => this.server.turnCredentials(connectionId),
    })
    const client = new RemoteClientCore(new ClientSecureTransport(transport, identity, target), 60_000)
    try {
      await client.connect()
      signal?.throwIfAborted()
      client.onClose(() => {
        if (this.connected?.client !== client) return
        this.connected = undefined
        this.proxySwitch.selectLocal()
        void client.close().catch(() => undefined)
        this.logger.warn('remote Harness transport closed; falling back to local mode', {
          targetDeviceId: shortId(target.deviceId),
        })
      })
      return { client, target }
    } catch (error) {
      await client.close().catch(() => undefined)
      throw error
    }
  }

  private async ensureConnected(targetDeviceId: string, signal?: AbortSignal): Promise<ConnectedRemote> {
    if (this.connected?.target.deviceId === targetDeviceId) return this.connected
    const next = await this.connect(targetDeviceId, signal)
    const previous = this.connected
    this.connected = next
    await previous?.client.close().catch(() => undefined)
    return next
  }

  async handleControl(endpoint: string, payload: unknown, signal: AbortSignal): Promise<RpcResult<unknown>> {
    try {
      if (endpoint === 'status') return ok(this.status())
      if (endpoint === 'devices') return ok(await this.devices())
      if (endpoint === 'client.account.login') {
        const value = record(payload)
        if (typeof value.email !== 'string' || typeof value.password !== 'string') {
          throw new ClientModeError('INVALID_MESSAGE', 'Email and password are required.')
        }
        return ok(await this.authorizeClientWithAccount(value.email, value.password))
      }
      if (endpoint === 'directory.list') {
        const value = record(payload)
        if (typeof value.targetDeviceId !== 'string') throw new ClientModeError('INVALID_MESSAGE', 'A Host is required.')
        return ok(await this.listRemoteDirectory(
          value.targetDeviceId,
          typeof value.path === 'string' ? value.path : undefined,
          signal,
        ))
      }
      if (endpoint === 'workspaces.list') {
        const value = record(payload)
        if (typeof value.targetDeviceId !== 'string') throw new ClientModeError('INVALID_MESSAGE', 'A Host is required.')
        return ok(await this.listRemoteWorkspaces(value.targetDeviceId, signal))
      }
      if (endpoint === 'workspace.open') {
        const value = record(payload)
        if (typeof value.targetDeviceId !== 'string' || typeof value.path !== 'string') {
          throw new ClientModeError('INVALID_MESSAGE', 'A Host and working directory are required.')
        }
        return ok(await this.openRemoteWorkspace(value.targetDeviceId, value.path, signal))
      }
      if (endpoint === 'host.account.login') {
        if (this.host === undefined) throw new ClientModeError('METHOD_NOT_ALLOWED', 'This plugin is not running as a Host.')
        const value = record(payload)
        if (typeof value.email !== 'string' || typeof value.password !== 'string') {
          throw new ClientModeError('INVALID_MESSAGE', 'Email and password are required.')
        }
        return ok(await this.host.authorizeHostWithAccount(value.email, value.password))
      }
      if (endpoint === 'host.registration-code.submit') {
        if (this.host === undefined) throw new ClientModeError('METHOD_NOT_ALLOWED', 'This plugin is not running as a Host.')
        const value = record(payload)
        if (typeof value.code !== 'string' || value.code.trim() === '') {
          throw new ClientModeError('INVALID_MESSAGE', 'A Host registration code is required.')
        }
        return ok(await this.host.authorizeHostWithCode(value.code))
      }
      if (endpoint === 'mode.set') {
        const value = record(payload)
        if (value.mode !== 'local' && value.mode !== 'remote') throw new ClientModeError('INVALID_MESSAGE', 'Mode must be local or remote.')
        return ok(await this.setMode(value.mode, typeof value.targetDeviceId === 'string' ? value.targetDeviceId : undefined, signal))
      }
      throw new ClientModeError('METHOD_NOT_FOUND', 'The remote-mode control method does not exist.')
    } catch (error) {
      return fail(error)
    }
  }

  private requireIdentity(): HostIdentity {
    if (this.identity === undefined) throw new ClientModeError('IDENTITY_INVALID', 'The client identity is not ready.')
    return this.identity
  }

  private async authorizeHostPeer(serverDevice: ServerHostDevice): Promise<TrustedPeer> {
    const descriptor = await this.server.deviceFor(serverDevice.deviceId)
    assertAuthorizedHost(serverDevice, descriptor)
    const existing = this.identities.trustedPeer(descriptor.deviceId)
    if (existing !== undefined && existing.publicKey !== descriptor.identityKey) {
      throw new ClientModeError('PEER_IDENTITY_MISMATCH', 'The authorized Host identity key changed unexpectedly.')
    }
    if (existing !== undefined
      && existing.membershipId === descriptor.membershipId
      && existing.name === descriptor.name
      && existing.platform === descriptor.platform) {
      return existing
    }
    return this.identities.trustPeer({
      deviceId: descriptor.deviceId,
      name: descriptor.name,
      platform: descriptor.platform,
      publicKey: descriptor.identityKey,
      membershipId: descriptor.membershipId,
    })
  }
}

export class ClientModeError extends Error {
  constructor(readonly code: string, message: string, readonly retryable = false) { super(message) }
}

function assertAuthorizedHost(listed: ServerHostDevice, descriptor: AuthorizedPeerDevice): void {
  if (descriptor.role !== 'host' || descriptor.deviceId !== listed.deviceId
    || descriptor.membershipId !== listed.membershipId) {
    throw new ClientModeError('PEER_IDENTITY_MISMATCH', 'Server Host details do not match the authorized device list.')
  }
}

function websocketUrl(baseUrl: string): string {
  const url = new URL(baseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws/v1/connect`
  return url.toString()
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ClientModeError('INVALID_MESSAGE', 'The control request payload is invalid.')
  }
  return value as Record<string, unknown>
}

function ok(value: unknown): RpcResult<unknown> { return { ok: true, value } }

function unwrapNativeResult<T>(response: { result: unknown }): T {
  const result = response.result
  if (typeof result !== 'object' || result === null || !('ok' in result)) {
    throw new ClientModeError('INVALID_MESSAGE', 'The remote Host returned an invalid response.')
  }
  if (result.ok !== true || !('value' in result)) {
    const message = 'error' in result && typeof result.error === 'object' && result.error !== null
      && 'message' in result.error && typeof result.error.message === 'string'
      ? result.error.message
      : 'The remote Host rejected the request.'
    throw new ClientModeError('REMOTE_API_ERROR', message)
  }
  return result.value as T
}

function fail(error: unknown): RpcResult<unknown> {
  const source = error instanceof Error ? error : undefined
  const remoteCode = source !== undefined && 'code' in source && typeof source.code === 'string'
    ? source.code
    : source instanceof ClientModeError ? source.code : undefined
  const retryable = source !== undefined && 'retryable' in source && typeof source.retryable === 'boolean'
    ? source.retryable
    : source instanceof ClientModeError ? source.retryable : false
  return {
    ok: false,
    error: {
      code: 'internal',
      message: source?.message ?? 'The remote-mode operation failed.',
      details: remoteCode === undefined ? {} : { remoteCode, retryable },
    },
  }
}

function shortId(value: string): string { return value.length <= 12 ? value : `${value.slice(0, 8)}…${value.slice(-4)}` }
