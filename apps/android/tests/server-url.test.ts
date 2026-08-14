import { describe, expect, it } from 'vitest'
import { normalizePairingCode, normalizeServerUrl, parsePairLink, websocketUrl } from '../src/lib/server-url'

describe('server URL handling', () => {
  it('normalizes secure server and websocket URLs', () => {
    expect(normalizeServerUrl('remote.example.com/')).toBe('https://remote.example.com')
    expect(websocketUrl('https://remote.example.com')).toBe('wss://remote.example.com/ws/v1/connect')
  })

  it('allows cleartext only for local development', () => {
    expect(normalizeServerUrl('http://10.0.2.2:8080')).toBe('http://10.0.2.2:8080')
    expect(() => normalizeServerUrl('http://remote.example.com')).toThrow(/HTTPS/)
  })

  it('formats pairing codes and parses deep links', () => {
    expect(normalizePairingCode('82kf 7qmp')).toBe('82KF-7QMP')
    expect(parsePairLink('dshremote://pair?v=1&server=https%3A%2F%2Fremote.example.com&code=82KF-7QMP')).toEqual({
      server: 'https://remote.example.com',
      code: '82KF-7QMP',
    })
  })
})
