import { z } from 'zod'
import {
  MAX_REMOTE_DIRECTORY_ENTRIES,
  MAX_REMOTE_FILE_LOCATOR_CHARS,
  REMOTE_FILE_CHUNK_BYTES,
  type RemoteFileViewerEndpoint,
} from './file-viewer-contract.js'
import type { SafeLogger } from './logging.js'
import { RpcError } from './rpc-router.js'

export {
  MAX_REMOTE_DIRECTORY_ENTRIES,
  MAX_REMOTE_FILE_LOCATOR_CHARS,
  REMOTE_FILE_CHUNK_BYTES,
}
export type { RemoteFileViewerEndpoint }

export interface FileViewerHostResult {
  ok: boolean
  value?: unknown
  error?: { code?: string; message?: string }
}

export interface FileViewerHostServiceLike {
  handle(endpoint: string, payload: unknown, signal: AbortSignal): Promise<unknown>
}

export interface RemoteFileViewerCallParams {
  endpoint: RemoteFileViewerEndpoint
  payload: unknown
}

const locatorSchema = z.string().min(1).max(MAX_REMOTE_FILE_LOCATOR_CHARS)
const callSchema = z.discriminatedUnion('endpoint', [
  z.object({
    endpoint: z.literal('stat'),
    payload: z.object({ path: locatorSchema }).strict(),
  }).strict(),
  z.object({
    endpoint: z.literal('readRange'),
    payload: z.object({
      path: locatorSchema,
      offset: z.number().int().nonnegative().safe(),
      length: z.number().int().positive().max(REMOTE_FILE_CHUNK_BYTES),
    }).strict(),
  }).strict(),
  z.object({
    endpoint: z.literal('list'),
    payload: z.object({ path: locatorSchema }).strict(),
  }).strict(),
])

const statResultSchema = z.object({
  path: locatorSchema,
  name: z.string().min(1).max(1024),
  ext: z.string().max(128),
  mime: z.string().min(1).max(256),
  size: z.number().int().nonnegative().safe(),
  mtimeMs: z.number().nonnegative().optional(),
  isDirectory: z.boolean(),
  exists: z.boolean(),
}).strict()

const rangeResultSchema = z.object({
  data: z.string().max(Math.ceil(REMOTE_FILE_CHUNK_BYTES / 3) * 4 + 4),
  offset: z.number().int().nonnegative().safe(),
  size: z.number().int().nonnegative().safe(),
  eof: z.boolean(),
}).strict()

const directoryEntrySchema = z.object({
  name: z.string().min(1).max(1024),
  path: locatorSchema,
  isDirectory: z.boolean(),
  size: z.number().int().nonnegative().safe().optional(),
  mtimeMs: z.number().nonnegative().optional(),
}).strict()

const listResultSchema = z.object({
  path: locatorSchema,
  entries: z.array(directoryEntrySchema).max(MAX_REMOTE_DIRECTORY_ENTRIES),
}).strict()

/**
 * Adapts dsh-file-viewer's bounded Host service to the authenticated Remote
 * business channel. Only preview-safe read operations are reachable here.
 */
export class RemoteFileViewerBridge {
  constructor(
    private readonly service: () => FileViewerHostServiceLike | undefined,
    private readonly logger?: SafeLogger,
  ) {}

  async call(input: unknown): Promise<unknown> {
    const params = callSchema.parse(input) as RemoteFileViewerCallParams
    const service = this.service()
    if (service === undefined) {
      throw new RpcError('FILE_VIEWER_UNAVAILABLE', 'The Remote Host does not have DSH File Viewer available.')
    }
    const startedAt = performance.now()
    const signal = AbortSignal.timeout(30_000)
    let raw: unknown
    try {
      raw = await service.handle(params.endpoint, params.payload, signal)
    } catch {
      this.logger?.warn('remote file viewer service failed', { endpoint: params.endpoint })
      throw new RpcError('FILE_VIEWER_ERROR', 'The Remote File Viewer could not complete the request.')
    }
    const result = parseHostResult(raw)
    if (!result.ok) throw hostFailure(result)
    try {
      const value = params.endpoint === 'stat'
        ? statResultSchema.parse(result.value)
        : params.endpoint === 'readRange'
          ? rangeResultSchema.parse(result.value)
          : listResultSchema.parse(result.value)
      this.logger?.debug('remote file viewer call ok', {
        endpoint: params.endpoint,
        durationMs: Math.round(performance.now() - startedAt),
      })
      return value
    } catch (error) {
      if (error instanceof z.ZodError && params.endpoint === 'list'
        && isOversizedListing(result.value)) {
        throw new RpcError(
          'RESPONSE_TOO_LARGE',
          `The remote directory contains more than ${MAX_REMOTE_DIRECTORY_ENTRIES} entries.`,
          { maxEntries: MAX_REMOTE_DIRECTORY_ENTRIES },
          true,
        )
      }
      throw error
    }
  }
}

function parseHostResult(input: unknown): FileViewerHostResult {
  if (typeof input !== 'object' || input === null || !('ok' in input) || typeof input.ok !== 'boolean') {
    throw new RpcError('FILE_VIEWER_INVALID_RESPONSE', 'The Remote Host File Viewer returned an invalid response.')
  }
  return input as FileViewerHostResult
}

function hostFailure(result: FileViewerHostResult): RpcError {
  const message = result.error?.message ?? ''
  if (/access denied/i.test(message)) {
    return new RpcError('ACCESS_DENIED', 'The Remote File Viewer denied access to this locator.')
  }
  if (/does not exist|not exist|not found/i.test(message)) {
    return new RpcError('NOT_FOUND', 'The requested remote file does not exist.')
  }
  if (result.error?.code === 'cancelled') {
    return new RpcError('CANCELLED', 'The Remote File Viewer request was cancelled.', undefined, true)
  }
  if (result.error?.code === 'bad-request') {
    return new RpcError('INVALID_MESSAGE', 'The Remote File Viewer request is invalid.')
  }
  return new RpcError('FILE_VIEWER_ERROR', 'The Remote File Viewer could not complete the request.')
}

function isOversizedListing(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'entries' in value
    && Array.isArray(value.entries) && value.entries.length > MAX_REMOTE_DIRECTORY_ENTRIES
}
