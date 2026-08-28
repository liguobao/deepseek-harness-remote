import { createRpcRequest } from '@dsh-remote/protocol'
import { describe, expect, it, vi } from 'vitest'
import type { HarnessApiBridge } from '../src/harness-api-bridge.js'
import type { RemoteFileViewerBridge } from '../src/file-viewer-bridge.js'
import type { SafeLogger } from '../src/logging.js'
import { RpcRouter } from '../src/rpc-router.js'

describe('RpcRouter', () => {
  it('forwards only native ApiProxy traffic', async () => {
    const call = vi.fn(async () => ({ rpcId: 'native-1', result: { ok: true, value: [] } }))
    const router = createRouter({ call })
    const response = await router.handle(createRpcRequest('harness.api.call', {
      method: 'session.list', rpcId: 'native-1', payload: {},
    }))
    expect(call).toHaveBeenCalledWith({ method: 'session.list', rpcId: 'native-1', payload: {} })
    expect(response).toMatchObject({ type: 'rpc.response', payload: { result: { rpcId: 'native-1' } } })

    const legacy = await router.handle({
      v: 1, id: 'legacy-1', type: 'rpc.request', timestamp: Date.now(), payload: { method: 'sessions.list', params: {} },
    })
    expect(legacy).toMatchObject({ type: 'rpc.error', payload: { code: 'METHOD_NOT_FOUND' } })
    const unknown = await router.handle({
      v: 1, id: 'unknown-1', type: 'rpc.request', timestamp: Date.now(), payload: { method: 'shell.exec', params: {} },
    })
    expect(unknown).toMatchObject({ type: 'rpc.error', payload: { code: 'METHOD_NOT_FOUND' } })
  })

  it('describes only the Host transports available on this encrypted connection', async () => {
    const capabilities = () => ['transport.relay', 'harness.remote.v1']
    const router = createRouter({}, undefined, undefined, capabilities)

    const response = await router.handle(createRpcRequest('harness.transport.describe', {}))

    expect(response).toMatchObject({
      type: 'rpc.response',
      payload: { result: { capabilities: ['transport.relay', 'harness.remote.v1'] } },
    })
    const invalid = await router.handle(createRpcRequest('harness.transport.describe', { extra: true }))
    expect(invalid).toMatchObject({ type: 'rpc.error', payload: { code: 'INVALID_MESSAGE' } })
  })

  it('closes native streams with the peer connection', async () => {
    const closeAll = vi.fn(async () => undefined)
    const router = createRouter({ closeAll })
    await router.closePeerStreams()
    expect(closeAll).toHaveBeenCalledOnce()
  })

  it('routes only the explicit bounded Harness API transfer operations', async () => {
    const openTransfer = vi.fn(() => ({ opened: true, transferId: 'image-1' }))
    const appendTransfer = vi.fn(() => ({ accepted: true, transferId: 'image-1', index: 0 }))
    const router = createRouter({ openTransfer, appendTransfer })
    const opened = await router.handle(createRpcRequest('harness.api.transfer.open', {
      transferId: 'image-1', totalBytes: 3, totalChunks: 1,
    }))
    const chunked = await router.handle(createRpcRequest('harness.api.transfer.chunk', {
      transferId: 'image-1', index: 0, data: 'YWJj',
    }))
    expect(openTransfer).toHaveBeenCalledOnce()
    expect(appendTransfer).toHaveBeenCalledOnce()
    expect(opened).toMatchObject({ type: 'rpc.response', payload: { result: { opened: true } } })
    expect(chunked).toMatchObject({ type: 'rpc.response', payload: { result: { accepted: true } } })
  })

  it('routes only the explicit File Viewer call through its bridge', async () => {
    const fileViewer = { call: vi.fn(async () => ({ exists: true })) } as unknown as RemoteFileViewerBridge
    const router = createRouter({}, fileViewer)
    const response = await router.handle({
      v: 1,
      id: 'fileviewer-request',
      type: 'rpc.request',
      timestamp: Date.now(),
      payload: { method: 'fileviewer.call', params: { endpoint: 'stat', payload: { path: '/workspace/report.md' } } },
    })
    expect(fileViewer.call).toHaveBeenCalledWith({ endpoint: 'stat', payload: { path: '/workspace/report.md' } })
    expect(response).toMatchObject({ type: 'rpc.response', payload: { result: { exists: true } } })
  })

  it('does not log errors returned by Host bridges', async () => {
    const secret = 'prompt=/home/user/private.ts token=sk-secret'
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as SafeLogger
    const router = createRouter({ call: vi.fn(async () => { throw new Error(secret) }) }, undefined, logger)

    const response = await router.handle(createRpcRequest('harness.api.call', {
      method: 'session.list', rpcId: 'native-secret', payload: {},
    }))

    expect(response).toMatchObject({ type: 'rpc.error', payload: { code: 'INTERNAL_ERROR' } })
    expect(logger.warn).toHaveBeenCalledWith('host rpc failed', expect.objectContaining({
      method: 'harness.api.call',
      code: 'INTERNAL_ERROR',
    }))
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(secret)
  })
})

function createRouter(
  overrides: Record<string, unknown> = {},
  fileViewer?: RemoteFileViewerBridge,
  logger?: SafeLogger,
  capabilities?: () => readonly string[],
): RpcRouter {
  return new RpcRouter({
    call: vi.fn(),
    respond: vi.fn(),
    openStream: vi.fn(),
    closeStream: vi.fn(),
    openTransfer: vi.fn(),
    appendTransfer: vi.fn(),
    commitTransfer: vi.fn(),
    readTransfer: vi.fn(),
    closeTransfer: vi.fn(),
    closeAll: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as HarnessApiBridge, undefined, logger, fileViewer, undefined, capabilities)
}
