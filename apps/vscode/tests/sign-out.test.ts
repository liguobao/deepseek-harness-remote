import { beforeEach, describe, expect, it, vi } from 'vitest'

interface TestCredentials {
  serverUrl: string
  deviceId: string
  account: string
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken: string
  refreshTokenExpiresAt: number
}

const apiState = vi.hoisted(() => ({
  removeSelf: vi.fn<() => Promise<void>>(),
  refresh: vi.fn<() => Promise<TestCredentials>>(),
  hosts: vi.fn(async () => []),
  tokens: [] as Array<string | undefined>,
}))
const vscodeState = vi.hoisted(() => ({
  executeCommand: vi.fn(async () => undefined),
  stored: new Map<string, string>(),
  deleted: [] as string[],
}))

vi.mock('../src/server-api.js', () => ({
  ServerApi: class {
    readonly baseUrl: string
    constructor(url: string, token?: string) {
      this.baseUrl = url.replace(/\/$/, '')
      apiState.tokens.push(token)
    }
    removeSelf = apiState.removeSelf
    refresh = apiState.refresh
    hosts = apiState.hosts
  },
}))

vi.mock('vscode', () => {
  class EventEmitter<T> {
    readonly event = (_handler: (event: T) => void): { dispose(): void } => ({ dispose() {} })
    fire(): void {}
    dispose(): void {}
  }
  return {
    commands: { executeCommand: vscodeState.executeCommand },
    window: {
      withProgress: vi.fn(async (_options: unknown, task: () => Promise<unknown>) => task()),
      showQuickPick: vi.fn(), showWarningMessage: vi.fn(), showErrorMessage: vi.fn(),
    },
    workspace: { getConfiguration: () => ({ get: () => false }), workspaceFolders: undefined },
    env: { openExternal: vi.fn() },
    Uri: { parse: (value: string) => value },
    EventEmitter,
    TreeItem: class {},
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    ThemeIcon: class { constructor(readonly id: string) {} },
    ProgressLocation: { Notification: 15 },
    ConfigurationTarget: { Global: 1 },
    ViewColumn: { Active: 1, Beside: 2 },
  }
})

import { Controller } from '../src/extension.js'

const validCredentials = (): TestCredentials => ({
  serverUrl: 'https://server.example.com', deviceId: 'client-1', account: 'user@example.com',
  accessToken: 'access-token', accessTokenExpiresAt: Date.now() + 60_000,
  refreshToken: 'refresh-token', refreshTokenExpiresAt: Date.now() + 120_000,
})

function createController(): { controller: Controller; subscriptions: Array<{ dispose(): void }> } {
  const subscriptions: Array<{ dispose(): void }> = []
  const context = {
    subscriptions,
    secrets: {
      get: async (key: string) => vscodeState.stored.get(key),
      store: async (key: string, value: string) => { vscodeState.stored.set(key, value) },
      delete: async (key: string) => { vscodeState.deleted.push(key); vscodeState.stored.delete(key) },
    },
  }
  return { controller: new Controller(context as never), subscriptions }
}

function setAuthenticatedState(controller: Controller, credentials = validCredentials()): void {
  const state = controller as unknown as {
    credentials?: TestCredentials
    identity?: { deviceId: string }
    hosts: unknown[]
  }
  state.credentials = credentials
  state.identity = { deviceId: credentials.deviceId }
  state.hosts = [{ deviceId: 'host-1' }]
  vscodeState.stored.set('dshRemote.credentials.v1', JSON.stringify(credentials))
  vscodeState.stored.set('dshRemote.identity.v1', JSON.stringify(state.identity))
}

describe('Controller sign-out', () => {
  beforeEach(() => {
    apiState.removeSelf.mockReset().mockResolvedValue(undefined)
    apiState.refresh.mockReset()
    apiState.hosts.mockClear()
    apiState.tokens.length = 0
    vscodeState.executeCommand.mockClear()
    vscodeState.stored.clear()
    vscodeState.deleted.length = 0
  })

  it('revokes the device and deletes local credentials and identity', async () => {
    const { controller, subscriptions } = createController()
    setAuthenticatedState(controller)

    try { await controller.signOut() } finally { for (const item of subscriptions) item.dispose() }

    expect(apiState.removeSelf).toHaveBeenCalledOnce()
    expect(apiState.tokens).toContain('access-token')
    expect(vscodeState.deleted).toEqual(expect.arrayContaining(['dshRemote.credentials.v1', 'dshRemote.identity.v1']))
    expect(vscodeState.stored.size).toBe(0)
    expect(controller).toMatchObject({ credentials: undefined, identity: undefined, hosts: [] })
  })

  it('completes local sign-out when device revocation fails', async () => {
    apiState.removeSelf.mockRejectedValue(new Error('Server unavailable.'))
    const { controller, subscriptions } = createController()
    setAuthenticatedState(controller)

    try { await controller.signOut() } finally { for (const item of subscriptions) item.dispose() }

    expect(vscodeState.stored.size).toBe(0)
    expect(vscodeState.executeCommand).toHaveBeenCalledWith('setContext', 'dshRemote.signedIn', false)
  })

  it('prevents an in-flight refresh from restoring credentials after sign-out', async () => {
    let resolveRefresh!: (credentials: TestCredentials) => void
    const firstRefresh = new Promise<TestCredentials>(resolve => { resolveRefresh = resolve })
    apiState.refresh
      .mockImplementationOnce(() => firstRefresh)
      .mockResolvedValueOnce({ ...validCredentials(), accessToken: 'revoke-token' })
    const credentials = { ...validCredentials(), accessTokenExpiresAt: 0 }
    const { controller, subscriptions } = createController()
    setAuthenticatedState(controller, credentials)

    const refreshing = controller.refresh()
    await vi.waitFor(() => expect(apiState.refresh).toHaveBeenCalledOnce())
    const signingOut = controller.signOut()
    resolveRefresh({ ...validCredentials(), accessToken: 'late-token' })

    try { await Promise.all([refreshing, signingOut]) } finally { for (const item of subscriptions) item.dispose() }

    expect(vscodeState.stored.has('dshRemote.credentials.v1')).toBe(false)
    expect(apiState.tokens).toContain('revoke-token')
  })
})
