import type { RemoteDevice } from '../types'
import type { RemoteServerApi } from './api'

export interface ReconciledDevices {
  devices: RemoteDevice[]
  missingTrustedDeviceIds: string[]
}

/**
 * Reconcile Server membership metadata with locally pinned Host identities.
 * The Server intentionally omits identityKey from device reads, so the local
 * trusted key always wins and no Server response can silently replace it.
 */
export async function reconcileTrustedDevices(
  api: Pick<RemoteServerApi, 'listDevices' | 'getPresence'>,
  trusted: RemoteDevice[],
): Promise<ReconciledDevices> {
  const memberships = await api.listDevices()
  const byId = new Map(memberships.map(device => [device.deviceId, device]))
  const missingTrustedDeviceIds = trusted
    .filter(device => !byId.has(device.deviceId))
    .map(device => device.deviceId)

  const devices = await Promise.all(trusted.flatMap(local => {
    const server = byId.get(local.deviceId)
    if (server === undefined) return []
    return [api.getPresence(local.deviceId).then(
      presence => ({
        ...local,
        ...server,
        identityKey: local.identityKey,
        fingerprint: local.fingerprint,
        online: presence.online,
        lastSeenAt: presence.lastSeenAt ?? local.lastSeenAt,
        trusted: true,
      }),
      () => ({
        ...local,
        ...server,
        identityKey: local.identityKey,
        fingerprint: local.fingerprint,
        online: false,
        trusted: true,
      }),
    )]
  }))
  return { devices, missingTrustedDeviceIds }
}
