import { platform } from 'node:os'
import type { HostIdentity } from './identity-store.js'
import type { PairingServer } from './pairing-controller.js'
import type { ServerCredentialStore, ServerCredentials } from './server-credentials.js'

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

export type FetchImplementation = typeof fetch

export interface ServerHostDevice {
  deviceId: string
  name: string
  platform: string
  membershipId: string
  online?: boolean
  lastSeenAt?: number
}

export interface ClientPairingClaim {
  pairingId: string
  expiresAt: number
  host: {
    deviceId: string
    name: string
    platform: string
    identityKey: string
    fingerprint: string
  }
}

export interface ClientPairingStatus {
  status: 'waiting_host' | 'paired' | 'rejected' | 'expired'
  membershipId?: string
  hostDeviceId?: string
  expiresAt?: number
}

export class HostServerApi implements PairingServer {
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
    this.credentials = await this.store.save({ serverUrl: this.baseUrl, deviceId: identity.deviceId, ...validateTokens(tokens) })
    return this.credentials
  }

  async create(identity: HostIdentity) {
    this.bindIdentity(identity)
    return this.request<{ pairingId: string; code: string; expiresAt: number; pairUri: string }>(
      '/api/v1/pairings',
      { method: 'POST', body: JSON.stringify({ v: 1, hostDeviceId: identity.deviceId }) },
    )
  }

  confirm(input: { pairingId: string; decision: 'approve' | 'deny'; clientDeviceId: string; clientFingerprint: string }) {
    return this.request<{ status: string; membershipId?: string }>('/api/v1/pairings/confirm', {
      method: 'POST',
      body: JSON.stringify({ v: 1, ...input }),
    })
  }

  async membershipFor(peerDeviceId: string): Promise<string | undefined> {
    const result = await this.request<{ membershipId?: unknown }>(`/api/v1/devices/${encodeURIComponent(peerDeviceId)}`)
    return typeof result.membershipId === 'string' && result.membershipId.length > 0 ? result.membershipId : undefined
  }

  async listDevices(): Promise<ServerHostDevice[]> {
    const result = await this.request<{ items?: unknown }>('/api/v1/devices')
    if (!Array.isArray(result.items)) throw new ServerApiError('INVALID_MESSAGE', 'The Server returned an invalid device list.', false)
    return result.items.map(parseHostDevice)
  }

  async presenceFor(deviceId: string): Promise<{ online: boolean; lastSeenAt?: number }> {
    const result = await this.request<Record<string, unknown>>(`/api/v1/devices/${encodeURIComponent(deviceId)}/presence`)
    if (typeof result.online !== 'boolean'
      || (result.lastSeenAt !== null && result.lastSeenAt !== undefined && !Number.isSafeInteger(result.lastSeenAt))) {
      throw new ServerApiError('INVALID_MESSAGE', 'The Server returned invalid device presence.', false)
    }
    return { online: result.online, ...(typeof result.lastSeenAt === 'number' ? { lastSeenAt: result.lastSeenAt } : {}) }
  }

  async claimPairing(code: string, clientDeviceId: string): Promise<ClientPairingClaim> {
    const result = await this.request<unknown>('/api/v1/pairings/claim', {
      method: 'POST',
      body: JSON.stringify({ v: 1, code: code.replace('-', ''), clientDeviceId }),
    })
    return parseClientPairingClaim(result)
  }

  async pairingStatus(pairingId: string): Promise<ClientPairingStatus> {
    const result = await this.request<unknown>(`/api/v1/pairings/${encodeURIComponent(pairingId)}/status`)
    return parseClientPairingStatus(result)
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
    return this.store.save({ serverUrl: this.baseUrl, deviceId: identity.deviceId, ...validateTokens(tokens) })
  }

  private async register(identity: HostIdentity): Promise<ServerCredentials> {
    const tokens = await this.publicRequest<TokenPair>('/api/v1/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        v: 1,
        device: {
          deviceId: identity.deviceId,
          name: identity.name,
          role: this.role,
          platform: platform(),
          identityKey: identity.publicKey,
          clientVersion: '0.1.0',
          harnessVersion: '0.1.0-rc.6',
        },
      }),
    })
    return this.store.save({ serverUrl: this.baseUrl, deviceId: identity.deviceId, ...validateTokens(tokens) })
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

function normalizeServerUrl(value: string): string {
  const url = new URL(value)
  url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString().replace(/\/$/, '')
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

function parseClientPairingClaim(value: unknown): ClientPairingClaim {
  const item = requireRecord(value, 'pairing claim')
  const host = requireRecord(item.host, 'pairing Host')
  if (typeof item.pairingId !== 'string' || !Number.isSafeInteger(item.expiresAt)
    || typeof host.deviceId !== 'string' || typeof host.name !== 'string' || typeof host.platform !== 'string'
    || typeof host.identityKey !== 'string' || typeof host.fingerprint !== 'string') {
    throw new ServerApiError('INVALID_MESSAGE', 'The Server returned invalid pairing data.', false)
  }
  return {
    pairingId: item.pairingId,
    expiresAt: item.expiresAt as number,
    host: {
      deviceId: host.deviceId,
      name: host.name,
      platform: host.platform,
      identityKey: host.identityKey,
      fingerprint: host.fingerprint,
    },
  }
}

function parseClientPairingStatus(value: unknown): ClientPairingStatus {
  const item = requireRecord(value, 'pairing status')
  if (!['waiting_host', 'paired', 'rejected', 'expired'].includes(String(item.status))
    || (item.membershipId !== undefined && item.membershipId !== null && typeof item.membershipId !== 'string')
    || (item.hostDeviceId !== undefined && item.hostDeviceId !== null && typeof item.hostDeviceId !== 'string')
    || (item.expiresAt !== undefined && item.expiresAt !== null && !Number.isSafeInteger(item.expiresAt))) {
    throw new ServerApiError('INVALID_MESSAGE', 'The Server returned invalid pairing status.', false)
  }
  return {
    status: item.status as ClientPairingStatus['status'],
    ...(typeof item.membershipId === 'string' ? { membershipId: item.membershipId } : {}),
    ...(typeof item.hostDeviceId === 'string' ? { hostDeviceId: item.hostDeviceId } : {}),
    ...(typeof item.expiresAt === 'number' ? { expiresAt: item.expiresAt } : {}),
  }
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ServerApiError('INVALID_MESSAGE', `The Server returned invalid ${name} data.`, false)
  }
  return value as Record<string, unknown>
}
