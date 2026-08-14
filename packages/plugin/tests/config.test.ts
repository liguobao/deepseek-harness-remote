import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.js'

describe('plugin config', () => {
  it('applies safe defaults', () => {
    expect(resolveConfig({}, {})).toMatchObject({
      enabled: true,
      forceRelay: false,
      approvalTimeoutMs: 120_000,
      reconnect: { enabled: true, initialDelayMs: 1_000, maxDelayMs: 30_000, jitter: 0.2 },
    })
  })

  it('rejects insecure non-local servers and embedded credentials', () => {
    expect(() => resolveConfig({ serverUrl: 'http://remote.example.com' })).toThrow(/HTTPS/)
    expect(() => resolveConfig({ serverUrl: 'https://user:password@remote.example.com' })).toThrow(/credentials/)
    expect(() => resolveConfig({ serverUrl: 'https://remote.example.com?token=secret' })).toThrow(/query parameters/)
    expect(resolveConfig({ serverUrl: 'http://localhost:8080' }).serverUrl).toBe('http://localhost:8080')
  })

  it('rejects an inverted reconnect range', () => {
    expect(() => resolveConfig({ reconnect: { initialDelayMs: 5_000, maxDelayMs: 1_000 } })).toThrow(/maxDelayMs/)
  })
})
