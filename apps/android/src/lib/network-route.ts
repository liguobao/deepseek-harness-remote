export type NetworkRoute = 'local' | 'remote' | 'unknown'

export type PreferredTransport = 'lan' | 'p2p' | 'turn' | 'relay'

export function networkRouteForNativeType(type: string | null | undefined): NetworkRoute {
  if (type === 'wifi' || type === 'ethernet') return 'local'
  if (type === undefined || type === null || type === 'unknown' || type === 'none') return 'unknown'
  return 'remote'
}

/**
 * Keep LAN first whenever the device is on a local-capable network. ICE still
 * validates the candidate pair; this only expresses the preferred order to
 * the Host and Server control plane.
 */
export function automaticPreferredTransports(route: NetworkRoute): PreferredTransport[] {
  if (route === 'remote') return ['p2p', 'turn', 'relay']
  return ['lan', 'p2p', 'turn', 'relay']
}
