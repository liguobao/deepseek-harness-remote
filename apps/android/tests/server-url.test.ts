import { describe, expect, it } from 'vitest'
import { normalizeServerUrl, parsePairLink, websocketUrl } from '../src/lib/server-url'

describe('server URL handling', () => {
  it('normalizes secure server and websocket URLs', () => {
    expect(normalizeServerUrl('remote.example.com/')).toBe('https://remote.example.com')
    expect(websocketUrl('https://remote.example.com')).toBe('wss://remote.example.com/ws/v1/connect')
  })

  it('allows cleartext only for local development', () => {
    expect(normalizeServerUrl('http://10.0.2.2:8080')).toBe('http://10.0.2.2:8080')
    expect(() => normalizeServerUrl('http://remote.example.com')).toThrow(/HTTPS/)
  })

  it('parses server deep links without pairing codes', () => {
    expect(parsePairLink('dshremote://pair?v=1&server=https%3A%2F%2Fremote.example.com')).toEqual({
      server: 'https://remote.example.com',
    })
    expect(parsePairLink('dshremote://pair?v=2&server=https%3A%2F%2Fremote.example.com')).toEqual({})
    expect(parsePairLink('https://example.com/not-a-pair-link')).toEqual({})
  })
})
