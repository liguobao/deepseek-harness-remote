import { describe, expect, it } from 'vitest'
import {
  automaticPreferredTransports,
  initialProbeTransports,
  networkRouteForNativeType,
  shouldReconnectForNetworkRoute,
} from '../src/lib/network-route'

describe('automatic transport routing', () => {
  it('prefers LAN before every fallback on local or unknown networks', () => {
    expect(automaticPreferredTransports('local')).toEqual(['lan', 'p2p', 'turn', 'relay'])
    expect(automaticPreferredTransports('unknown')).toEqual(['lan', 'p2p', 'turn', 'relay'])
  })

  it('keeps P2P, TURN, and Relay available off the local network', () => {
    expect(automaticPreferredTransports('remote')).toEqual(['p2p', 'turn', 'relay'])
  })

  it('shows only the first active probe group in connection progress', () => {
    expect(initialProbeTransports(['lan', 'p2p', 'turn', 'relay'])).toEqual(['lan', 'p2p'])
    expect(initialProbeTransports(['p2p', 'turn', 'relay'])).toEqual(['p2p'])
    expect(initialProbeTransports(['turn', 'relay'])).toEqual(['turn'])
    expect(initialProbeTransports(['relay'])).toEqual(['relay'])
  })

  it('classifies Wi-Fi and Ethernet as local routes', () => {
    expect(networkRouteForNativeType('wifi')).toBe('local')
    expect(networkRouteForNativeType('ethernet')).toBe('local')
    expect(networkRouteForNativeType('cellular')).toBe('remote')
    expect(networkRouteForNativeType('unknown')).toBe('unknown')
  })

  it('renegotiates only between confirmed local and remote routes', () => {
    expect(shouldReconnectForNetworkRoute('local', 'remote')).toBe(true)
    expect(shouldReconnectForNetworkRoute('remote', 'local')).toBe(true)
    expect(shouldReconnectForNetworkRoute(undefined, 'local')).toBe(false)
    expect(shouldReconnectForNetworkRoute('unknown', 'local')).toBe(false)
    expect(shouldReconnectForNetworkRoute('local', 'unknown')).toBe(false)
    expect(shouldReconnectForNetworkRoute('local', 'local')).toBe(false)
  })
})
