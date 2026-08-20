import { describe, expect, it } from 'vitest'
import { automaticPreferredTransports, networkRouteForNativeType } from '../src/lib/network-route'

describe('automatic transport routing', () => {
  it('prefers LAN before every fallback on local or unknown networks', () => {
    expect(automaticPreferredTransports('local')).toEqual(['lan', 'p2p', 'turn', 'relay'])
    expect(automaticPreferredTransports('unknown')).toEqual(['lan', 'p2p', 'turn', 'relay'])
  })

  it('keeps P2P, TURN, and Relay available off the local network', () => {
    expect(automaticPreferredTransports('remote')).toEqual(['p2p', 'turn', 'relay'])
  })

  it('classifies Wi-Fi and Ethernet as local routes', () => {
    expect(networkRouteForNativeType('wifi')).toBe('local')
    expect(networkRouteForNativeType('ethernet')).toBe('local')
    expect(networkRouteForNativeType('cellular')).toBe('remote')
    expect(networkRouteForNativeType('unknown')).toBe('unknown')
  })
})
