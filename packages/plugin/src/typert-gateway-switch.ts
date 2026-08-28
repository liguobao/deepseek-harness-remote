import type {
  LocalTypertGateway,
  RemoteTypertGatewayTarget,
  TypertGatewayLike,
  TypertGatewayRequest,
  TypertRpcResult,
} from './typert-gateway-contract.js'

type RemoteInvoke = (request: TypertGatewayRequest) => Promise<unknown>
type CarrierDispatch = (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<TypertRpcResult>
type CarrierOpen = (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<AsyncIterable<unknown>>

interface RuntimeGateway extends TypertGatewayLike {
  // alpha.1's Connection adapters call these prototype methods dynamically.
  dispatchRpc?: CarrierDispatch
  openWireStream?: CarrierOpen
}

const REMOTE_COMMAND_METHODS = ['execute', 'list'] as const
const LOCAL_ONLY_NAMESPACES = new Set(['dynamicCordisRunner'])

export interface RemoteCommandSupport {
  execute: boolean
  list: boolean
}

const ALL_REMOTE_COMMANDS: RemoteCommandSupport = { execute: true, list: true }

/** Keeps the official Gateway object stable while its selected Host changes. */
export class TypertGatewaySwitch {
  private readonly runtime: RuntimeGateway
  private readonly originalInvoke: TypertGatewayLike['invoke']
  private readonly localInvoke: TypertGatewayLike['invoke']
  private readonly originalStream?: NonNullable<TypertGatewayLike['stream']>
  private readonly localStream?: NonNullable<TypertGatewayLike['stream']>
  private readonly originalDispatch?: CarrierDispatch
  private readonly localDispatch?: CarrierDispatch
  private readonly originalOpen?: CarrierOpen
  private readonly localOpen?: CarrierOpen
  private remoteInvoke?: RemoteInvoke
  private remoteTarget?: RemoteTypertGatewayTarget
  private remoteSupport: RemoteCommandSupport = { execute: false, list: false }
  private target?: { deviceId: string; name: string }
  private installed = false

  constructor(gateway: TypertGatewayLike) {
    this.runtime = gateway as RuntimeGateway
    this.originalInvoke = gateway.invoke
    this.localInvoke = this.originalInvoke.bind(gateway)
    this.originalStream = gateway.stream
    this.localStream = gateway.stream?.bind(gateway)
    this.originalDispatch = this.runtime.dispatchRpc
    this.localDispatch = this.runtime.dispatchRpc?.bind(gateway)
    this.originalOpen = this.runtime.openWireStream
    this.localOpen = this.runtime.openWireStream?.bind(gateway) ?? gateway.wireStream?.open.bind(gateway.wireStream)
  }

  /** Original local dispatcher, used by the Host bridge without switch recursion. */
  local(): LocalTypertGateway {
    const dispatch: CarrierDispatch = this.localDispatch ?? (async (endpoint, payload, signal) => {
      try {
        const request = requestFromCarrier(endpoint, payload, signal)
        return { ok: true, value: await this.localInvoke(request) }
      } catch (error) {
        return { ok: false, error: this.failure(error) }
      }
    })
    const open: CarrierOpen = this.localOpen ?? (async (endpoint, payload, signal) => {
      if (this.localStream === undefined) throw new Error('The local Harness Gateway does not support Remote streams.')
      return this.localStream(requestFromCarrier(endpoint, payload, signal))
    })
    return {
      invoke: this.localInvoke,
      ...(this.localStream === undefined ? {} : { stream: this.localStream }),
      dispatch,
      open,
      failure: error => this.failure(error),
      supportsCarrier: this.localDispatch !== undefined && this.localOpen !== undefined,
    }
  }

  supportsCarrier(): boolean {
    return this.localDispatch !== undefined && this.localOpen !== undefined
  }

  status(): { mode: 'local' | 'remote'; target?: { deviceId: string; name: string } } {
    return this.remoteInvoke === undefined
      ? { mode: 'local' }
      : { mode: 'remote', ...(this.target === undefined ? {} : { target: { ...this.target } }) }
  }

  install(): void {
    if (this.installed) return
    this.runtime.invoke = request => this.selectInvoke(request)
    if (this.originalStream !== undefined) {
      this.runtime.stream = request => this.remoteTarget === undefined || isLocalOnlyEndpoint(endpointOf(request))
        ? this.localStream!(request)
        : this.remoteTarget.open(endpointOf(request), { args: request.args }, request.signal ?? new AbortController().signal)
    }
    if (this.originalDispatch !== undefined) {
      this.runtime.dispatchRpc = (endpoint, payload, signal) => this.remoteTarget === undefined || isLocalOnlyEndpoint(endpoint)
        ? this.localDispatch!(endpoint, payload, signal)
        : this.remoteTarget.dispatch(endpoint, payload, signal)
    }
    if (this.originalOpen !== undefined) {
      this.runtime.openWireStream = (endpoint, payload, signal) => this.remoteTarget === undefined || isLocalOnlyEndpoint(endpoint)
        ? this.localOpen!(endpoint, payload, signal)
        : this.remoteTarget.open(endpoint, payload, signal)
    }
    this.installed = true
  }

  selectRemote(
    remote: RemoteInvoke | RemoteTypertGatewayTarget,
    support: RemoteCommandSupport = ALL_REMOTE_COMMANDS,
    target?: { deviceId: string; name: string },
  ): void {
    if (!this.installed) throw new Error('The Typert gateway switch is not installed.')
    this.remoteInvoke = typeof remote === 'function' ? remote : request => remote.invoke(request)
    this.remoteTarget = typeof remote === 'function' ? undefined : remote
    this.remoteSupport = { ...support }
    this.target = target === undefined ? undefined : { ...target }
  }

  selectLocal(): void {
    this.remoteInvoke = undefined
    this.remoteTarget = undefined
    this.remoteSupport = { execute: false, list: false }
    this.target = undefined
  }

  restore(): void {
    if (!this.installed) return
    this.selectLocal()
    this.runtime.invoke = this.originalInvoke
    if (this.originalStream !== undefined) this.runtime.stream = this.originalStream
    if (this.originalDispatch !== undefined) this.runtime.dispatchRpc = this.originalDispatch
    if (this.originalOpen !== undefined) this.runtime.openWireStream = this.originalOpen
    this.installed = false
  }

  private selectInvoke(request: TypertGatewayRequest): Promise<unknown> {
    if (isLocalOnlyEndpoint(endpointOf(request))) return this.localInvoke(request)
    if (this.remoteTarget !== undefined) return this.remoteTarget.invoke(request)
    if (request.namespace !== 'commands' || !isRemoteCommandMethod(request.method) || this.remoteInvoke === undefined) {
      return this.localInvoke(request)
    }
    if (this.remoteSupport[request.method]) return this.remoteInvoke(request)
    if (request.method === 'list') return Promise.resolve([])
    return this.localInvoke(request)
  }

  private failure(error: unknown): { code: string; message: string; details: Record<string, unknown> } {
    const normalized = this.runtime.wireStream?.failure(error)
    if (normalized !== undefined) return normalized
    const source = error instanceof Error ? error : new Error('The Harness Gateway rejected the request.')
    const code = 'code' in source && typeof source.code === 'string' ? source.code : 'internal'
    const details = 'details' in source && isRecord(source.details) ? source.details : {}
    return { code, message: source.message, details }
  }
}

function requestFromCarrier(endpoint: string, payload: unknown, signal: AbortSignal): TypertGatewayRequest {
  const segments = endpoint.split('/')
  if (segments.length !== 2 || segments.some(segment => segment.length === 0)) {
    throw new Error('The Harness Gateway endpoint is invalid.')
  }
  if (!isRecord(payload) || !isRecord(payload.args)) {
    throw new Error('The Harness Gateway payload is invalid.')
  }
  return { namespace: segments[0]!, method: segments[1]!, args: payload.args, signal }
}

function endpointOf(request: TypertGatewayRequest): string {
  return `${request.namespace}/${request.method}`
}

function isLocalOnlyEndpoint(endpoint: string): boolean {
  const separator = endpoint.indexOf('/')
  return separator > 0 && LOCAL_ONLY_NAMESPACES.has(endpoint.slice(0, separator))
}

function isRemoteCommandMethod(method: string): method is typeof REMOTE_COMMAND_METHODS[number] {
  return (REMOTE_COMMAND_METHODS as readonly string[]).includes(method)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
