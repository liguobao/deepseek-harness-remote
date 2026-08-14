import type { HostIdentity, IdentityStore, TrustedPeer } from './identity-store.js'
import { fingerprint } from './identity-store.js'

export interface PairingClaim {
  pairingId: string
  client: {
    deviceId: string
    name: string
    platform: string
    identityKey: string
    fingerprint: string
  }
  expiresAt: number
}

export interface PairingServer {
  create(identity: HostIdentity): Promise<{ pairingId: string; code: string; expiresAt: number; pairUri: string }>
  confirm(input: { pairingId: string; decision: 'approve' | 'deny'; clientDeviceId: string; clientFingerprint: string }): Promise<{ status: string; membershipId?: string }>
}

export class PairingController {
  private readonly claims = new Map<string, PairingClaim>()

  constructor(private readonly identities: IdentityStore, private readonly server: PairingServer) {}

  create() { return this.server.create(this.identities.current()) }

  receiveClaim(claim: PairingClaim): void {
    if (claim.expiresAt <= Date.now()) throw new PairingError('PAIRING_EXPIRED', 'The pairing request has expired.')
    if (normalizeFingerprint(fingerprint(claim.client.identityKey)) !== normalizeFingerprint(claim.client.fingerprint)) {
      throw new PairingError('PAIRING_FINGERPRINT_MISMATCH', 'The client fingerprint does not match its identity key.')
    }
    this.claims.set(claim.pairingId, structuredClone(claim))
  }

  pending(): PairingClaim[] {
    const now = Date.now()
    for (const [id, claim] of this.claims) if (claim.expiresAt <= now) this.claims.delete(id)
    return [...this.claims.values()].map(claim => structuredClone(claim))
  }

  async confirm(pairingId: string, decision: 'approve' | 'deny'): Promise<TrustedPeer | undefined> {
    const claim = this.claims.get(pairingId)
    if (claim === undefined) throw new PairingError('PAIRING_NOT_FOUND', 'The pairing request is not pending.')
    if (claim.expiresAt <= Date.now()) {
      this.claims.delete(pairingId)
      throw new PairingError('PAIRING_EXPIRED', 'The pairing request has expired.')
    }
    await this.server.confirm({
      pairingId,
      decision,
      clientDeviceId: claim.client.deviceId,
      clientFingerprint: normalizeFingerprint(claim.client.fingerprint),
    })
    this.claims.delete(pairingId)
    if (decision === 'deny') return undefined
    return this.identities.trustPeer({
      deviceId: claim.client.deviceId,
      name: claim.client.name,
      platform: claim.client.platform,
      publicKey: claim.client.identityKey,
    })
  }
}

export class PairingError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

function normalizeFingerprint(value: string): string { return value.replaceAll(/\s/g, '').toUpperCase() }
