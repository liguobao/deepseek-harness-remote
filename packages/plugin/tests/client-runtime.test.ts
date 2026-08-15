import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ApiProxy, RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import { generateKeyPair } from '@dsh-remote/crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClientModeRuntime, type HostAuthorizationControl, type HostConnectionHandle } from '../src/client-runtime.js'
import type { ResolvedConfig } from '../src/config.js'
import { IdentityStore } from '../src/identity-store.js'
import type { SafeLogger } from '../src/logging.js'
import type { ClientServerApi } from '../src/server-api.js'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('ClientModeRuntime Host account control', () => {
  it('exposes Host authorization status and forwards login only through loopback control', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-client-runtime-'))
    directories.push(directory)
    const host = {
      hostStatus: vi.fn(() => ({
        configured: true,
        online: false,
        reconnecting: false,
        error: 'ACCOUNT_AUTH_REQUIRED',
        accountRequired: true,
      })),
      reconnectHost: vi.fn(),
      authorizeHostWithAccount: vi.fn(async (email: string) => ({ account: email, expiresAt: Date.now() + 60_000, isAdmin: false })),
      authorizeHostWithCode: vi.fn(async () => ({ method: 'host_registration_code' })),
    } satisfies HostAuthorizationControl
    const runtime = new ClientModeRuntime(
      config(),
      new IdentityStore({ directory }),
      { bindIdentity: vi.fn() } as unknown as ClientServerApi,
      apiProxy(),
      logger(),
      host,
    )
    await runtime.start()

    let handler: ((endpoint: string, payload: unknown, signal: AbortSignal) => Promise<RpcResult<unknown>>) | undefined
    const connection = {
      rpc: {
        handle: vi.fn((_channel, next) => {
          handler = next
          return async () => undefined
        }),
      },
    } as unknown as HostConnectionHandle
    const dispose = runtime.registerControl(connection)
    const signal = new AbortController().signal

    await expect(handler?.('status', {}, signal)).resolves.toMatchObject({
      ok: true,
      value: { host: { accountRequired: true, error: 'ACCOUNT_AUTH_REQUIRED' } },
    })
    await expect(handler?.('host.account.login', {
      email: 'host@example.com', password: 'correct horse battery staple',
    }, signal)).resolves.toMatchObject({ ok: true, value: { account: 'host@example.com' } })
    expect(host.authorizeHostWithAccount).toHaveBeenCalledWith('host@example.com', 'correct horse battery staple')

    await dispose()
    await runtime.close()
  })

  it('pins Host identity from an account-authorized device detail and rejects key replacement', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-client-trust-'))
    directories.push(directory)
    const identities = new IdentityStore({ directory })
    const first = generateKeyPair(new Uint8Array(32).fill(21))
    const replacement = generateKeyPair(new Uint8Array(32).fill(22))
    let identityKey = first.publicKey
    const server = {
      baseUrl: 'https://dsh.r2049.cn',
      bindIdentity: vi.fn(),
      listDevices: vi.fn(async () => [{
        deviceId: 'host-device-1',
        name: 'Workstation',
        platform: 'linux',
        membershipId: 'membership-1',
      }]),
      deviceFor: vi.fn(async () => ({
        deviceId: 'host-device-1',
        name: 'Workstation',
        role: 'host' as const,
        platform: 'linux',
        identityKey,
        membershipId: 'membership-1',
      })),
      presenceFor: vi.fn(async () => ({ online: true })),
    } as unknown as ClientServerApi
    const runtime = new ClientModeRuntime(config(), identities, server, apiProxy(), logger())
    await runtime.start()

    await expect(runtime.devices()).resolves.toMatchObject([{ deviceId: 'host-device-1', online: true }])
    expect(identities.trustedPeer('host-device-1')).toMatchObject({
      publicKey: first.publicKey,
      membershipId: 'membership-1',
    })

    identityKey = replacement.publicKey
    await expect(runtime.devices()).rejects.toMatchObject({ code: 'PEER_IDENTITY_MISMATCH' })
    expect(identities.trustedPeer('host-device-1')?.publicKey).toBe(first.publicKey)
    await runtime.close()
  })
})

function config(): ResolvedConfig {
  return {
    enabled: true,
    role: 'both',
    serverUrl: 'https://dsh.r2049.cn',
    deviceName: 'Local Harness',
    forceRelay: false,
    logLevel: 'error',
    reconnect: { enabled: true, initialDelayMs: 100, maxDelayMs: 1_000, jitter: 0 },
  }
}

function apiProxy(): ApiProxy {
  const empty = {}
  return {
    sessions: { list: vi.fn() },
    subagents: empty,
    host: empty,
    workspace: empty,
    skills: empty,
    agentPresets: empty,
    goals: empty,
    settings: empty,
    credentials: empty,
    llm: empty,
    events: empty,
    downloads: empty,
    respond: async () => ({ accepted: true }),
  } as unknown as ApiProxy
}

function logger(): SafeLogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as SafeLogger
}
