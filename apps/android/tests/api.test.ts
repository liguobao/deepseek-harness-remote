import { afterEach, describe, expect, it, vi } from 'vitest'
import { RemoteServerApi } from '../src/services/api'
import type { DeviceIdentity } from '../src/types'

afterEach(() => vi.unstubAllGlobals())

describe('RemoteServerApi protocol v1', () => {
  it('registers and claims pairing with canonical payloads and bearer auth', async () => {
    const responses = [
      { accessToken: 'access', accessTokenExpiresAt: 10, refreshToken: 'refresh', refreshTokenExpiresAt: 20 },
      {
        pairingId: 'pair-1',
        status: 'waiting_host',
        host: { deviceId: 'host-1', name: 'Host', role: 'host', platform: 'linux', identityKey: 'host-key', clientVersion: '0.1.0' },
        expiresAt: 30,
      },
      { status: 'paired', membershipId: 'member-1', hostDeviceId: 'host-1' },
    ]
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init])
      return new Response(JSON.stringify(responses.shift()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const identity: DeviceIdentity = {
      deviceId: 'client-1',
      name: 'Pixel',
      platform: 'android',
      publicKey: 'client-key',
      privateKey: 'private-key',
    }

    await new RemoteServerApi('https://remote.example').registerDevice(identity)
    await new RemoteServerApi('https://remote.example', 'access').claimPairing('82KF-7QMP', identity.deviceId)
    await new RemoteServerApi('https://remote.example', 'access').pairingStatus('pair-1')

    expect(JSON.parse(calls[0]![1]!.body as string)).toEqual({
      v: 1,
      device: {
        deviceId: 'client-1',
        name: 'Pixel',
        role: 'client',
        platform: 'android',
        identityKey: 'client-key',
        clientVersion: '0.1.0',
      },
    })
    expect(calls[1]![1]!.headers).toMatchObject({ Authorization: 'Bearer access' })
    expect(JSON.parse(calls[1]![1]!.body as string)).toEqual({
      v: 1,
      code: '82KF7QMP',
      clientDeviceId: 'client-1',
    })
    expect(calls[2]![0]).toBe('https://remote.example/api/v1/pairings/pair-1/status')
  })
})
