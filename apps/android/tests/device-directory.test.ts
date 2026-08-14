import { describe, expect, it, vi } from 'vitest'
import { reconcileTrustedDevices } from '../src/services/device-directory'
import type { RemoteDevice } from '../src/types'

describe('trusted device reconciliation', () => {
  it('keeps the locally pinned identity key and follows Server membership and presence', async () => {
    const trusted: RemoteDevice[] = [
      { deviceId: 'host-1', name: 'Old name', platform: 'linux', identityKey: 'pinned-key', online: false, fingerprint: 'AABB' },
      { deviceId: 'revoked-host', name: 'Revoked', platform: 'linux', identityKey: 'old-key', online: true },
    ]
    const api = {
      listDevices: vi.fn(async () => [{
        deviceId: 'host-1', name: 'Current name', platform: 'linux', role: 'host' as const,
        membershipId: 'membership-1', harnessVersion: '0.1.0',
      }]),
      getPresence: vi.fn(async () => ({ deviceId: 'host-1', online: true, lastSeenAt: 1234 })),
    }
    const result = await reconcileTrustedDevices(api, trusted)
    expect(result.missingTrustedDeviceIds).toEqual(['revoked-host'])
    expect(result.devices).toEqual([expect.objectContaining({
      deviceId: 'host-1',
      name: 'Current name',
      membershipId: 'membership-1',
      identityKey: 'pinned-key',
      fingerprint: 'AABB',
      online: true,
      lastSeenAt: 1234,
    })])
  })
})
