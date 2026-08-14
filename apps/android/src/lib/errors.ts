const friendlyByCode: Record<string, string> = {
  AUTH_FAILED: 'This device could not authenticate. Pair it again.',
  AUTH_INVALID: 'This device could not authenticate with the server. Reset its local data and register again.',
  AUTH_REQUIRED: 'The server requires this phone to authenticate again.',
  TOKEN_REUSED: 'The server revoked this device session because an old refresh token was reused. Reset local data before reconnecting.',
  PAIRING_EXPIRED: 'That pairing code has expired. Create a new code on the host.',
  PAIRING_INVALID: 'That pairing code is not valid. Check the code and try again.',
  PAIRING_NOT_FOUND: 'That pairing code is not valid. Check the code and try again.',
  PAIRING_ALREADY_USED: 'That pairing code has already been used. Create a new code on the host.',
  HOST_OFFLINE: 'The host is offline. Check that DeepSeek Harness and the Remote plugin are running.',
  DEVICE_OFFLINE: 'The host is offline. Check that DeepSeek Harness and the Remote plugin are running.',
  DEVICE_REVOKED: 'This phone no longer has access to the host.',
  MEMBERSHIP_REQUIRED: 'This phone is no longer paired with the host.',
  RATE_LIMITED: 'Too many requests were sent. Wait a moment and try again.',
  CONNECTION_FAILED: 'Could not connect to the host. Check the network and try again.',
  P2P_FAILED: 'Direct connection failed. Switching to secure relay.',
  RPC_TIMEOUT: 'The host did not respond in time. Try again.',
  UNSUPPORTED_VERSION: 'This host requires a different version of DSH Remote.',
  PERMISSION_DENIED: 'The host rejected this action.',
  SESSION_NOT_FOUND: 'This session no longer exists on the host.',
  HARNESS_UNAVAILABLE: 'DeepSeek Harness is not available on the host.',
}

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
      return 'The server is unreachable. Check its address and your network.'
    }
    if (/timed out/i.test(error.message)) return friendlyByCode.RPC_TIMEOUT!
    return error.message
  }
  return 'Something went wrong. Try again.'
}
