import { platform } from 'node:os'
import { fromBase64Url, toBase64Url } from '@dsh-remote/crypto'
import type { HostIdentity } from './identity-store.js'
import type { ServerCredentialStore, ServerCredentials } from './server-credentials.js'
import { normalizeServerUrl } from './config.js'

interface TokenPair {
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken: string
  refreshTokenExpiresAt: number
}

interface ErrorEnvelope {
  error?: { code?: unknown; message?: unknown; retryable?: unknown }
  detail?: unknown
}

interface WebLoginResponse {
  token: string
  expiresAt: number
  account: string
  profile: unknown
  isAdmin: boolean
}

export interface DeviceAuthorization {
  method: 'account' | 'host_registration_code'
  account?: string
  expiresAt?: number
  isAdmin?: boolean
}

export type FetchImplementation = typeof fetch

export interface ServerHostDevice {
  deviceId: string
  name: string
  platform: string
  membershipId: string
  online?: boolean
  lastSeenAt?: number
}

export interface AuthorizedPeerDevice extends ServerHostDevice {
  role: 'host' | 'client'
  identityKey: string
}

export class HostServerApi {
  readonly baseUrl: string
  private identity?: HostIdentity
  private credentials?: ServerCredentials
  private credentialsPromise?: Promise<ServerCredentials>

  constructor(
    serverUrl: string,
    private readonly store: ServerCredentialStore,
    private readonly fetchImplementation: FetchImplementation = fetch,
    private readonly role: 'host' | 'client' = 'host',
  ) {
    this.baseUrl = normalizeServerUrl(serverUrl)
  }

  bindIdentity(identity: HostIdentity): void { this.identity = identity }

  currentAuthorization(): DeviceAuthorization | undefined {
    if (this.credentials === undefined) return undefined
    return {
      method: this.credentials.authorizationMethod,
      ...(this.credentials.account === undefined ? {} : { account: this.credentials.account }),
    }
  }

  async authorizeWithAccount(identity: HostIdentity, email: string, password: string): Promise<DeviceAuthorization> {
    this.bindIdentity(identity)
    const account = email.trim()
    if (account.length === 0 || password.length === 0) {
      throw new ServerApiError('INVALID_MESSAGE', 'Email and password are required.', false)
    }
    const login = validateWebLogin(await this.publicRequest<unknown>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: account, password }),
    }))
    await this.register(identity, {
      accountToken: login.token,
      account: login.account,
      authorizationMethod: 'account',
    })
    return {
      method: 'account',
      account: login.account,
      expiresAt: login.expiresAt,
      isAdmin: login.isAdmin,
    }
  }

  async authorizeHostWithCode(identity: HostIdentity, code: string): Promise<DeviceAuthorization> {
    if (this.role !== 'host') {
      throw new ServerApiError('METHOD_NOT_ALLOWED', 'Host registration codes can only authorize a Host device.', false)
    }
    const registrationCode = code.trim().toUpperCase()
    if (registrationCode.length === 0) {
      throw new ServerApiError('INVALID_MESSAGE', 'A Host registration code is required.', false)
    }
    this.bindIdentity(identity)
    const tokens = await this.publicRequest<TokenPair>('/api/v1/devices/register-with-code', {
      method: 'POST',
      body: JSON.stringify({ v: 1, code: registrationCode, device: this.deviceDescriptor(identity) }),
    })
    this.credentials = await this.saveTokens(identity, validateTokens(tokens), {
      authorizationMethod: 'host_registration_code',
    })
    return { method: 'host_registration_code' }
  }

  async authenticate(identity = this.requireIdentity()): Promise<ServerCredentials> {
    this.bindIdentity(identity)
    if (this.credentials !== undefined && this.credentials.accessTokenExpiresAt > Date.now() + 30_000) {
      return this.credentials
    }
    this.credentialsPromise ??= this.loadOrIssue(identity).finally(() => { this.credentialsPromise = undefined })
    this.credentials = await this.credentialsPromise
    return this.credentials
  }

  async refreshCredentials(): Promise<ServerCredentials> {
    const identity = this.requireIdentity()
    const stored = await this.store.load(this.baseUrl, identity.deviceId)
    if (stored === undefined || stored.refreshTokenExpiresAt <= Date.now()) return this.register(identity)
    const tokens = await this.publicRequest<TokenPair>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ deviceId: identity.deviceId, refreshToken: stored.refreshToken }),
    })
    this.credentials = await this.store.save({
      serverUrl: this.baseUrl,
      deviceId: identity.deviceId,
      authorizationMethod: stored.authorizationMethod,
      ...(stored.account === undefined ? {} : { account: stored.account }),
      ...validateTokens(tokens),
    })
    return this.credentials
  }

  async listDevices(): Promise<ServerHostDevice[]> {
    const result = await this.request<{ items?: unknown }>('/api/v1/devices')
    if (!Array.isArray(result.items)) throw new ServerApiError('INVALID_MESSAGE', 'The Server returned an invalid device list.', false)
    return result.items.map(parseHostDevice)
  }

  async deviceFor(peerDeviceId: string): Promise<AuthorizedPeerDevice> {
    const result = await this.request<unknown>(`/api/v1/devices/${encodeURIComponent(peerDeviceId)}`)
    return parseAuthorizedPeer(result)
  }

  async presenceFor(deviceId: string): Promise<{ online: boolean; lastSeenAt?: number }> {
    const result = await this.request<Record<string, unknown>>(`/api/v1/devices/${encodeURIComponent(deviceId)}/presence`)
    if (typeof result.online !== 'boolean'
      || (result.lastSeenAt !== null && result.lastSeenAt !== undefined && !Number.isSafeInteger(result.lastSeenAt))) {
      throw new ServerApiError('INVALID_MESSAGE', 'The Server returned invalid device presence.', false)
    }
    return { online: result.online, ...(typeof result.lastSeenAt === 'number' ? { lastSeenAt: result.lastSeenAt } : {}) }
  }

  private async loadOrIssue(identity: HostIdentity): Promise<ServerCredentials> {
    const stored = await this.store.load(this.baseUrl, identity.deviceId)
    if (stored === undefined || stored.refreshTokenExpiresAt <= Date.now() + 30_000) {
      return this.register(identity)
    }
    if (stored.accessTokenExpiresAt > Date.now() + 30_000) return stored
    const tokens = await this.publicRequest<TokenPair>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ deviceId: identity.deviceId, refreshToken: stored.refreshToken }),
    })
    return this.store.save({
      serverUrl: this.baseUrl,
      deviceId: identity.deviceId,
      authorizationMethod: stored.authorizationMethod,
      ...(stored.account === undefined ? {} : { account: stored.account }),
      ...validateTokens(tokens),
    })
  }

  private async register(
    identity: HostIdentity,
    authorization?: {
      accountToken: string
      account: string
      authorizationMethod: 'account'
    },
  ): Promise<ServerCredentials> {
    const tokens = await this.publicRequest<TokenPair>('/api/v1/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        v: 1,
        device: this.deviceDescriptor(identity),
      }),
    }, authorization?.accountToken)
    this.credentials = await this.saveTokens(identity, validateTokens(tokens), {
      authorizationMethod: authorization?.authorizationMethod ?? 'account',
      ...(authorization?.account === undefined ? {} : { account: authorization.account }),
    })
    return this.credentials
  }

  private deviceDescriptor(identity: HostIdentity): Record<string, unknown> {
    return {
      deviceId: identity.deviceId,
      name: identity.name,
      role: this.role,
      platform: platform(),
      identityKey: identity.publicKey,
      clientVersion: '0.2.8',
      ...(this.role === 'host' ? { harnessVersion: '0.1.0-rc.6' } : {}),
    }
  }

  private saveTokens(
    identity: HostIdentity,
    tokens: TokenPair,
    authorization: Pick<ServerCredentials, 'authorizationMethod' | 'account'>,
  ): Promise<ServerCredentials> {
    return this.store.save({
      serverUrl: this.baseUrl,
      deviceId: identity.deviceId,
      authorizationMethod: authorization.authorizationMethod,
      ...(authorization.account === undefined ? {} : { account: authorization.account }),
      ...tokens,
    })
  }

  private async request<TResult>(path: string, init: RequestInit = {}): Promise<TResult> {
    const credentials = await this.authenticate()
    return this.publicRequest<TResult>(path, init, credentials.accessToken)
  }

  private async publicRequest<TResult>(path: string, init: RequestInit, accessToken?: string): Promise<TResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    let response: Response
    try {
      response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(accessToken === undefined ? {} : { Authorization: `Bearer ${accessToken}` }),
          ...init.headers,
        },
      })
    } catch (error) {
      throw new ServerApiError('CONNECTION_FAILED', error instanceof Error ? error.message : 'Server request failed.', true)
    } finally {
      clearTimeout(timer)
    }
    const body = await parseBody(response)
    if (!response.ok) {
      const envelope = (body ?? {}) as ErrorEnvelope
      throw new ServerApiError(
        typeof envelope.error?.code === 'string' ? envelope.error.code : mapStatus(response.status),
        typeof envelope.error?.message === 'string' ? envelope.error.message : 'The Server rejected the request.',
        envelope.error?.retryable === true || response.status >= 500,
        response.status,
      )
    }
    return body as TResult
  }

  private requireIdentity(): HostIdentity {
    if (this.identity === undefined) throw new ServerApiError('IDENTITY_INVALID', 'The device identity is not loaded.', false)
    return this.identity
  }
}

export class ClientServerApi extends HostServerApi {
  constructor(serverUrl: string, store: ServerCredentialStore, fetchImplementation: FetchImplementation = fetch) {
    super(serverUrl, store, fetchImplementation, 'client')
  }
}

export class ServerApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) { super(message) }
}

function validateTokens(value: TokenPair): TokenPair {
  if (typeof value.accessToken !== 'string' || value.accessToken.length < 16
    || typeof value.refreshToken !== 'string' || value.refreshToken.length < 16
    || !Number.isSafeInteger(value.accessTokenExpiresAt)
    || !Number.isSafeInteger(value.refreshTokenExpiresAt)) {
    throw new ServerApiError('INVALID_MESSAGE', 'The Server returned invalid device credentials.', false)
  }
  return value
}

function validateWebLogin(value: unknown): WebLoginResponse {
  const item = requireRecord(value, 'account login')
  if (typeof item.token !== 'string' || item.token.length < 16
    || !Number.isSafeInteger(item.expiresAt)
    || typeof item.account !== 'string' || item.account.length === 0 || item.account.length > 254
    || typeof item.isAdmin !== 'boolean') {
    throw new ServerApiError('INVALID_MESSAGE', 'The Server returned an invalid account session.', false)
  }
  return {
    token: item.token,
    expiresAt: item.expiresAt as number,
    account: item.account,
    profile: item.profile,
    isAdmin: item.isAdmin,
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.length === 0) return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw new ServerApiError('INVALID_MESSAGE', 'The Server returned invalid JSON.', false, response.status)
  }
}

function mapStatus(status: number): string {
  if (status === 401) return 'AUTH_INVALID'
  if (status === 403) return 'AUTH_REQUIRED'
  if (status === 404) return 'DEVICE_NOT_FOUND'
  if (status === 429) return 'RATE_LIMITED'
  return status >= 500 ? 'CONNECTION_FAILED' : 'INVALID_MESSAGE'
}

function parseHostDevice(value: unknown): ServerHostDevice {
  const item = requireRecord(value, 'host device')
  if (item.role !== 'host' || typeof item.deviceId !== 'string' || typeof item.name !== 'string'
    || typeof item.platform !== 'string' || typeof item.membershipId !== 'string' || item.membershipId.length === 0) {
    throw new ServerApiError('INVALID_MESSAGE', 'The Server returned invalid host device data.', false)
  }
  return {
    deviceId: item.deviceId,
    name: item.name,
    platform: item.platform,
    membershipId: item.membershipId,
    ...(typeof item.online === 'boolean' ? { online: item.online } : {}),
    ...(typeof item.lastSeenAt === 'number' && Number.isSafeInteger(item.lastSeenAt) ? { lastSeenAt: item.lastSeenAt } : {}),
  }
}

function parseAuthorizedPeer(value: unknown): AuthorizedPeerDevice {
  const item = requireRecord(value, 'authorized peer')
  if ((item.role !== 'host' && item.role !== 'client')
    || typeof item.deviceId !== 'string' || item.deviceId.length === 0
    || typeof item.name !== 'string' || item.name.length === 0
    || typeof item.platform !== 'string' || item.platform.length === 0
    || typeof item.identityKey !== 'string' || !isIdentityKey(item.identityKey)
    || typeof item.membershipId !== 'string' || item.membershipId.length === 0) {
    throw new ServerApiError('INVALID_MESSAGE', 'The Server returned invalid authorized peer data.', false)
  }
  return {
    deviceId: item.deviceId,
    name: item.name,
    role: item.role,
    platform: item.platform,
    identityKey: item.identityKey,
    membershipId: item.membershipId,
    ...(typeof item.online === 'boolean' ? { online: item.online } : {}),
    ...(typeof item.lastSeenAt === 'number' && Number.isSafeInteger(item.lastSeenAt) ? { lastSeenAt: item.lastSeenAt } : {}),
  }
}

function isIdentityKey(value: string): boolean {
  try {
    const decoded = fromBase64Url(value)
    return decoded.length === 32 && toBase64Url(decoded) === value
  } catch {
    return false
  }
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ServerApiError('INVALID_MESSAGE', `The Server returned invalid ${name} data.`, false)
  }
  return value as Record<string, unknown>
}
