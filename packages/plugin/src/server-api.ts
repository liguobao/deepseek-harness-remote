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

export class HostServerApi implements PairingServer {
  readonly baseUrl: string
  private identity?: HostIdentity
  private credentials?: ServerCredentials
  private credentialsPromise?: Promise<ServerCredentials>

  constructor(
    serverUrl: string,
    private readonly store: ServerCredentialStore,
    private readonly fetchImplementation: FetchImplementation = fetch,
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
          role: 'host',
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
    if (this.identity === undefined) throw new ServerApiError('IDENTITY_INVALID', 'The Host identity is not loaded.', false)
    return this.identity
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
