import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ApiProxy, RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClientModeRuntime, type HostConnectionHandle, type HostPairingControl } from '../src/client-runtime.js'
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
      createPairing: vi.fn(),
      pendingPairings: vi.fn(() => []),
      confirmPairing: vi.fn(),
      hostStatus: vi.fn(() => ({
        configured: true,
        online: false,
        error: 'ACCOUNT_AUTH_REQUIRED',
        accountRequired: true,
      })),
      authorizeHost: vi.fn(async (email: string) => ({ account: email, expiresAt: Date.now() + 60_000, isAdmin: false })),
    } satisfies HostPairingControl
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
    expect(host.authorizeHost).toHaveBeenCalledWith('host@example.com', 'correct horse battery staple')

    await dispose()
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
