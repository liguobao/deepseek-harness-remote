import { describe, expect, it, vi } from 'vitest'
import { RemoteServerApi } from '../src/services/api'
import { ServerSessionManager } from '../src/services/server-session-manager'
import type { DeviceCredentials, DeviceIdentity } from '../src/types'

const identity: DeviceIdentity = {
  deviceId: '0198abc0-1234-7abc-8123-123456789abc',
  name: 'Pixel',
  platform: 'android',
  publicKey: 'A'.repeat(43),
  privateKey: 'B'.repeat(43),
}

describe('Server credential session', () => {
  it('single-flights refresh token rotation and atomically saves the replacement', async () => {
    const oldCredentials: DeviceCredentials = {
      deviceId: identity.deviceId,
      serverUrl: 'https://remote.example.com',
      accessToken: 'expired-access-token',
      accessTokenExpiresAt: Date.now() - 1,
      refreshToken: 'current-refresh-token',
      refreshTokenExpiresAt: Date.now() + 120_000,
    }
    const save = vi.fn(async (_credentials: DeviceCredentials) => {})
    const persistence = { load: vi.fn(async () => oldCredentials), save }
    const fetchImplementation = vi.fn<typeof fetch>(async input => {
      expect(String(input)).toContain('/api/v1/auth/refresh')
      await Promise.resolve()
      return jsonResponse({
        accessToken: 'replacement-access-token',
        accessTokenExpiresAt: Date.now() + 60_000,
        refreshToken: 'replacement-refresh-token',
        refreshTokenExpiresAt: Date.now() + 120_000,
      })
    })
    const manager = new ServerSessionManager(
      persistence,
      (baseUrl, accessToken) => new RemoteServerApi(baseUrl, accessToken, fetchImplementation),
    )

    const [first, second] = await Promise.all([
      manager.authenticate('https://remote.example.com', identity),
      manager.authenticate('https://remote.example.com', identity),
    ])

    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(first.credentials.accessToken).toBe('replacement-access-token')
    expect(second.credentials).toEqual(first.credentials)
  })

  it('idempotently re-registers when the refresh credential has expired', async () => {
    const expired: DeviceCredentials = {
      deviceId: identity.deviceId,
      serverUrl: 'https://remote.example.com',
      accessToken: 'expired-access-token',
      accessTokenExpiresAt: Date.now() - 1,
      refreshToken: 'expired-refresh-token',
      refreshTokenExpiresAt: Date.now() - 1,
    }
    const fetchImplementation = vi.fn<typeof fetch>(async input => {
      expect(String(input)).toContain('/api/v1/devices/register')
      return jsonResponse({
        accessToken: 'registered-access-token',
        accessTokenExpiresAt: Date.now() + 60_000,
        refreshToken: 'registered-refresh-token',
        refreshTokenExpiresAt: Date.now() + 120_000,
      })
    })
    const manager = new ServerSessionManager(
      { load: async () => expired, save: async () => {} },
      (baseUrl, accessToken) => new RemoteServerApi(baseUrl, accessToken, fetchImplementation),
    )
    const result = await manager.authenticate('https://remote.example.com', identity)
    expect(result.credentials.accessToken).toBe('registered-access-token')
  })
})

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
