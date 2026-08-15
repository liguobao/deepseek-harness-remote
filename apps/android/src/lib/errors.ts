const friendlyByCode: Record<string, string> = {
  ACCOUNT_AUTH_REQUIRED: 'Sign in with the Server account to authorize this phone.',
  AUTH_INVALID: 'The phone could not authenticate with the server. Sign in again.',
  AUTH_REQUIRED: 'The server requires this phone to authenticate again.',
  TOKEN_EXPIRED: 'The phone session expired. Sign in again.',
  TOKEN_REUSED: 'The server revoked this device session because an old refresh token was reused. Sign in again.',
  DEVICE_NOT_FOUND: 'This device is no longer registered on the server.',
  DEVICE_REVOKED: 'This phone no longer has access to the account.',
  DEVICE_OWNERSHIP_REQUIRED: 'The server no longer recognizes this phone as an owned device. Sign in again.',
  MEMBERSHIP_REQUIRED: 'This phone is no longer authorized for that host.',
  HOST_OFFLINE: 'The host is offline. Check that DeepSeek Harness and the Remote plugin are running.',
  DEVICE_OFFLINE: 'The host is offline. Check that DeepSeek Harness and the Remote plugin are running.',
  PEER_IDENTITY_MISMATCH: 'The host identity key changed. Trust it again before connecting.',
  RATE_LIMITED: 'Too many requests were sent. Wait a moment and try again.',
  CONNECTION_FAILED: 'Could not connect to the host. Check the network and try again.',
  P2P_FAILED: 'Direct connection failed. Switching to secure relay.',
  RELAY_UNAVAILABLE: 'The encrypted relay is unavailable. Try again later.',
  TURN_UNAVAILABLE: 'The relay server is unavailable. Try again later.',
  SECURE_CHANNEL_FAILED: 'The encrypted channel could not be established.',
  RPC_TIMEOUT: 'The host did not respond in time. Try again.',
  UNSUPPORTED_VERSION: 'The server requires a different version of DSH Remote.',
  METHOD_NOT_ALLOWED: 'The host does not allow this action from a remote phone.',
  PERMISSION_NOT_PENDING: 'That request was already answered or expired.',
  SESSION_NOT_FOUND: 'This session no longer exists on the host.',
  HARNESS_UNAVAILABLE: 'DeepSeek Harness is not available on the host.',
  AGENT_BUSY: 'The host is busy with another action. Try again in a moment.',
  FULL_RESYNC_REQUIRED: 'The conversation changed on the host. Reopen this session.',
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
