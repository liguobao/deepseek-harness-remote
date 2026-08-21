import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ApiProxy, RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import { generateKeyPair } from '@dsh-remote/crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ClientModeRuntime,
  remoteHostFeatures,
  type HostAuthorizationControl,
  type HostConnectionHandle,
} from '../src/client-runtime.js'
import type { ResolvedConfig } from '../src/config.js'
import { CONTROL_RPC_PREFIX } from '../src/control-route.js'
import { IdentityStore } from '../src/identity-store.js'
import type { SafeLogger } from '../src/logging.js'
import type { ClientServerApi } from '../src/server-api.js'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

describe('ClientModeRuntime Host account control', () => {
  it('uses a conservative compatibility profile for legacy and unknown Hosts', () => {
    expect(remoteHostFeatures()).toEqual({ commandList: false, fileViewer: false })
    expect(remoteHostFeatures('not-semver')).toEqual({ commandList: false, fileViewer: false })
    expect(remoteHostFeatures('0.3.15')).toEqual({ commandList: false, fileViewer: false })
    expect(remoteHostFeatures('0.3.16')).toEqual({ commandList: true, fileViewer: false })
    expect(remoteHostFeatures('v0.3.17')).toEqual({ commandList: true, fileViewer: true })
    expect(remoteHostFeatures('0.4.0-beta.1')).toEqual({ commandList: true, fileViewer: true })
  })

  it('exposes Web-compatible network path details for the active Remote Client', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-client-network-'))
    directories.push(directory)
    const runtime = new ClientModeRuntime(
      config(),
      new IdentityStore({ directory }),
      { bindIdentity: vi.fn() } as unknown as ClientServerApi,
      apiProxy(),
      gateway(),
      logger(),
    )
    await runtime.start()
    const deviceId = runtime.status().deviceId as string
    const connectionDetails = vi.fn(async () => ({
      connectionId: 'connection-1',
      connectedAt: 1_786_000_000_000,
      controlChannelUrl: 'wss://dsh.r2049.cn/ws/v1/connect',
      controlChannelState: 'open' as const,
      preferredTransports: ['lan', 'p2p', 'turn', 'relay'] as const,
      webRtc: {
        mode: 'LAN' as const,
        connectionState: 'connected',
        iceConnectionState: 'connected',
        dataChannelState: 'open' as const,
        localCandidateType: 'host',
        remoteCandidateType: 'host',
        localAddress: '192.168.1.20:51001',
        remoteAddress: '192.168.1.30:51002',
        protocol: 'udp',
        currentRoundTripTimeMs: 12,
      },
    }))
    ;(runtime as unknown as { connected: unknown }).connected = {
      client: { getStats: () => ({ mode: 'LAN', connected: true }) },
      target: {
        deviceId: 'host-device-1',
        name: 'Workstation',
        platform: 'linux',
        publicKey: 'peer-key',
        fingerprint: 'PEER',
        trustedAt: 1,
      },
      transport: { connectionDetails },
      features: { commandList: false, fileViewer: false },
    }

    await expect(runtime.handleControl('status', {}, new AbortController().signal)).resolves.toMatchObject({
      ok: true,
      value: {
        connected: true,
        transport: 'LAN',
        remoteFeatures: { commandList: false, fileViewer: false },
        network: {
          connectionId: 'connection-1',
          local: { deviceId, platform: process.platform },
          remote: { deviceId: 'host-device-1', platform: 'linux' },
          webRtc: {
            localAddress: '192.168.1.20:51001',
            remoteAddress: '192.168.1.30:51002',
            currentRoundTripTimeMs: 12,
          },
        },
      },
    })
    expect(connectionDetails).toHaveBeenCalledOnce()
  })

  it('keeps the selected remote Workspace until the browser opens it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-client-workspace-selection-'))
    directories.push(directory)
    const runtime = new ClientModeRuntime(
      config(),
      new IdentityStore({ directory }),
      { bindIdentity: vi.fn() } as unknown as ClientServerApi,
      apiProxy(),
      gateway(),
      logger(),
    )
    await runtime.start()
    const rpc = vi.fn(async (_endpoint: string, payload: unknown) => {
      const request = payload as { rpcId: string }
      return {
        rpcId: request.rpcId,
        result: {
          ok: true,
          value: {
            workspace: {
              workspaceId: 'workspace-remote-1',
              path: '/srv/project',
              title: 'project',
              sessionIds: [],
            },
            created: false,
          },
        },
      }
    })
    const close = vi.fn(async () => undefined)
    ;(runtime as unknown as { connected: unknown }).connected = {
      client: { rpc, close, getStats: () => ({ mode: 'Relay', connected: true }) },
      target: {
        deviceId: 'host-device-1',
        name: 'Workstation',
        platform: 'linux',
        publicKey: 'peer-key',
        fingerprint: 'PEER',
        trustedAt: 1,
      },
      transport: {},
      features: { commandList: true, fileViewer: true },
    }

    await expect(runtime.openRemoteWorkspace('host-device-1', '/srv/project')).resolves.toMatchObject({
      workspaceSelection: { targetDeviceId: 'host-device-1', workspaceId: 'workspace-remote-1' },
    })
    expect(runtime.status()).toMatchObject({
      workspaceSelection: { targetDeviceId: 'host-device-1', workspaceId: 'workspace-remote-1' },
    })

    const signal = new AbortController().signal
    await runtime.handleControl('workspace.selection.consume', {
      targetDeviceId: 'host-device-1', workspaceId: 'another-workspace',
    }, signal)
    expect(runtime.status()).toHaveProperty('workspaceSelection')

    await runtime.handleControl('workspace.selection.consume', {
      targetDeviceId: 'host-device-1', workspaceId: 'workspace-remote-1',
    }, signal)
    expect(runtime.status()).not.toHaveProperty('workspaceSelection')
    await runtime.close()
  })

  it('exposes Host authorization status and forwards login only through loopback control', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-client-runtime-'))
    directories.push(directory)
    const host = {
      hostStatus: vi.fn(() => ({
        configured: true,
        online: false,
        reconnecting: false,
        error: 'ACCOUNT_AUTH_REQUIRED',
        authorized: false,
        accountRequired: true,
      })),
      reconnectHost: vi.fn(),
      clearHostAuthorization: vi.fn(),
      authorizeHostAsOwned: vi.fn(),
      authorizeHostWithAccount: vi.fn(async (email: string) => ({ account: email, expiresAt: Date.now() + 60_000, isAdmin: false })),
      authorizeHostWithCode: vi.fn(async () => ({ method: 'host_registration_code' })),
    } satisfies HostAuthorizationControl
    const runtime = new ClientModeRuntime(
      config(),
      new IdentityStore({ directory }),
      {
        bindIdentity: vi.fn(),
        authenticate: vi.fn(async () => ({ accessToken: 'client-access-token', account: 'owner@example.com' })),
      } as unknown as ClientServerApi,
      apiProxy(),
      gateway(),
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
    expect(connection.rpc.handle).toHaveBeenCalledWith(CONTROL_RPC_PREFIX, expect.any(Function), {
      authority: 'loopback',
    })
    const signal = new AbortController().signal

    await expect(handler?.('status', {}, signal)).resolves.toMatchObject({
      ok: true,
      value: { host: { accountRequired: true, error: 'ACCOUNT_AUTH_REQUIRED' } },
    })
    await expect(handler?.('host.account.login', {
      email: 'host@example.com', password: 'correct horse battery staple',
    }, signal)).resolves.toMatchObject({ ok: true, value: { account: 'host@example.com' } })
    expect(host.authorizeHostWithAccount).toHaveBeenCalledWith('host@example.com', 'correct horse battery staple')
    await expect(handler?.('host.authorization.set', { enabled: true }, signal)).resolves.toMatchObject({ ok: true })
    expect(host.authorizeHostAsOwned).toHaveBeenCalledWith('client-access-token', 'owner@example.com')
    await expect(handler?.('host.authorization.set', { enabled: false }, signal)).resolves.toMatchObject({ ok: true })
    expect(host.clearHostAuthorization).toHaveBeenCalledOnce()

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
    const runtime = new ClientModeRuntime(config(), identities, server, apiProxy(), gateway(), logger())
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

function gateway(): { invoke(request: unknown): Promise<unknown> } {
  return { invoke: vi.fn(async () => undefined) }
}
