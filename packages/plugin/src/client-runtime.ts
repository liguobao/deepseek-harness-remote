import type { ApiProxy, RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import { RemoteClientCore } from '@dsh-remote/client-core'
import { RelayTransport } from '@dsh-remote/webrtc'
import { ApiProxySwitch, type HarnessMode } from './api-proxy-switch.js'
import { ClientSecureTransport } from './client-secure-transport.js'
import type { ResolvedConfig } from './config.js'
import { fingerprint, type HostIdentity, type IdentityStore, type TrustedPeer } from './identity-store.js'
import type { SafeLogger } from './logging.js'
import { RemoteHarnessApiProxy } from './remote-api-proxy.js'
import { ClientServerApi, type ClientPairingClaim, type ClientPairingStatus, type ServerHostDevice } from './server-api.js'

interface PendingPairing {
  claim: ClientPairingClaim
}

interface ConnectedRemote {
  client: RemoteClientCore
  target: TrustedPeer
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

export interface HostPairingControl {
  createPairing(): Promise<unknown>
  pendingPairings(): unknown[]
  confirmPairing(pairingId: string, decision: 'approve' | 'deny'): Promise<unknown>
  hostStatus(): {
    configured: boolean
    online: boolean
    error?: string
    account?: string
    accountRequired: boolean
  }
  authorizeHost(email: string, password: string): Promise<unknown>
}

export class ClientModeRuntime {
  private identity?: HostIdentity
  private connected?: ConnectedRemote
  private readonly pendingPairings = new Map<string, PendingPairing>()
  private readonly proxySwitch: ApiProxySwitch
  private closed = false

  constructor(
    private readonly config: ResolvedConfig,
    private readonly identities: IdentityStore,
    private readonly server: ClientServerApi,
    apiProxy: ApiProxy,
    private readonly logger: SafeLogger,
    private readonly host?: HostPairingControl,
  ) {
    this.proxySwitch = new ApiProxySwitch(apiProxy)
  }

  async start(): Promise<void> {
    if (this.closed) throw new Error('client remote-mode runtime is closed')
    this.identity = await this.identities.loadOrCreate(`${this.config.deviceName.slice(0, 73)} Client`)
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
      hostPairingAvailable: this.host !== undefined,
      ...(this.host === undefined ? {} : { host: this.host.hostStatus() }),
    }
  }

  async devices(): Promise<RemoteDeviceView[]> {
    this.requireIdentity()
    const serverDevices = await this.server.listDevices()
    const trusted = new Map(this.identities.listTrustedPeers().map(peer => [peer.deviceId, peer]))
    const visible = serverDevices.filter(device => {
      const peer = trusted.get(device.deviceId)
      return peer !== undefined && peer.membershipId === device.membershipId
    })
    return Promise.all(visible.map(async device => {
      const presence = await this.server.presenceFor(device.deviceId).catch(() => ({ online: false }))
      return { ...device, ...presence }
    }))
  }

  async claimPairing(code: string): Promise<ClientPairingClaim> {
    const identity = this.requireIdentity()
    const claim = await this.server.claimPairing(code, identity.deviceId)
    if (claim.host.fingerprint !== fingerprint(claim.host.identityKey)) {
      throw new ClientModeError('PEER_IDENTITY_MISMATCH', 'The pairing Host fingerprint is invalid.')
    }
    this.pendingPairings.set(claim.pairingId, { claim })
    return claim
  }

  async refreshPairing(pairingId: string): Promise<ClientPairingStatus> {
    const pending = this.pendingPairings.get(pairingId)
    if (pending === undefined) throw new ClientModeError('PAIRING_INVALID', 'The pairing claim is not pending on this device.')
    const status = await this.server.pairingStatus(pairingId)
    if (status.status === 'paired') {
      if (status.membershipId === undefined || status.hostDeviceId !== pending.claim.host.deviceId) {
        throw new ClientModeError('INVALID_MESSAGE', 'The paired membership does not match the claimed Host.')
      }
      await this.identities.trustPeer({
        deviceId: pending.claim.host.deviceId,
        name: pending.claim.host.name,
        platform: pending.claim.host.platform,
        publicKey: pending.claim.host.identityKey,
        membershipId: status.membershipId,
      })
      this.pendingPairings.delete(pairingId)
    } else if (status.status === 'rejected' || status.status === 'expired') {
      this.pendingPairings.delete(pairingId)
    }
    return status
  }

  async setMode(mode: HarnessMode, targetDeviceId?: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    if (mode === 'local') {
      this.proxySwitch.selectLocal()
      const previous = this.connected
      this.connected = undefined
      await previous?.client.close()
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
    await previous?.client.close()
    this.logger.info('Harness target switched', { mode: 'remote', targetDeviceId: shortId(next.target.deviceId) })
    return this.status()
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.proxySwitch.selectLocal()
    await this.connected?.client.close()
    this.connected = undefined
    this.proxySwitch.restore()
  }

  private async connect(targetDeviceId: string, signal?: AbortSignal): Promise<ConnectedRemote> {
    signal?.throwIfAborted()
    const identity = this.requireIdentity()
    const target = this.identities.trustedPeer(targetDeviceId)
    if (target === undefined || target.membershipId === undefined) {
      throw new ClientModeError('PEER_IDENTITY_MISMATCH', 'The selected Host is not paired with this client.')
    }
    const serverDevice = (await this.server.listDevices()).find(device => device.deviceId === targetDeviceId)
    assertMembership(target, serverDevice)
    const presence = await this.server.presenceFor(targetDeviceId)
    if (!presence.online) throw new ClientModeError('HOST_OFFLINE', 'The selected Host is offline.', true)
    const credentials = await this.server.authenticate(identity)
    const relay = new RelayTransport(websocketUrl(this.server.baseUrl), {
      role: 'client',
      deviceId: identity.deviceId,
      accessToken: credentials.accessToken,
      targetDeviceId,
      capabilities: ['transport.relay', 'harness.api.v1'],
      preferredTransports: ['relay'],
    })
    const client = new RemoteClientCore(new ClientSecureTransport(relay, identity, target), 60_000)
    try {
      await client.connect()
      signal?.throwIfAborted()
      const info = await client.rpc<Record<string, unknown>>('system.info', {}, signal)
      const capabilities = Array.isArray(info.capabilities) ? info.capabilities : []
      if (!capabilities.includes('harness.api.v1')) {
        throw new ClientModeError('METHOD_NOT_ALLOWED', 'The selected Host plugin does not support native Harness remote mode.')
      }
      client.onClose(() => {
        if (this.connected?.client !== client) return
        this.connected = undefined
        this.proxySwitch.selectLocal()
        void client.close()
        this.logger.warn('remote Harness transport closed; falling back to local mode', {
          targetDeviceId: shortId(target.deviceId),
        })
      })
      return { client, target }
    } catch (error) {
      await client.close()
      throw error
    }
  }

  private async handleControl(endpoint: string, payload: unknown, signal: AbortSignal): Promise<RpcResult<unknown>> {
    try {
      if (endpoint === 'status') return ok(this.status())
      if (endpoint === 'devices') return ok(await this.devices())
      if (endpoint === 'pairing.claim') {
        const value = record(payload)
        if (typeof value.code !== 'string') throw new ClientModeError('INVALID_MESSAGE', 'A pairing code is required.')
        return ok(await this.claimPairing(value.code))
      }
      if (endpoint === 'pairing.status') {
        const value = record(payload)
        if (typeof value.pairingId !== 'string') throw new ClientModeError('INVALID_MESSAGE', 'A pairingId is required.')
        return ok(await this.refreshPairing(value.pairingId))
      }
      if (endpoint === 'host.pairing.create') {
        if (this.host === undefined) throw new ClientModeError('METHOD_NOT_ALLOWED', 'This plugin is not running as a Host.')
        return ok(await this.host.createPairing())
      }
      if (endpoint === 'host.account.login') {
        if (this.host === undefined) throw new ClientModeError('METHOD_NOT_ALLOWED', 'This plugin is not running as a Host.')
        const value = record(payload)
        if (typeof value.email !== 'string' || typeof value.password !== 'string') {
          throw new ClientModeError('INVALID_MESSAGE', 'Email and password are required.')
        }
        return ok(await this.host.authorizeHost(value.email, value.password))
      }
      if (endpoint === 'host.pairings') return ok(this.host?.pendingPairings() ?? [])
      if (endpoint === 'host.pairing.confirm') {
        if (this.host === undefined) throw new ClientModeError('METHOD_NOT_ALLOWED', 'This plugin is not running as a Host.')
        const value = record(payload)
        if (typeof value.pairingId !== 'string' || (value.decision !== 'approve' && value.decision !== 'deny')) {
          throw new ClientModeError('INVALID_MESSAGE', 'A pairingId and approve/deny decision are required.')
        }
        return ok(await this.host.confirmPairing(value.pairingId, value.decision))
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
}

export class ClientModeError extends Error {
  constructor(readonly code: string, message: string, readonly retryable = false) { super(message) }
}

function assertMembership(peer: TrustedPeer, server: ServerHostDevice | undefined): void {
  if (server === undefined || server.membershipId !== peer.membershipId) {
    throw new ClientModeError('PEER_IDENTITY_MISMATCH', 'Server membership no longer matches local Host trust.')
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
