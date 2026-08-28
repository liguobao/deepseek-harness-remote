export interface TypertGatewayRequest {
  namespace: string
  method: string
  args: Readonly<Record<string, unknown>>
  signal?: AbortSignal
}

export type TypertRpcResult =
  | { ok: true; value?: unknown }
  | { ok: false; error: { code: string; message: string; details: Record<string, unknown> } }

export interface TypertGatewayWireStreamLike {
  open(endpoint: string, payload: unknown, signal: AbortSignal): Promise<AsyncIterable<unknown>>
  failure(error: unknown): { code: string; message: string; details: Record<string, unknown> }
}

/** Public Gateway face shared by Harness rc.2 and alpha.1. */
export interface TypertGatewayLike {
  invoke(request: TypertGatewayRequest): Promise<unknown>
  stream?(request: TypertGatewayRequest): Promise<AsyncIterable<unknown>>
  wireStream?: TypertGatewayWireStreamLike
}

/** Carrier-level face captured from the alpha.1 Gateway before target switching. */
export interface LocalTypertGateway extends TypertGatewayLike {
  dispatch(endpoint: string, payload: unknown, signal: AbortSignal): Promise<TypertRpcResult>
  open(endpoint: string, payload: unknown, signal: AbortSignal): Promise<AsyncIterable<unknown>>
  failure(error: unknown): { code: string; message: string; details: Record<string, unknown> }
  supportsCarrier: boolean
}

export interface RemoteTypertGatewayTarget {
  invoke(request: TypertGatewayRequest): Promise<unknown>
  dispatch(endpoint: string, payload: unknown, signal: AbortSignal): Promise<TypertRpcResult>
  open(endpoint: string, payload: unknown, signal: AbortSignal): Promise<AsyncIterable<unknown>>
}
