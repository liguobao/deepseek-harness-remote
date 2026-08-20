import type { TypertGatewayLike } from './harness-api-bridge.js'

type RemoteInvoke = (request: Parameters<TypertGatewayLike['invoke']>[0]) => Promise<unknown>

/** Typert `commands` methods that follow the selected Host (catalog + execution). */
const REMOTE_COMMAND_METHODS = ['execute', 'list'] as const

export interface RemoteCommandSupport {
  execute: boolean
  list: boolean
}

const ALL_REMOTE_COMMANDS: RemoteCommandSupport = { execute: true, list: true }

/** Keeps the native gateway identity stable while command catalog and execution follow the selected Host. */
export class TypertGatewaySwitch {
  private readonly originalInvoke: TypertGatewayLike['invoke']
  private readonly localInvoke: TypertGatewayLike['invoke']
  private remoteInvoke?: RemoteInvoke
  private remoteSupport: RemoteCommandSupport = { execute: false, list: false }
  private installed = false

  constructor(private readonly gateway: TypertGatewayLike) {
    this.originalInvoke = gateway.invoke
    this.localInvoke = this.originalInvoke.bind(gateway)
  }

  /** A facade that always invokes the original local gateway. */
  local(): TypertGatewayLike {
    return { invoke: this.localInvoke }
  }

  install(): void {
    if (this.installed) return
    this.gateway.invoke = request => {
      if (request.namespace !== 'commands' || !isRemoteCommandMethod(request.method) || this.remoteInvoke === undefined) {
        return this.localInvoke(request)
      }
      if (this.remoteSupport[request.method]) return this.remoteInvoke(request)
      // A legacy Host cannot resolve commands.list, while the local registry
      // cannot resolve the selected remote session id. An empty compatibility
      // catalog keeps the workspace UI usable without misrepresenting local
      // commands as remotely executable.
      if (request.method === 'list') return Promise.resolve([])
      return this.localInvoke(request)
    }
    this.installed = true
  }

  selectRemote(invoke: RemoteInvoke, support: RemoteCommandSupport = ALL_REMOTE_COMMANDS): void {
    if (!this.installed) throw new Error('The Typert gateway switch is not installed.')
    this.remoteInvoke = invoke
    this.remoteSupport = { ...support }
  }

  selectLocal(): void {
    this.remoteInvoke = undefined
    this.remoteSupport = { execute: false, list: false }
  }

  restore(): void {
    if (!this.installed) return
    this.selectLocal()
    this.gateway.invoke = this.originalInvoke
    this.installed = false
  }
}

function isRemoteCommandMethod(method: string): method is typeof REMOTE_COMMAND_METHODS[number] {
  return (REMOTE_COMMAND_METHODS as readonly string[]).includes(method)
}
