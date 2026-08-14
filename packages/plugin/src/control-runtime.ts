import { hostname } from 'node:os'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { resolveConfig, type Config, type ResolvedConfig } from './config.js'
import {
  ClientModeError,
  type ClientModeRuntime,
  type HostConnectionHandle,
  type HostPairingControl,
} from './client-runtime.js'
import { fingerprint, IdentityStore, serverStorageDirectory, type HostIdentity } from './identity-store.js'
import { ClientServerApi, HostServerApi, type ClientPairingClaim } from './server-api.js'
import { ServerCredentialStore } from './server-credentials.js'

export interface PluginSettingsView {
  config: Config
  deviceName: string
  writable: boolean
  applies: 'restart'
  pendingPairing?: {
    pairingId: string
    expiresAt: number
    host: { name: string; fingerprint: string }
  }
}

interface PendingClientPairing {
  api: ClientServerApi
  identities: IdentityStore
  identity: HostIdentity
  claim: ClientPairingClaim
}

/** Loopback-only control plane shared by Local/Remote switching and plugin setup. */
export class PluginControlRuntime {
  private pendingPairing?: PendingClientPairing

  constructor(
    private readonly config: ResolvedConfig,
    private readonly identityDirectory: string,
    private readonly settings: SettingsScope<Config> | undefined,
    private readonly client: ClientModeRuntime | undefined,
    private readonly host: HostPairingControl | undefined,
  ) {}

  register(connection: HostConnectionHandle): () => Promise<void> {
    return connection.rpc.handle('/remote', (endpoint, payload, signal) => this.handle(endpoint, payload, signal), {
      authority: 'loopback',
    })
  }

  private async handle(endpoint: string, payload: unknown, signal: AbortSignal): Promise<RpcResult<unknown>> {
    try {
      if (endpoint === 'settings.get') return ok(this.settingsView())
      if (endpoint === 'settings.configure') return ok(await this.configure(payload))
      if (endpoint === 'settings.pairing.status') return ok(await this.pairingStatus(payload))
      if (this.client !== undefined) return this.client.handleControl(endpoint, payload, signal)

      if (endpoint === 'status') return ok(this.hostOnlyStatus())
      if (endpoint === 'devices') return ok([])
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
      if (endpoint === 'mode.set' && record(payload).mode === 'local') return ok(this.hostOnlyStatus())
      throw new ClientModeError('METHOD_NOT_ALLOWED', 'Remote Client mode is disabled by the plugin role.')
    } catch (error) {
      return fail(error)
    }
  }

  private async configure(payload: unknown): Promise<Record<string, unknown>> {
    if (this.settings === undefined) {
      throw new ClientModeError('SETTINGS_UNAVAILABLE', 'DSH user settings are unavailable in this profile.')
    }
    const value = record(payload)
    if (value.role !== 'host' && value.role !== 'client') {
      throw new ClientModeError('INVALID_MESSAGE', 'Role must be Host or Client.')
    }
    if (typeof value.serverUrl !== 'string') {
      throw new ClientModeError('INVALID_MESSAGE', 'Server URL is required.')
    }
    const current = editableConfig(resolveConfig(this.settings.get()))
    const next = resolveConfig({ ...current, role: value.role, serverUrl: value.serverUrl })

    if (value.role === 'host') {
      if (typeof value.email !== 'string' || typeof value.password !== 'string') {
        throw new ClientModeError('INVALID_MESSAGE', 'Email and password are required for a Host.')
      }
      const identities = new IdentityStore({
        directory: serverStorageDirectory(this.identityDirectory, next.serverUrl!, 'host'),
      })
      const identity = await identities.loadOrCreate(hostname())
      const api = new HostServerApi(next.serverUrl!, new ServerCredentialStore(identities.directory))
      const authorization = await api.authorizeHost(identity, value.email, value.password)
      await this.settings.replace(editableConfig(next))
      this.pendingPairing = undefined
      return { status: 'authorized', role: 'host', account: authorization.account, settings: this.settingsView() }
    }

    if (typeof value.authorizationCode !== 'string' || value.authorizationCode.trim() === '') {
      throw new ClientModeError('INVALID_MESSAGE', 'Authorization code is required for a Client.')
    }
    const identities = new IdentityStore({
      directory: serverStorageDirectory(this.identityDirectory, next.serverUrl!, 'client'),
    })
    const identity = await identities.loadOrCreate(hostname())
    const api = new ClientServerApi(next.serverUrl!, new ServerCredentialStore(identities.directory))
    api.bindIdentity(identity)
    const claim = await api.claimPairing(value.authorizationCode, identity.deviceId)
    if (claim.host.fingerprint !== fingerprint(claim.host.identityKey)) {
      throw new ClientModeError('PEER_IDENTITY_MISMATCH', 'The pairing Host fingerprint is invalid.')
    }
    this.pendingPairing = { api, identities, identity, claim }
    await this.settings.replace(editableConfig(next))
    return { status: 'waiting_host', role: 'client', settings: this.settingsView() }
  }

  private async pairingStatus(payload: unknown): Promise<Record<string, unknown>> {
    const value = record(payload)
    const pending = this.pendingPairing
    if (pending === undefined || value.pairingId !== pending.claim.pairingId) {
      throw new ClientModeError('PAIRING_INVALID', 'The pairing request is not pending on this device.')
    }
    const status = await pending.api.pairingStatus(pending.claim.pairingId)
    if (status.status === 'paired') {
      if (status.membershipId === undefined || status.hostDeviceId !== pending.claim.host.deviceId) {
        throw new ClientModeError('INVALID_MESSAGE', 'The paired membership does not match the authorized Host.')
      }
      await pending.identities.trustPeer({
        deviceId: pending.claim.host.deviceId,
        name: pending.claim.host.name,
        platform: pending.claim.host.platform,
        publicKey: pending.claim.host.identityKey,
        membershipId: status.membershipId,
      })
      this.pendingPairing = undefined
    } else if (status.status === 'rejected' || status.status === 'expired') {
      this.pendingPairing = undefined
    }
    return { ...status, settings: this.settingsView() }
  }

  private settingsView(): PluginSettingsView {
    const config = this.settings === undefined ? editableConfig(this.config) : editableConfig(resolveConfig(this.settings.get()))
    const pending = this.pendingPairing?.claim
    return {
      config,
      deviceName: hostname(),
      writable: this.settings !== undefined,
      applies: 'restart',
      ...(pending === undefined ? {} : {
        pendingPairing: {
          pairingId: pending.pairingId,
          expiresAt: pending.expiresAt,
          host: { name: pending.host.name, fingerprint: pending.host.fingerprint },
        },
      }),
    }
  }

  private hostOnlyStatus(): Record<string, unknown> {
    return {
      mode: 'local',
      available: false,
      hostPairingAvailable: this.host !== undefined,
      ...(this.host === undefined ? {} : { host: this.host.hostStatus() }),
    }
  }
}

function editableConfig(config: ResolvedConfig): Config {
  return {
    enabled: config.enabled,
    role: config.role,
    ...(config.serverUrl === undefined ? {} : { serverUrl: config.serverUrl }),
    forceRelay: config.forceRelay,
    logLevel: config.logLevel,
    approvalTimeoutMs: config.approvalTimeoutMs,
    reconnect: config.reconnect.enabled
      ? {
          initialDelayMs: config.reconnect.initialDelayMs,
          maxDelayMs: config.reconnect.maxDelayMs,
          jitter: config.reconnect.jitter,
        }
      : false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new ClientModeError('INVALID_MESSAGE', 'The control request payload is invalid.')
  return value
}

function ok(value: unknown): RpcResult<unknown> { return { ok: true, value } }

function fail(error: unknown): RpcResult<unknown> {
  const source = error instanceof Error ? error : undefined
  const remoteCode = source !== undefined && 'code' in source && typeof source.code === 'string'
    ? source.code
    : source instanceof ClientModeError ? source.code : undefined
  return {
    ok: false,
    error: {
      code: 'internal',
      message: source?.message ?? 'The plugin control operation failed.',
      details: remoteCode === undefined ? {} : { remoteCode },
    },
  }
}
