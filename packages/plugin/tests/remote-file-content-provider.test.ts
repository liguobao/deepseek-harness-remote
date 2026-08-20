import { describe, expect, it, vi } from 'vitest'
import { REMOTE_FILE_CHUNK_BYTES } from '../src/file-viewer-bridge.js'
import {
  createRemoteFileContentProvider,
  shouldUseRemoteFileViewer,
  type RemoteFileControlCall,
} from '../src/remote-file-content-provider.js'

describe('remote File Viewer content provider', () => {
  it('enables the provider only for a selected Host with file-viewer support', () => {
    expect(shouldUseRemoteFileViewer({ mode: 'local', remoteFeatures: { fileViewer: true } })).toBe(false)
    expect(shouldUseRemoteFileViewer({ mode: 'remote' })).toBe(false)
    expect(shouldUseRemoteFileViewer({ mode: 'remote', remoteFeatures: { fileViewer: false } })).toBe(false)
    expect(shouldUseRemoteFileViewer({ mode: 'remote', remoteFeatures: { fileViewer: true } })).toBe(true)
  })

  it('maps remote metadata and directory entries to the File Viewer contract', async () => {
    const call: RemoteFileControlCall = vi.fn(async (endpoint) => {
      if (endpoint === 'fileviewer.stat') {
        return { path: '/workspace/a.txt', name: 'a.txt', ext: 'txt', mime: 'text/plain', size: 3, isDirectory: false, exists: true } as never
      }
      return { path: '/workspace', entries: [{ name: 'a.txt', path: '/workspace/a.txt', isDirectory: false, size: 3 }] } as never
    })
    const provider = createRemoteFileContentProvider(call)
    const signal = new AbortController().signal

    await expect(provider.stat('/workspace/a.txt', signal)).resolves.toMatchObject({ name: 'a.txt', size: 3 })
    await expect(provider.list('/workspace', signal)).resolves.toEqual([{
      locator: '/workspace/a.txt', name: 'a.txt', size: 3, mtimeMs: undefined, isDirectory: false,
    }])
    expect(provider.openExternal).toBeUndefined()
  })

  it('assembles large reads from bounded remote chunks', async () => {
    const source = Buffer.alloc(REMOTE_FILE_CHUNK_BYTES + 17, 7)
    const call: RemoteFileControlCall = vi.fn(async (_endpoint, payload) => {
      const offset = payload.offset as number
      const length = payload.length as number
      const bytes = source.subarray(offset, offset + length)
      return {
        data: bytes.toString('base64'), offset, size: source.byteLength,
        eof: offset + bytes.byteLength >= source.byteLength,
      } as never
    })
    const provider = createRemoteFileContentProvider(call)
    const value = await provider.read('/workspace/big.bin', {
      offset: 0,
      length: source.byteLength,
      signal: new AbortController().signal,
    })

    expect(Buffer.from(value)).toEqual(source)
    expect(call).toHaveBeenCalledTimes(2)
    expect(call).toHaveBeenNthCalledWith(1, 'fileviewer.readRange', {
      path: '/workspace/big.bin', offset: 0, length: REMOTE_FILE_CHUNK_BYTES,
    }, expect.any(AbortSignal))
  })
})
