import { RemoteApiError } from '../lib/errors'
import { normalizeServerUrl } from '../lib/server-url'
import type { DeviceIdentity, PairingResult, PairingStatus, RemoteDevice } from '../types'

interface ErrorBody {
  detail?: unknown
  code?: unknown
}

export class RemoteServerApi {
  readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = normalizeServerUrl(baseUrl)
  }

  async health(): Promise<void> {
    const body = await this.request<{ status?: unknown }>('/health')
    if (body.status !== 'ok') throw new RemoteApiError('CONNECTION_FAILED', 'The server health check failed.')
  }

  listDevices(): Promise<RemoteDevice[]> {
    return this.request<RemoteDevice[]>('/api/v1/devices')
  }

  getDevice(deviceId: string): Promise<RemoteDevice> {
    return this.request<RemoteDevice>(`/api/v1/devices/${encodeURIComponent(deviceId)}`)
  }

  claimPairing(code: string, identity: DeviceIdentity): Promise<PairingResult> {
    return this.request<PairingResult>('/api/v1/pairings/claim', {
      method: 'POST',
      body: JSON.stringify({
        code,
        client: {
          deviceId: identity.deviceId,
          name: identity.name,
          platform: identity.platform,
          publicKey: identity.publicKey,
        },
      }),
    })
  }

  pairingStatus(pairingId: string): Promise<PairingStatus> {
    return this.request<PairingStatus>(`/api/v1/pairings/${encodeURIComponent(pairingId)}`)
  }

  async removeDevice(deviceId: string): Promise<void> {
    await this.request(`/api/v1/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
  }

  private async request<TResult>(path: string, init: RequestInit = {}): Promise<TResult> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
      })
    } catch (error) {
      throw new RemoteApiError('CONNECTION_FAILED', error instanceof Error ? error.message : 'Server request failed.')
    }

    const text = await response.text()
    let body: unknown = undefined
    if (text.length > 0) {
      try {
        body = JSON.parse(text)
      } catch {
        body = undefined
      }
    }
    if (!response.ok) {
      const errorBody = (body ?? {}) as ErrorBody
      const detail = typeof errorBody.detail === 'string' ? errorBody.detail : 'The server rejected the request.'
      const code = mapStatus(response.status, detail, errorBody.code)
      throw new RemoteApiError(code, detail, response.status)
    }
    return body as TResult
  }
}

function mapStatus(status: number, detail: string, serverCode: unknown): string {
  if (typeof serverCode === 'string') return serverCode
  if (detail.includes('expired') || status === 410) return 'PAIRING_EXPIRED'
  if (detail.includes('pairing') || status === 404) return 'PAIRING_INVALID'
  if (status === 401 || status === 403) return 'AUTH_FAILED'
  if (status === 409) return 'PAIRING_INVALID'
  return 'CONNECTION_FAILED'
}
