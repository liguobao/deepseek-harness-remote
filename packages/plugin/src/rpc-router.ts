import {
  createRpcError,
  createRpcResponse,
  type RemoteMessage,
  type RpcErrorPayload,
  type RpcRequestPayload,
} from '@dsh-remote/protocol'
import { z } from 'zod'
import type { RemoteFileViewerBridge } from './file-viewer-bridge.js'
import type { HarnessApiBridge } from './harness-api-bridge.js'
import type { SafeLogger } from './logging.js'
import { RpcError, safeErrorCode } from './safe-error.js'

export { RpcError } from './safe-error.js'

const wireRequestSchema = z.object({ method: z.string().min(1), params: z.unknown() }).strict()
const apiMethods = new Set([
  'harness.api.call',
  'harness.api.transfer.open',
  'harness.api.transfer.chunk',
  'harness.api.transfer.commit',
  'harness.api.transfer.read',
  'harness.api.transfer.close',
  'harness.api.respond',
  'harness.api.stream.open',
  'harness.api.stream.close',
  'fileviewer.call',
])

export const HOST_CAPABILITIES = ['harness.api.v1', 'harness.api.transfer.v1', 'fileviewer.read.v1'] as const

export class RpcRouter {
  private active = 0

  constructor(
    private readonly harnessApi: HarnessApiBridge,
    private readonly maxPending = 128,
    private readonly logger?: SafeLogger,
    private readonly fileViewer?: RemoteFileViewerBridge,
  ) {}

  closePeerStreams(): Promise<void> { return this.harnessApi.closeAll() }

  async handle(message: RemoteMessage): Promise<RemoteMessage> {
    if (message.type !== 'rpc.request') {
      return createRpcError(message.id, 'INVALID_MESSAGE', 'Only RPC requests are accepted on the Host business channel.')
    }
    const parsedPayload = wireRequestSchema.safeParse(message.payload)
    if (!parsedPayload.success) return createRpcError(message.id, 'INVALID_MESSAGE', 'The RPC request payload is invalid.')
    if (!apiMethods.has(parsedPayload.data.method)) {
      return createRpcError(message.id, 'METHOD_NOT_FOUND', 'The requested method does not exist.')
    }
    const request = message as RemoteMessage<RpcRequestPayload>
    if (this.active >= this.maxPending) {
      return createRpcError(request.id, 'RATE_LIMITED', 'Too many Host requests are already pending.', undefined, true)
    }
    this.active += 1
    const startedAt = performance.now()
    try {
      const result = await this.invoke(request.payload.method, request.payload.params)
      this.logger?.debug('host rpc ok', {
        method: request.payload.method,
        durationMs: Math.round(performance.now() - startedAt),
      })
      return createRpcResponse(request.id, result)
    } catch (error: unknown) {
      const response = errorResponse(request.id, error)
      this.logger?.warn('host rpc failed', {
        method: request.payload.method,
        durationMs: Math.round(performance.now() - startedAt),
        code: response.payload.code,
        retryable: response.payload.retryable,
      })
      return response
    } finally {
      this.active -= 1
    }
  }

  private invoke(method: string, params: unknown): Promise<unknown> | unknown {
    switch (method) {
      case 'harness.api.call': return this.harnessApi.call(params)
      case 'harness.api.transfer.open': return this.harnessApi.openTransfer(params)
      case 'harness.api.transfer.chunk': return this.harnessApi.appendTransfer(params)
      case 'harness.api.transfer.commit': return this.harnessApi.commitTransfer(params)
      case 'harness.api.transfer.read': return this.harnessApi.readTransfer(params)
      case 'harness.api.transfer.close': return this.harnessApi.closeTransfer(params)
      case 'harness.api.respond': return this.harnessApi.respond(params)
      case 'harness.api.stream.open': return this.harnessApi.openStream(params)
      case 'harness.api.stream.close': return this.harnessApi.closeStream(params)
      case 'fileviewer.call': {
        if (this.fileViewer === undefined) {
          throw new RpcError('FILE_VIEWER_UNAVAILABLE', 'The Remote Host does not have DSH File Viewer available.')
        }
        return this.fileViewer.call(params)
      }
      default: throw new RpcError('METHOD_NOT_FOUND', 'The requested method does not exist.')
    }
  }
}

function errorResponse(requestId: string, error: unknown): RemoteMessage<RpcErrorPayload> {
  const code = safeErrorCode(error)
  if (error instanceof RpcError) return createRpcError(requestId, code, error.message, error.details, error.retryable)
  return createRpcError(
    requestId,
    code,
    code === 'INVALID_MESSAGE' ? 'The RPC parameters are invalid.' : 'The Host could not complete the request.',
  )
}
