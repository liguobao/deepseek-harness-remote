import { describe, expect, it, vi } from 'vitest'
import { REMOTE_FILE_CHUNK_BYTES } from '../src/file-viewer-bridge.js'
import {
  REMOTE_FILE_FAST_SAVE_AS_MAX_BYTES,
  REMOTE_FILE_SAVE_AS_MAX_BYTES,
  createRemoteFileContentProvider,
  remoteFileSaveAsMaxBytes,
  shouldAllowRemoteFileSaveAs,
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

  it('raises Save As size only on LAN and P2P transports', () => {
    expect(shouldAllowRemoteFileSaveAs({ mode: 'remote', transport: 'LAN', remoteFeatures: { fileViewer: true } })).toBe(true)
    expect(shouldAllowRemoteFileSaveAs({ mode: 'remote', transport: 'P2P', remoteFeatures: { fileViewer: true } })).toBe(true)
    expect(shouldAllowRemoteFileSaveAs({ mode: 'remote', transport: 'TURN', remoteFeatures: { fileViewer: true } })).toBe(true)

    expect(remoteFileSaveAsMaxBytes({ mode: 'remote', transport: 'LAN', remoteFeatures: { fileViewer: true } })).toBe(REMOTE_FILE_FAST_SAVE_AS_MAX_BYTES)
    expect(remoteFileSaveAsMaxBytes({ mode: 'remote', transport: 'P2P', remoteFeatures: { fileViewer: true } })).toBe(REMOTE_FILE_FAST_SAVE_AS_MAX_BYTES)
    expect(remoteFileSaveAsMaxBytes({ mode: 'remote', transport: 'TURN', remoteFeatures: { fileViewer: true } })).toBe(REMOTE_FILE_SAVE_AS_MAX_BYTES)
    expect(remoteFileSaveAsMaxBytes({ mode: 'remote', transport: 'Relay', remoteFeatures: { fileViewer: true } })).toBe(REMOTE_FILE_SAVE_AS_MAX_BYTES)
    expect(remoteFileSaveAsMaxBytes({ mode: 'remote', remoteFeatures: { fileViewer: true } })).toBe(REMOTE_FILE_SAVE_AS_MAX_BYTES)
  })

  it('reads the Save As size limit dynamically', () => {
    let maxBytes = REMOTE_FILE_SAVE_AS_MAX_BYTES
    const provider = createRemoteFileContentProvider(vi.fn(), {
      saveAsAllowed: true,
      saveAsMaxBytes: () => maxBytes,
    })

    expect(provider.saveAsAllowed?.('/workspace/big.bin')).toEqual({
      allowed: true,
      maxBytes: REMOTE_FILE_SAVE_AS_MAX_BYTES,
    })
    maxBytes = REMOTE_FILE_FAST_SAVE_AS_MAX_BYTES
    expect(provider.saveAsAllowed?.('/workspace/big.bin')).toEqual({
      allowed: true,
      maxBytes: REMOTE_FILE_FAST_SAVE_AS_MAX_BYTES,
    })
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
