import { generateKeyPair } from '@dsh-remote/crypto'
import { describe, expect, it, vi } from 'vitest'
import type { HostIdentity, IdentityStore } from '../src/identity-store.js'
import { fingerprint } from '../src/identity-store.js'
import { PairingController, PairingError, type PairingClaim, type PairingServer } from '../src/pairing-controller.js'

describe('PairingController', () => {
  it('requires a matching fingerprint before local trust is written', () => {
    const controller = createController()
    expect(() => controller.receiveClaim(claim('0000 0000 0000'))).toThrow(PairingError)
  })

  it('writes trust only after an approved server confirmation', async () => {
    const keys = generateKeyPair()
    const trustPeer = vi.fn(async (peer: any) => ({ ...peer, fingerprint: fingerprint(peer.publicKey), trustedAt: 1 }))
    const confirm = vi.fn(async () => ({ status: 'paired', membershipId: 'member-1' }))
    const controller = createController({ trustPeer, confirm }, keys)
    controller.receiveClaim(claim(fingerprint(keys.publicKey), keys))
    await expect(controller.confirm('pair-1', 'approve')).resolves.toMatchObject({ deviceId: 'client-1' })
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ clientFingerprint: fingerprint(keys.publicKey).replaceAll(' ', '') }))
    expect(trustPeer).toHaveBeenCalledOnce()
  })
})

function createController(
  overrides: { trustPeer?: ReturnType<typeof vi.fn>; confirm?: ReturnType<typeof vi.fn> } = {},
  keys = generateKeyPair(),
): PairingController {
  const identity = { deviceId: 'host-1' } as HostIdentity
  const store = {
    current: () => identity,
    trustPeer: overrides.trustPeer ?? vi.fn(),
  } as unknown as IdentityStore
  const server = {
    create: vi.fn(),
    confirm: overrides.confirm ?? vi.fn(async () => ({ status: 'paired' })),
  } as unknown as PairingServer
  const controller = new PairingController(store, server)
  latestKeys = keys
  return controller
}

let latestKeys = generateKeyPair()

function claim(displayFingerprint: string, keys = latestKeys): PairingClaim {
  return {
    pairingId: 'pair-1',
    client: { deviceId: 'client-1', name: 'Pixel', platform: 'android', identityKey: keys.publicKey, fingerprint: displayFingerprint },
    expiresAt: Date.now() + 10_000,
  }
}
