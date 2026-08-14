import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { hostname, tmpdir } from 'node:os'
import { join } from 'node:path'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { generateKeyPair } from '@dsh-remote/crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HostConnectionHandle } from '../src/client-runtime.js'
import { resolveConfig, type Config } from '../src/config.js'
import { PluginControlRuntime, type PluginSettingsView } from '../src/control-runtime.js'
import { fingerprint, serverStorageDirectory } from '../src/identity-store.js'

const directories: string[] = []

afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('PluginControlRuntime settings setup', () => {
  it('authorizes a Host before saving its Server and role without persisting the password', async () => {
    const directory = await temporaryDirectory()
    const settings = settingsScope({ serverUrl: 'https://old.example.com', role: 'client' })
    const calls: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
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
      throw new Error(`unexpected request: ${url}`)
    }))
    const handler = register(new PluginControlRuntime(
      resolveConfig(settings.get()), directory, settings, undefined, undefined,
    ))

    const result = await handler('settings.configure', {
      role: 'host',
      serverUrl: 'https://dsh.r2049.cn/',
      email: 'host@example.com',
      password: 'correct horse battery staple',
    }, signal())

    expect(result).toMatchObject({ ok: true, value: { status: 'authorized', role: 'host', account: 'host@example.com' } })
    expect(settings.get()).toMatchObject({ role: 'host', serverUrl: 'https://dsh.r2049.cn' })
    expect(settings.get()).not.toHaveProperty('deviceName')
    expect(JSON.parse(String(calls[1]?.init?.body))).toMatchObject({ device: { name: hostname(), role: 'host' } })
    expect(JSON.stringify(settings.get())).not.toContain('correct horse battery staple')
  })

  it('claims a Client authorization code and persists Host trust after approval', async () => {
    const directory = await temporaryDirectory()
    const settings = settingsScope({})
    const hostKeys = generateKeyPair(new Uint8Array(32).fill(7))
    const calls: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      if (url.endsWith('/devices/register')) return json(tokens())
      if (url.endsWith('/pairings/claim')) return json({
        pairingId: 'pairing-1',
        expiresAt: Date.now() + 60_000,
        host: {
          deviceId: 'host-device-1',
          name: 'Remote Host',
          platform: 'linux',
          identityKey: hostKeys.publicKey,
          fingerprint: fingerprint(hostKeys.publicKey),
        },
      })
      if (url.endsWith('/pairings/pairing-1/status')) return json({
        status: 'paired',
        membershipId: 'membership-1',
        hostDeviceId: 'host-device-1',
      })
      throw new Error(`unexpected request: ${url}`)
    }))
    const handler = register(new PluginControlRuntime(
      resolveConfig(settings.get()), directory, settings, undefined, undefined,
    ))

    const configured = await handler('settings.configure', {
      role: 'client',
      serverUrl: 'https://dsh.r2049.cn',
      authorizationCode: 'ABCD-EFGH',
    }, signal())
    expect(configured).toMatchObject({
      ok: true,
      value: { status: 'waiting_host', settings: { pendingPairing: { pairingId: 'pairing-1' } } },
    })
    expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({ device: { name: hostname(), role: 'client' } })
    expect(JSON.parse(String(calls[1]?.init?.body))).toMatchObject({ code: 'ABCDEFGH' })

    const paired = await handler('settings.pairing.status', { pairingId: 'pairing-1' }, signal())
    expect(paired).toMatchObject({ ok: true, value: { status: 'paired' } })
    if (!paired.ok) throw new Error(paired.error.message)
    expect((paired.value as { settings: PluginSettingsView }).settings).not.toHaveProperty('pendingPairing')
    const clientDirectory = serverStorageDirectory(directory, 'https://dsh.r2049.cn', 'client')
    await expect(readFile(join(clientDirectory, 'trusted-peers.json'), 'utf8')).resolves.toContain('membership-1')
  })
})

function register(runtime: PluginControlRuntime) {
  let handler: ((endpoint: string, payload: unknown, signal: AbortSignal) => Promise<RpcResult<unknown>>) | undefined
  runtime.register({
    rpc: {
      handle: (_channel, next) => {
        handler = next
        return async () => undefined
      },
    },
  } satisfies HostConnectionHandle)
  if (handler === undefined) throw new Error('control handler was not registered')
  return handler
}

function settingsScope(initial: Config): SettingsScope<Config> {
  let value = structuredClone(initial)
  return {
    get: () => structuredClone(value),
    watch: () => () => undefined,
    update: async patch => { value = { ...value, ...patch } },
    replace: async section => { value = structuredClone(section as Config) },
  }
}

function signal(): AbortSignal { return new AbortController().signal }

function tokens() {
  return {
    accessToken: 'access-token-value',
    accessTokenExpiresAt: Date.now() + 600_000,
    refreshToken: 'refresh-token-value',
    refreshTokenExpiresAt: Date.now() + 86_400_000,
  }
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-remote-control-'))
  directories.push(directory)
  return directory
}
