import { beforeEach, describe, expect, it, vi } from 'vitest'

const vscodeState = vi.hoisted(() => ({
  executeCommand: vi.fn(async () => undefined),
  withProgress: vi.fn(async (_options: unknown, task: () => Promise<unknown>) => task()),
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
      withProgress: vscodeState.withProgress,
      showQuickPick: vi.fn(),
      showWarningMessage: vi.fn(),
      showErrorMessage: vi.fn(),
    },
    workspace: {
      getConfiguration: () => ({ get: () => false }),
      workspaceFolders: undefined,
    },
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

const hostA = {
  deviceId: 'host-a', name: 'Host A', platform: 'linux', identityKey: 'key-a',
  membershipId: 'membership-a', online: true,
}
const hostB = {
  deviceId: 'host-b', name: 'Host B', platform: 'linux', identityKey: 'key-b',
  membershipId: 'membership-b', online: true,
}

describe('Controller connection lifecycle', () => {
  beforeEach(() => { vscodeState.executeCommand.mockClear(); vscodeState.withProgress.mockClear() })

  it('clears the old Host state before it connects to a new Host', async () => {
    const panel = { dispose: vi.fn() }
    const connection = {
      connectedHost: hostA,
      onClose: vi.fn(() => () => undefined),
      close: vi.fn(async function (this: { connectedHost?: typeof hostA }) { this.connectedHost = undefined }),
      connect: vi.fn(async function (this: { connectedHost?: typeof hostB }) {
        expect(panel.dispose).toHaveBeenCalledOnce()
        this.connectedHost = hostB
      }),
      workspaces: vi.fn(async () => []),
      sessions: vi.fn(async () => []),
    }
    const subscriptions: Array<{ dispose(): void }> = []
    const context = {
      subscriptions,
      globalState: {
        get: () => ({ [hostB.deviceId]: hostB.identityKey }),
        update: vi.fn(async () => undefined),
      },
    }
    const controller = new Controller(context as never, connection as never)
    const state = controller as unknown as {
      credentials: { serverUrl: string; accessToken: string }
      identity: { deviceId: string }
      sessions: unknown[]
      workspaces: unknown[]
      sessionPanel?: typeof panel
    }
    state.credentials = { serverUrl: 'https://server.example.com', accessToken: 'token' }
    state.identity = { deviceId: 'client' }
    state.sessions = [{ sessionId: 'session-a' }]
    state.workspaces = [{ workspaceId: 'workspace-a' }]
    state.sessionPanel = panel

    try {
      await controller.connect(hostB)
    } finally {
      for (const subscription of subscriptions) subscription.dispose()
    }

    expect(connection.close).toHaveBeenCalledOnce()
    expect(connection.connect).toHaveBeenCalledOnce()
    expect(connection.close.mock.invocationCallOrder[0]).toBeLessThan(connection.connect.mock.invocationCallOrder[0]!)
    expect(state.sessions).toEqual([])
    expect(state.workspaces).toEqual([])
    expect(state.sessionPanel).toBeUndefined()
    expect(vscodeState.executeCommand.mock.calls).toEqual([
      ['setContext', 'dshRemote.connected', false],
      ['setContext', 'dshRemote.connected', true],
    ])
  })
})
