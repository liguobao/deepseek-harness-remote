export const REMOTE_FILE_CHUNK_BYTES = 512 * 1024
export const MAX_REMOTE_FILE_LOCATOR_CHARS = 4096
export const MAX_REMOTE_DIRECTORY_ENTRIES = 1000

export type RemoteFileViewerEndpoint = 'stat' | 'readRange' | 'list'
