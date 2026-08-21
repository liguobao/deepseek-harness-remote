import zhCN from '../locales/zh-CN'

const friendlyByCode: Record<string, string> = zhCN.errors

export class RemoteApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message)
    this.name = 'RemoteApiError'
  }
}

export function friendlyError(error: unknown): string {
  if (error instanceof RemoteApiError) return friendlyByCode[error.code] ?? error.message
  if (error instanceof Error) {
    if (/network request failed|failed to fetch|websocket/i.test(error.message)) {
      return zhCN.errors.serverUnreachable
    }
    if (isRpcTimeoutError(error)) return friendlyByCode.RPC_TIMEOUT!
    return error.message
  }
  return zhCN.errors.unknown
}

export function isRpcTimeoutError(error: unknown): boolean {
  return error instanceof Error && /timed?\s*out|timeout/i.test(error.message)
}
