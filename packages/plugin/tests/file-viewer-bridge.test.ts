import { describe, expect, it, vi } from 'vitest'
import {
  MAX_REMOTE_DIRECTORY_ENTRIES,
  REMOTE_FILE_CHUNK_BYTES,
  RemoteFileViewerBridge,
  type FileViewerHostServiceLike,
} from '../src/file-viewer-bridge.js'

describe('RemoteFileViewerBridge', () => {
  it('forwards only the bounded preview endpoints', async () => {
    const handle = vi.fn(async (endpoint: string) => ({
      ok: true,
      value: endpoint === 'stat'
        ? {
            path: '/workspace/report.txt', name: 'report.txt', ext: 'txt', mime: 'text/plain',
            size: 12, isDirectory: false, exists: true,
          }
        : { data: Buffer.from('hello').toString('base64'), offset: 0, size: 5, eof: true },
    }))
    const bridge = new RemoteFileViewerBridge(() => ({ handle } as FileViewerHostServiceLike))

    await expect(bridge.call({ endpoint: 'stat', payload: { path: '/workspace/report.txt' } }))
      .resolves.toMatchObject({ name: 'report.txt', exists: true })
    await expect(bridge.call({ endpoint: 'readRange', payload: { path: '/workspace/report.txt', offset: 0, length: 5 } }))
      .resolves.toMatchObject({ offset: 0, eof: true })
    await expect(bridge.call({ endpoint: 'openExternal', payload: { path: '/workspace/report.txt' } }))
      .rejects.toThrow()
    expect(handle).toHaveBeenCalledTimes(2)
  })

  it('rejects oversized chunks before invoking File Viewer', async () => {
    const handle = vi.fn()
    const bridge = new RemoteFileViewerBridge(() => ({ handle } as FileViewerHostServiceLike))
    await expect(bridge.call({
      endpoint: 'readRange',
      payload: { path: '/workspace/big.bin', offset: 0, length: REMOTE_FILE_CHUNK_BYTES + 1 },
    })).rejects.toThrow()
    expect(handle).not.toHaveBeenCalled()
  })

  it('fails closed when File Viewer is absent and sanitizes provider errors', async () => {
    await expect(new RemoteFileViewerBridge(() => undefined).call({
      endpoint: 'stat', payload: { path: '/workspace/secret.txt' },
    })).rejects.toMatchObject({ code: 'FILE_VIEWER_UNAVAILABLE' })

    const bridge = new RemoteFileViewerBridge(() => ({
      handle: async () => ({ ok: false, error: { code: 'internal', message: 'EACCES /private/host-secret' } }),
    }))
    await expect(bridge.call({ endpoint: 'stat', payload: { path: '/workspace/secret.txt' } }))
      .rejects.toMatchObject({ code: 'FILE_VIEWER_ERROR', message: 'The Remote File Viewer could not complete the request.' })

    const throwingBridge = new RemoteFileViewerBridge(() => ({
      handle: async () => { throw new Error('EACCES /private/host-secret') },
    }))
    await expect(throwingBridge.call({ endpoint: 'stat', payload: { path: '/workspace/secret.txt' } }))
      .rejects.toMatchObject({ code: 'FILE_VIEWER_ERROR', message: 'The Remote File Viewer could not complete the request.' })
  })

  it('rejects directory responses that exceed the remote bound', async () => {
    const entries = Array.from({ length: MAX_REMOTE_DIRECTORY_ENTRIES + 1 }, (_, index) => ({
      name: `file-${index}.txt`, path: `/workspace/file-${index}.txt`, isDirectory: false, size: 1,
    }))
    const bridge = new RemoteFileViewerBridge(() => ({
      handle: async () => ({ ok: true, value: { path: '/workspace', entries } }),
    }))
    await expect(bridge.call({ endpoint: 'list', payload: { path: '/workspace' } }))
      .rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' })
  })
})
