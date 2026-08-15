import { rm } from 'node:fs/promises'
import { hostname } from 'node:os'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { resolveConfig, type Config, type ResolvedConfig } from './config.js'
import {
  ClientModeError,
  type ClientModeRuntime,
  type HostConnectionHandle,
  type HostAuthorizationControl,
} from './client-runtime.js'
import { IdentityStore, serverStorageDirectory } from './identity-store.js'
import { ClientServerApi, HostServerApi } from './server-api.js'
import { ServerCredentialStore } from './server-credentials.js'

export interface PluginSettingsView {
  config: Config
  deviceName: string
  writable: boolean
  applies: 'restart'
  association?: {
    method: 'account' | 'host_registration_code'
    account?: string
  }
}

/** Loopback-only control plane shared by Local/Remote switching and plugin setup. */
export class PluginControlRuntime {
  constructor(
    private readonly config: ResolvedConfig,
    private readonly identityDirectory: string,
    private readonly settings: SettingsScope<Config> | undefined,
    private readonly client: ClientModeRuntime | undefined,
    private readonly host: HostAuthorizationControl | undefined,
  ) {}

  register(connection: HostConnectionHandle): () => Promise<void> {
    return connection.rpc.handle('/remote', (endpoint, payload, signal) => this.handle(endpoint, payload, signal), {
      authority: 'loopback',
    })
  }

  private async handle(endpoint: string, payload: unknown, signal: AbortSignal): Promise<RpcResult<unknown>> {
    try {
      if (endpoint === 'settings.get') return ok(await this.settingsView())
      if (endpoint === 'settings.configure') return ok(await this.configure(payload))
      if (endpoint === 'settings.role.set') return ok(await this.setRole(payload))
      if (endpoint === 'settings.logout') return ok(await this.logout())
      if (this.client !== undefined) return this.client.handleControl(endpoint, payload, signal)

      if (endpoint === 'status') return ok(this.hostOnlyStatus())
      if (endpoint === 'devices') return ok([])
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

    const identities = new IdentityStore({
      directory: serverStorageDirectory(this.identityDirectory, next.serverUrl!, value.role),
    })
    const identity = await identities.loadOrCreate(hostname())
    const api = value.role === 'host'
      ? new HostServerApi(next.serverUrl!, new ServerCredentialStore(identities.directory))
      : new ClientServerApi(next.serverUrl!, new ServerCredentialStore(identities.directory))
    let authorization
    if (value.role === 'host' && typeof value.registrationCode === 'string' && value.registrationCode.trim() !== '') {
      authorization = await api.authorizeHostWithCode(identity, value.registrationCode)
    } else {
      if (typeof value.email !== 'string' || typeof value.password !== 'string') {
        throw new ClientModeError('INVALID_MESSAGE', 'Email and password are required for account authorization.')
      }
      authorization = await api.authorizeWithAccount(identity, value.email, value.password)
    }
    await this.settings.replace(editableConfig(next))
    return {
      status: 'authorized',
      role: value.role,
      ...(authorization.account === undefined ? {} : { account: authorization.account }),
      settings: await this.settingsView(),
    }
  }

  private async setRole(payload: unknown): Promise<PluginSettingsView> {
    if (this.settings === undefined) {
      throw new ClientModeError('SETTINGS_UNAVAILABLE', 'DSH user settings are unavailable in this profile.')
    }
    const role = record(payload).role
    if (role !== 'host' && role !== 'client') {
      throw new ClientModeError('INVALID_MESSAGE', 'Role must be Host or Client.')
    }
    const current = editableConfig(resolveConfig(this.settings.get()))
    await this.settings.replace({ ...current, role })
    return this.settingsView()
  }

  private async logout(): Promise<PluginSettingsView> {
    if (this.settings === undefined) {
      throw new ClientModeError('SETTINGS_UNAVAILABLE', 'DSH user settings are unavailable in this profile.')
    }
    const config = resolveConfig(this.settings.get())
    if (config.serverUrl !== undefined) {
      const role = config.role === 'client' ? 'client' : 'host'
      const directory = serverStorageDirectory(this.identityDirectory, config.serverUrl, role)
      await rm(directory, { recursive: true, force: true })
    }
    return this.settingsView()
  }

  private async settingsView(): Promise<PluginSettingsView> {
    const config = this.settings === undefined ? editableConfig(this.config) : editableConfig(resolveConfig(this.settings.get()))
    const association = await this.association(config)
    return {
      config,
      deviceName: hostname(),
      writable: this.settings !== undefined,
      applies: 'restart',
      ...(association === undefined ? {} : { association }),
    }
  }

  private async association(config: Config): Promise<PluginSettingsView['association']> {
    if (config.serverUrl === undefined) return undefined
    const role = config.role === 'client' ? 'client' : 'host'
    const identities = new IdentityStore({
      directory: serverStorageDirectory(this.identityDirectory, config.serverUrl, role),
    })
    const identity = await identities.loadOrCreate(hostname())
    const credentials = await new ServerCredentialStore(identities.directory).load(config.serverUrl, identity.deviceId)
    if (credentials === undefined) return undefined
    return {
      method: credentials.authorizationMethod,
      ...(credentials.account === undefined ? {} : { account: credentials.account }),
    }
  }

  private hostOnlyStatus(): Record<string, unknown> {
    return {
      mode: 'local',
      available: false,
      hostAuthorizationAvailable: this.host !== undefined,
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
