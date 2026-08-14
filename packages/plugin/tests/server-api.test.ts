import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateKeyPair } from '@dsh-remote/crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HostIdentity } from '../src/identity-store.js'
import { HostServerApi } from '../src/server-api.js'
import { ServerCredentialStore } from '../src/server-credentials.js'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('HostServerApi', () => {
  it('registers the Host, persists credentials, and authenticates pairing calls', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-server-api-'))
    directories.push(directory)
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      if (url.endsWith('/devices/register')) return json(tokens())
      if (url.endsWith('/pairings')) return json({ pairingId: 'pair-1', code: 'ABCD-EFGH', expiresAt: Date.now() + 60_000, pairUri: 'dshremote://pair' })
      throw new Error(`unexpected request: ${url}`)
    }) as unknown as typeof fetch
    const store = new ServerCredentialStore(directory)
    const api = new HostServerApi('https://dsh.r2049.cn/', store, fetchMock)
    const identity = hostIdentity()

    await api.authenticate(identity)
    await api.create(identity)

    expect(calls[0]?.url).toBe('https://dsh.r2049.cn/api/v1/devices/register')
    expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({
      v: 1,
      device: { deviceId: identity.deviceId, role: 'host', identityKey: identity.publicKey },
    })
    expect(calls[1]?.init?.headers).toMatchObject({ Authorization: 'Bearer access-token-value' })
    if (process.platform !== 'win32') {
      expect((await stat(join(directory, 'server-credentials.json'))).mode & 0o777).toBe(0o600)
    }

    const reloaded = new HostServerApi('https://dsh.r2049.cn', store, fetchMock)
    await reloaded.authenticate(identity)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rotates an expiring access token through the refresh endpoint', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-server-refresh-'))
    directories.push(directory)
    const identity = hostIdentity()
    const store = new ServerCredentialStore(directory)
    await store.save({
      serverUrl: 'https://dsh.r2049.cn',
      deviceId: identity.deviceId,
      ...tokens({ accessTokenExpiresAt: Date.now() + 1_000 }),
    })
    const fetchMock = vi.fn(async () => json(tokens({ accessToken: 'rotated-access-value', refreshToken: 'rotated-refresh-value' }))) as unknown as typeof fetch
    const api = new HostServerApi('https://dsh.r2049.cn', store, fetchMock)

    await expect(api.authenticate(identity)).resolves.toMatchObject({ accessToken: 'rotated-access-value' })
    expect(JSON.parse(String(vi.mocked(fetchMock).mock.calls[0]?.[1]?.body))).toMatchObject({
      deviceId: identity.deviceId,
      refreshToken: 'refresh-token-value',
    })
  })
})

function hostIdentity(): HostIdentity {
  const keys = generateKeyPair(new Uint8Array(32).fill(9))
  return {
    schemaVersion: 1,
    deviceId: '0198a2d0-0000-7000-8000-000000000001',
    name: 'Test Host',
    fingerprint: '0000 0000 0000',
    ...keys,
  }
}

interface TestTokens {
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken: string
  refreshTokenExpiresAt: number
}

function tokens(overrides: Partial<TestTokens> = {}): TestTokens {
  return {
    accessToken: 'access-token-value',
    accessTokenExpiresAt: Date.now() + 600_000,
    refreshToken: 'refresh-token-value',
    refreshTokenExpiresAt: Date.now() + 86_400_000,
    ...overrides,
  }
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}
