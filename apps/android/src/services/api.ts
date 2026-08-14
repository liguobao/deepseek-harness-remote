import { RemoteApiError } from '../lib/errors'
import { normalizeServerUrl } from '../lib/server-url'
import type {
  DeviceCredentials,
  DeviceIdentity,
  DevicePresence,
  PairingResult,
  PairingStatus,
  ServerHostDevice,
} from '../types'

interface ErrorBody {
  detail?: unknown
  code?: unknown
  error?: {
    code?: unknown
    message?: unknown
    retryable?: unknown
  }
}

type TokenPair = Omit<DeviceCredentials, 'deviceId' | 'serverUrl'>
type FetchImplementation = typeof fetch

export class RemoteServerApi {
  readonly baseUrl: string

  constructor(
    baseUrl: string,
    private readonly accessToken?: string,
    private readonly fetchImplementation: FetchImplementation = fetch,
    private readonly timeoutMs = 10_000,
  ) {
    this.baseUrl = normalizeServerUrl(baseUrl)
  }

  async health(): Promise<void> {
    const body = await this.request<unknown>('/health', {}, false)
    if (!isRecord(body) || body.status !== 'ok') {
      throw new RemoteApiError('CONNECTION_FAILED', 'The server health check failed.')
    }
  }

  async registerDevice(identity: DeviceIdentity): Promise<TokenPair> {
    const body = await this.request<unknown>('/api/v1/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        v: 1,
        device: {
          deviceId: identity.deviceId,
          name: identity.name,
          role: 'client',
          platform: identity.platform,
          identityKey: identity.publicKey,
          clientVersion: '0.2.3',
        },
      }),
    }, false)
    return parseTokenPair(body)
  }

  async refreshToken(deviceId: string, refreshToken: string): Promise<TokenPair> {
    const body = await this.request<unknown>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ deviceId, refreshToken }),
    }, false)
    return parseTokenPair(body)
  }

  async listDevices(): Promise<ServerHostDevice[]> {
    const body = await this.request<unknown>('/api/v1/devices')
    if (!isRecord(body) || !Array.isArray(body.items)) invalidResponse('device list')
    return body.items.map(parseServerHost)
  }

  async getDevice(deviceId: string): Promise<ServerHostDevice> {
    const body = await this.request<unknown>(`/api/v1/devices/${encodeURIComponent(deviceId)}`)
    return parseServerHost(body)
  }

  async getPresence(deviceId: string): Promise<DevicePresence> {
    const body = await this.request<unknown>(`/api/v1/devices/${encodeURIComponent(deviceId)}/presence`)
    if (!isRecord(body)
      || typeof body.deviceId !== 'string'
      || typeof body.online !== 'boolean'
      || (body.lastSeenAt !== null && body.lastSeenAt !== undefined && !Number.isSafeInteger(body.lastSeenAt))) {
      invalidResponse('device presence')
    }
    return {
      deviceId: body.deviceId,
      online: body.online,
      ...(typeof body.lastSeenAt === 'number' ? { lastSeenAt: body.lastSeenAt } : {}),
    }
  }

  async claimPairing(code: string, clientDeviceId: string): Promise<PairingResult> {
    const body = await this.request<unknown>('/api/v1/pairings/claim', {
      method: 'POST',
      body: JSON.stringify({
        v: 1,
        code: code.replace('-', ''),
        clientDeviceId,
      }),
    })
    return parsePairingResult(body)
  }

  async pairingStatus(pairingId: string): Promise<PairingStatus> {
    const body = await this.request<unknown>(`/api/v1/pairings/${encodeURIComponent(pairingId)}/status`)
    return parsePairingStatus(body)
  }

  async removeDevice(deviceId: string): Promise<void> {
    await this.request(`/api/v1/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
  }

  private async request<TResult>(path: string, init: RequestInit = {}, authenticated = true): Promise<TResult> {
    if (authenticated && this.accessToken === undefined) {
      throw new RemoteApiError('AUTH_REQUIRED', 'This device is not registered with the server.')
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    let response: Response
    try {
      response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(authenticated ? { Authorization: `Bearer ${this.accessToken}` } : {}),
          ...init.headers,
        },
      })
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError'
      throw new RemoteApiError(
        'CONNECTION_FAILED',
        timedOut ? 'The server request timed out.' : error instanceof Error ? error.message : 'Server request failed.',
        undefined,
        true,
      )
    } finally {
      clearTimeout(timer)
    }

    const text = await response.text()
    let body: unknown = undefined
    if (text.length > 0) {
      try {
        body = JSON.parse(text)
      } catch {
        throw new RemoteApiError('INVALID_MESSAGE', 'The server returned invalid JSON.', response.status)
      }
    }
    if (!response.ok) {
      const errorBody = (body ?? {}) as ErrorBody
      const detail = typeof errorBody.error?.message === 'string'
        ? errorBody.error.message
        : typeof errorBody.detail === 'string' ? errorBody.detail : 'The server rejected the request.'
      const code = mapStatus(response.status, detail, errorBody.error?.code ?? errorBody.code)
      throw new RemoteApiError(code, detail, response.status, errorBody.error?.retryable === true || response.status >= 500)
    }
    return body as TResult
  }
}

function parseTokenPair(input: unknown): TokenPair {
  if (!isRecord(input)
    || typeof input.accessToken !== 'string' || input.accessToken.length < 16
    || typeof input.refreshToken !== 'string' || input.refreshToken.length < 16
    || typeof input.accessTokenExpiresAt !== 'number' || !Number.isSafeInteger(input.accessTokenExpiresAt)
    || typeof input.refreshTokenExpiresAt !== 'number' || !Number.isSafeInteger(input.refreshTokenExpiresAt)) {
    invalidResponse('device credentials')
  }
  return {
    accessToken: input.accessToken,
    accessTokenExpiresAt: input.accessTokenExpiresAt,
    refreshToken: input.refreshToken,
    refreshTokenExpiresAt: input.refreshTokenExpiresAt,
  }
}

function parseServerHost(input: unknown): ServerHostDevice {
  if (!isRecord(input)
    || typeof input.deviceId !== 'string'
    || typeof input.name !== 'string'
    || typeof input.platform !== 'string'
    || input.role !== 'host'
    || typeof input.membershipId !== 'string'
    || input.membershipId.length === 0) {
    invalidResponse('host device')
  }
  return {
    deviceId: input.deviceId,
    name: input.name,
    platform: input.platform,
    role: 'host',
    membershipId: input.membershipId,
    ...(typeof input.clientVersion === 'string' ? { clientVersion: input.clientVersion } : {}),
    ...(typeof input.harnessVersion === 'string' ? { harnessVersion: input.harnessVersion } : {}),
    ...(typeof input.lastConnectedAt === 'number' ? { lastConnectedAt: input.lastConnectedAt } : {}),
  }
}

function parsePairingResult(input: unknown): PairingResult {
  if (!isRecord(input)
    || typeof input.pairingId !== 'string'
    || input.status !== 'waiting_host'
    || typeof input.expiresAt !== 'number' || !Number.isSafeInteger(input.expiresAt)
    || !isRecord(input.host)
    || typeof input.host.deviceId !== 'string'
    || typeof input.host.name !== 'string'
    || typeof input.host.platform !== 'string'
    || typeof input.host.identityKey !== 'string'
    || typeof input.host.fingerprint !== 'string') {
    invalidResponse('pairing claim')
  }
  return {
    pairingId: input.pairingId,
    status: 'waiting_host',
    expiresAt: input.expiresAt,
    host: {
      deviceId: input.host.deviceId,
      name: input.host.name,
      platform: input.host.platform,
      identityKey: input.host.identityKey,
      fingerprint: input.host.fingerprint,
    },
  }
}

function parsePairingStatus(input: unknown): PairingStatus {
  if (!isRecord(input)
    || !['waiting_host', 'paired', 'rejected', 'expired'].includes(String(input.status))
    || (input.membershipId !== null && input.membershipId !== undefined && typeof input.membershipId !== 'string')
    || (input.hostDeviceId !== null && input.hostDeviceId !== undefined && typeof input.hostDeviceId !== 'string')
    || (input.expiresAt !== null && input.expiresAt !== undefined
      && (typeof input.expiresAt !== 'number' || !Number.isSafeInteger(input.expiresAt)))) {
    invalidResponse('pairing status')
  }
  return {
    status: input.status as PairingStatus['status'],
    ...(typeof input.membershipId === 'string' ? { membershipId: input.membershipId } : {}),
    ...(typeof input.hostDeviceId === 'string' ? { hostDeviceId: input.hostDeviceId } : {}),
    ...(typeof input.expiresAt === 'number' ? { expiresAt: input.expiresAt } : {}),
  }
}

function invalidResponse(name: string): never {
  throw new RemoteApiError('INVALID_MESSAGE', `The server returned invalid ${name} data.`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function mapStatus(status: number, detail: string, serverCode: unknown): string {
  if (typeof serverCode === 'string') return serverCode
  if (detail.includes('expired') || status === 410) return 'PAIRING_EXPIRED'
  if (detail.includes('pairing')) return 'PAIRING_INVALID'
  if (status === 401) return 'AUTH_INVALID'
  if (status === 403) return 'AUTH_REQUIRED'
  if (status === 404) return 'DEVICE_NOT_FOUND'
  if (status === 409) return 'PAIRING_INVALID'
  if (status === 429) return 'RATE_LIMITED'
  return status >= 500 ? 'CONNECTION_FAILED' : 'INVALID_MESSAGE'
}
