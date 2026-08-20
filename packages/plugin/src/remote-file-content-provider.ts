import { REMOTE_FILE_CHUNK_BYTES } from './file-viewer-contract.js'

export interface RemoteFileContentMeta {
  name: string
  size: number
  mime?: string
  mtimeMs?: number
  isDirectory?: boolean
}

export interface RemoteFileContentEntry extends RemoteFileContentMeta {
  locator: string
}

export interface RemoteFileReadRequest {
  offset: number
  length: number
  signal: AbortSignal
}

export interface RemoteFileContentProvider {
  id: string
  priority: number
  supports(locator: string): boolean
  stat(locator: string, signal: AbortSignal): Promise<RemoteFileContentMeta | undefined>
  read(locator: string, request: RemoteFileReadRequest): Promise<Uint8Array>
  list(locator: string, signal: AbortSignal): Promise<RemoteFileContentEntry[]>
  openExternal?: (locator: string, signal: AbortSignal) => Promise<void>
}

export type RemoteFileControlCall = <T>(
  endpoint: 'fileviewer.stat' | 'fileviewer.readRange' | 'fileviewer.list',
  payload: Record<string, unknown>,
  signal?: AbortSignal,
) => Promise<T>

export interface RemoteFileViewerStatus {
  mode: 'local' | 'remote'
  remoteFeatures?: { fileViewer: boolean }
}

/** Fail closed for legacy/unknown Hosts that predate remote file-viewer support. */
export function shouldUseRemoteFileViewer(status: RemoteFileViewerStatus): boolean {
  return status.mode === 'remote' && status.remoteFeatures?.fileViewer === true
}

interface RemoteStatWire {
  path: string
  name: string
  ext: string
  mime: string
  size: number
  mtimeMs?: number
  isDirectory: boolean
  exists: boolean
}

interface RemoteRangeWire {
  data: string
  offset: number
  size: number
  eof: boolean
}

interface RemoteListWire {
  path: string
  entries: Array<{
    name: string
    path: string
    isDirectory: boolean
    size?: number
    mtimeMs?: number
  }>
}

/** Browser-side provider registered into dsh-file-viewer's `fileViewer` service. */
export function createRemoteFileContentProvider(call: RemoteFileControlCall): RemoteFileContentProvider {
  return {
    id: 'dsh-remote-files',
    priority: 10_000,
    supports: () => true,
    async stat(locator, signal) {
      const value = await call<RemoteStatWire>('fileviewer.stat', { path: locator }, signal)
      if (!value.exists) return undefined
      return {
        name: value.name,
        size: value.isDirectory ? 0 : value.size,
        mime: value.mime,
        mtimeMs: value.mtimeMs,
        isDirectory: value.isDirectory,
      }
    },
    async read(locator, request) {
      if (!Number.isInteger(request.offset) || request.offset < 0) throw new Error('A non-negative integer offset is required.')
      if (!Number.isInteger(request.length) || request.length <= 0) throw new Error('A positive integer length is required.')
      const chunks: Uint8Array[] = []
      let received = 0
      while (received < request.length) {
        request.signal.throwIfAborted()
        const length = Math.min(REMOTE_FILE_CHUNK_BYTES, request.length - received)
        const offset = request.offset + received
        const range = await call<RemoteRangeWire>('fileviewer.readRange', { path: locator, offset, length }, request.signal)
        if (range.offset !== offset) throw new Error('The Remote Host returned a mismatched file range.')
        const bytes = decodeBase64(range.data)
        if (bytes.byteLength > length) throw new Error('The Remote Host returned more file bytes than requested.')
        chunks.push(bytes)
        received += bytes.byteLength
        if (range.eof || bytes.byteLength === 0) break
      }
      const merged = new Uint8Array(received)
      let cursor = 0
      for (const chunk of chunks) {
        merged.set(chunk, cursor)
        cursor += chunk.byteLength
      }
      return merged
    },
    async list(locator, signal) {
      const value = await call<RemoteListWire>('fileviewer.list', { path: locator }, signal)
      return value.entries.map(entry => ({
        locator: entry.path,
        name: entry.name,
        size: entry.isDirectory ? 0 : (entry.size ?? 0),
        mtimeMs: entry.mtimeMs,
        isDirectory: entry.isDirectory,
      }))
    },
  }
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}
