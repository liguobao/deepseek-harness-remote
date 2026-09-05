import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServerApi } from '../src/server-api.js'

const identity = {
  deviceId: '0198abc0-1234-7abc-8123-123456789abc',
  name: 'Chrome · DSH Remote',
  platform: 'browser',
  publicKey: 'A'.repeat(43),
  privateKey: 'B'.repeat(43),
}

describe('ServerApi browser authorization', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('accepts a valid exchange response that includes the account', async () => {
    const response = {
      accessToken: 'fixture-access-token',
      accessTokenExpiresAt: 1_786_000_000_000,
      refreshToken: 'fixture-refresh-token',
      refreshTokenExpiresAt: 1_789_000_000_000,
      account: 'fixture@example.com',
    }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const credentials = await new ServerApi('https://server.example.com/', 'web-account-token')
      .exchangeBrowserAuthorization(identity)

    expect(credentials).toEqual({
      serverUrl: 'https://server.example.com',
      deviceId: identity.deviceId,
      ...response,
    })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server.example.com/api/v1/auth/browser-authorizations/exchange',
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer web-account-token' }),
    })
  })
})
