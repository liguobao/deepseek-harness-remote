import { describe, expect, it, vi } from 'vitest'
import { RemoteServerApi } from '../src/services/api'
import type { DeviceIdentity } from '../src/types'

const identity: DeviceIdentity = {
  deviceId: '0198abc0-1234-7abc-8123-123456789abc',
  name: 'Pixel · DSH Remote',
  platform: 'android',
  publicKey: 'A'.repeat(43),
  privateKey: 'B'.repeat(43),
}

describe('Remote Server API compatibility', () => {
  it('registers the Android descriptor and validates the token pair', async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.headers).not.toMatchObject({ Authorization: expect.anything() })
      expect(JSON.parse(String(init?.body))).toMatchObject({
        v: 1,
        device: { deviceId: identity.deviceId, role: 'client', platform: 'android', identityKey: identity.publicKey },
      })
      return jsonResponse(tokenPair('registered'))
    })
    const tokens = await new RemoteServerApi('https://remote.example.com', undefined, fetchImplementation).registerDevice(identity)
    expect(tokens.accessToken).toBe('access-registered-token')
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://remote.example.com/api/v1/devices/register',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uses Bearer auth and accepts Server device and presence shapes that omit identity keys', async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async input => {
      const url = String(input)
      if (url.endsWith('/presence')) {
        return jsonResponse({ deviceId: 'host-1', online: true, lastSeenAt: 1234 })
      }
      return jsonResponse({
        items: [{
          deviceId: 'host-1', name: 'Workstation', role: 'host', platform: 'linux',
          membershipId: 'membership-1', harnessVersion: '0.1.0', lastConnectedAt: null,
        }],
        nextCursor: null,
      })
    })
    const api = new RemoteServerApi('https://remote.example.com', 'access-token-for-client', fetchImplementation)
    expect(await api.listDevices()).toEqual([{
      deviceId: 'host-1', name: 'Workstation', role: 'host', platform: 'linux',
      membershipId: 'membership-1', harnessVersion: '0.1.0',
    }])
    expect(await api.getPresence('host-1')).toEqual({ deviceId: 'host-1', online: true, lastSeenAt: 1234 })
    expect(fetchImplementation.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer access-token-for-client' })
  })

  it('claims pairing and polls status with canonical protocol v1 payloads', async () => {
    const responses = [
      {
        pairingId: 'pairing-1',
        status: 'waiting_host',
        host: {
          deviceId: 'host-1', name: 'Host', platform: 'linux',
          identityKey: 'C'.repeat(43), fingerprint: 'AABB CCDD EEFF',
        },
        expiresAt: Date.now() + 60_000,
      },
      { status: 'paired', membershipId: 'membership-1', hostDeviceId: 'host-1' },
    ]
    const fetchImplementation = vi.fn<typeof fetch>(async () => jsonResponse(responses.shift()))
    const api = new RemoteServerApi('https://remote.example.com', 'access-token-for-client', fetchImplementation)
    await api.claimPairing('01A2-B3C4', identity.deviceId)
    await api.pairingStatus('pairing-1')

    expect(JSON.parse(String(fetchImplementation.mock.calls[0]?.[1]?.body))).toEqual({
      v: 1,
      code: '01A2B3C4',
      clientDeviceId: identity.deviceId,
    })
    expect(fetchImplementation.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer access-token-for-client' })
    expect(fetchImplementation.mock.calls[1]?.[0]).toBe('https://remote.example.com/api/v1/pairings/pairing-1/status')
  })

  it('preserves stable Server error codes and retryability', async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () => jsonResponse({
      error: { code: 'MEMBERSHIP_REQUIRED', message: 'membership revoked', retryable: false },
    }, 403))
    const api = new RemoteServerApi('https://remote.example.com', 'access-token-for-client', fetchImplementation)
    await expect(api.getDevice('host-1')).rejects.toMatchObject({
      code: 'MEMBERSHIP_REQUIRED',
      status: 403,
      retryable: false,
    })
  })
})

function tokenPair(suffix: string) {
  return {
    accessToken: `access-${suffix}-token`,
    accessTokenExpiresAt: Date.now() + 60_000,
    refreshToken: `refresh-${suffix}-token`,
    refreshTokenExpiresAt: Date.now() + 120_000,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
