import type { TypertGatewayLike } from './harness-api-bridge.js'

type RemoteInvoke = (request: Parameters<TypertGatewayLike['invoke']>[0]) => Promise<unknown>

/** Keeps the native gateway identity stable while command execution follows the selected Host. */
export class TypertGatewaySwitch {
  private readonly originalInvoke: TypertGatewayLike['invoke']
  private readonly localInvoke: TypertGatewayLike['invoke']
  private remoteInvoke?: RemoteInvoke
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
    this.gateway.invoke = request => request.namespace === 'commands' && request.method === 'execute'
      ? (this.remoteInvoke ?? this.localInvoke)(request)
      : this.localInvoke(request)
    this.installed = true
  }

  selectRemote(invoke: RemoteInvoke): void {
    if (!this.installed) throw new Error('The Typert gateway switch is not installed.')
    this.remoteInvoke = invoke
  }

  selectLocal(): void {
    this.remoteInvoke = undefined
  }

  restore(): void {
    if (!this.installed) return
    this.selectLocal()
    this.gateway.invoke = this.originalInvoke
    this.installed = false
  }
}
