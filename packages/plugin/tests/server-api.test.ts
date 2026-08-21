import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateKeyPair } from '@dsh-remote/crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HostIdentity } from '../src/identity-store.js'
import { ClientServerApi, HostServerApi } from '../src/server-api.js'
import { ServerCredentialStore } from '../src/server-credentials.js'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('HostServerApi', () => {
  it('logs in, authorizes Host registration, persists device credentials, and authenticates peer lookup', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-server-api-'))
    directories.push(directory)
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      if (url.endsWith('/auth/login')) return json({
        token: 'web-account-token-value',
        expiresAt: Date.now() + 600_000,
        account: 'host@example.com',
        profile: {},
        isAdmin: false,
      })
      if (url.endsWith('/devices/register')) return json(tokens())
      if (url.endsWith('/devices/client-1')) return json({
        deviceId: 'client-1',
        name: 'Browser',
        role: 'client',
        platform: 'web',
        identityKey: generateKeyPair(new Uint8Array(32).fill(4)).publicKey,
        membershipId: 'membership-1',
      })
      throw new Error(`unexpected request: ${url}`)
    }) as unknown as typeof fetch
    const store = new ServerCredentialStore(directory)
    const api = new HostServerApi('https://dsh.r2049.cn/', store, fetchMock)
    const identity = hostIdentity()

    await api.authorizeWithAccount(identity, 'host@example.com', 'correct horse battery staple')
    await api.deviceFor('client-1')

    expect(calls[0]?.url).toBe('https://dsh.r2049.cn/api/v1/auth/login')
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      email: 'host@example.com', password: 'correct horse battery staple',
    })
    expect(calls[1]?.url).toBe('https://dsh.r2049.cn/api/v1/devices/register')
    expect(calls[1]?.init?.headers).toMatchObject({ Authorization: 'Bearer web-account-token-value' })
    const registeredDevice = JSON.parse(String(calls[1]?.init?.body))
    expect(registeredDevice).toMatchObject({
      v: 1,
      device: { deviceId: identity.deviceId, role: 'host', identityKey: identity.publicKey },
    })
    expect(registeredDevice.device).not.toHaveProperty('harnessVersion')
    expect(calls[2]?.init?.headers).toMatchObject({ Authorization: 'Bearer access-token-value' })
    const stored = await readFile(join(directory, 'server-credentials.json'), 'utf8')
    expect(stored).toContain('host@example.com')
    expect(stored).not.toContain('correct horse battery staple')
    expect(stored).not.toContain('web-account-token-value')
    if (process.platform !== 'win32') {
      expect((await stat(join(directory, 'server-credentials.json'))).mode & 0o777).toBe(0o600)
    }

    const reloaded = new HostServerApi('https://dsh.r2049.cn', store, fetchMock)
    await reloaded.authenticate(identity)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(reloaded.currentAuthorization()).toMatchObject({ method: 'account', account: 'host@example.com' })
  })

  it('registers a Host with a one-time account enrollment code', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-server-code-'))
    directories.push(directory)
    const fetchMock = vi.fn(async () => json(tokens())) as unknown as typeof fetch
    const store = new ServerCredentialStore(directory)
    const api = new HostServerApi('https://dsh.r2049.cn', store, fetchMock)
    const identity = hostIdentity()

    await expect(api.authorizeHostWithCode(identity, 'abcd-efgh')).resolves.toEqual({
      method: 'host_registration_code',
    })

    expect(String(vi.mocked(fetchMock).mock.calls[0]?.[0])).toBe('https://dsh.r2049.cn/api/v1/devices/register-with-code')
    expect(JSON.parse(String(vi.mocked(fetchMock).mock.calls[0]?.[1]?.body))).toMatchObject({
      code: 'ABCD-EFGH',
      device: { deviceId: identity.deviceId, role: 'host', identityKey: identity.publicKey },
    })
    await expect(store.load('https://dsh.r2049.cn', identity.deviceId)).resolves.toMatchObject({
      authorizationMethod: 'host_registration_code',
    })
  })

  it('authorizes the opposite role from an already owned device credential', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-server-owned-role-'))
    directories.push(directory)
    const fetchMock = vi.fn(async () => json(tokens())) as unknown as typeof fetch
    const store = new ServerCredentialStore(directory)
    const api = new ClientServerApi('https://dsh.r2049.cn', store, fetchMock)
    const identity = hostIdentity()

    await expect(api.authorizeOwnedRole(identity, 'authorizing-device-token', 'owner@example.com')).resolves.toEqual({
      method: 'owned_device',
      account: 'owner@example.com',
    })

    expect(String(vi.mocked(fetchMock).mock.calls[0]?.[0])).toBe('https://dsh.r2049.cn/api/v1/devices/register-owned-role')
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer authorizing-device-token',
    })
    expect(JSON.parse(String(vi.mocked(fetchMock).mock.calls[0]?.[1]?.body))).toMatchObject({
      device: { deviceId: identity.deviceId, role: 'client' },
    })
    await expect(store.load('https://dsh.r2049.cn', identity.deviceId)).resolves.toMatchObject({
      authorizationMethod: 'owned_device',
      account: 'owner@example.com',
    })
  })

  it('revokes the current Server device before clearing local credentials', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-server-sign-out-'))
    directories.push(directory)
    const identity = hostIdentity()
    const store = new ServerCredentialStore(directory)
    await store.save({
      serverUrl: 'https://dsh.r2049.cn',
      deviceId: identity.deviceId,
      authorizationMethod: 'account',
      account: 'owner@example.com',
      ...tokens(),
    })
    const fetchMock = vi.fn(async () => json({ deviceId: identity.deviceId })) as unknown as typeof fetch
    const api = new HostServerApi('https://dsh.r2049.cn', store, fetchMock)
    api.bindIdentity(identity)

    await api.revokeCurrentDevice()

    expect(String(vi.mocked(fetchMock).mock.calls[0]?.[0])).toBe('https://dsh.r2049.cn/api/v1/devices/self')
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]).toMatchObject({
      method: 'DELETE',
      headers: { Authorization: 'Bearer access-token-value' },
    })
    await expect(store.load('https://dsh.r2049.cn', identity.deviceId)).resolves.toBeUndefined()
  })

  it('reports account authorization when a fresh Host cannot register anonymously', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-server-account-required-'))
    directories.push(directory)
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      error: { code: 'ACCOUNT_AUTH_REQUIRED', message: 'host registration requires account login', retryable: false },
    }), { status: 401, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch
    const api = new HostServerApi('https://dsh.r2049.cn', new ServerCredentialStore(directory), fetchMock)

    await expect(api.authenticate(hostIdentity())).rejects.toMatchObject({ code: 'ACCOUNT_AUTH_REQUIRED', retryable: false })
  })

  it('rotates an expiring access token through the refresh endpoint', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-server-refresh-'))
    directories.push(directory)
    const identity = hostIdentity()
    const store = new ServerCredentialStore(directory)
    await store.save({
      serverUrl: 'https://dsh.r2049.cn',
      deviceId: identity.deviceId,
      authorizationMethod: 'account',
      account: 'host@example.com',
      ...tokens({ accessTokenExpiresAt: Date.now() + 1_000 }),
    })
    const fetchMock = vi.fn(async () => json(tokens({ accessToken: 'rotated-access-value', refreshToken: 'rotated-refresh-value' }))) as unknown as typeof fetch
    const api = new HostServerApi('https://dsh.r2049.cn', store, fetchMock)

    await expect(api.authenticate(identity)).resolves.toMatchObject({ accessToken: 'rotated-access-value' })
    await expect(store.load('https://dsh.r2049.cn', identity.deviceId)).resolves.toMatchObject({ account: 'host@example.com' })
    expect(JSON.parse(String(vi.mocked(fetchMock).mock.calls[0]?.[1]?.body))).toMatchObject({
      deviceId: identity.deviceId,
      refreshToken: 'refresh-token-value',
    })
  })

  it('registers the local remote-mode identity as a client device', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-server-client-'))
    directories.push(directory)
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/auth/login')) return json({
        token: 'web-account-token-value',
        expiresAt: Date.now() + 600_000,
        account: 'client@example.com',
        profile: {},
        isAdmin: false,
      })
      return json(tokens())
    }) as unknown as typeof fetch
    const identity = hostIdentity()
    const api = new ClientServerApi('https://dsh.r2049.cn', new ServerCredentialStore(directory), fetchMock)

    await api.authorizeWithAccount(identity, 'client@example.com', 'correct horse battery staple')

    expect(JSON.parse(String(vi.mocked(fetchMock).mock.calls[1]?.[1]?.body))).toMatchObject({
      device: { deviceId: identity.deviceId, role: 'client' },
    })
    expect(vi.mocked(fetchMock).mock.calls[1]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer web-account-token-value' })
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
