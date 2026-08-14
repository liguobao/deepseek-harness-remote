import type { EventPayload, RemoteMessage } from '@dsh-remote/protocol'

export type SessionStatus = 'idle' | 'running' | 'stopping' | 'unavailable'

export interface RemoteSessionSummary {
  id: string
  title: string
  cwd?: string
  status: SessionStatus
  createdAt: number
  updatedAt: number
  lastSeq: number
}

export interface RemoteMessageRecord {
  id: string
  messageId: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: unknown[]
  text: string
  status: 'streaming' | 'complete'
  createdAt: number
}

export interface RemoteToolCall {
  callId: string
  toolCallId: string
  sessionId: string
  toolName: string
  title: string
  status: 'running' | 'success' | 'error' | 'cancelled'
  input: unknown
  output: unknown
  isError: boolean
}

export interface RemotePermissionRequest {
  requestId: string
  sessionId: string
  toolName: string
  callId?: string
  reason?: string
  permission: {
    kind: 'command' | 'tool' | 'workspace' | 'unknown'
    command?: string
    cwd?: string
    toolName?: string
    description?: string
  }
  status: 'pending'
  expiresAt: number
}

export interface SessionSnapshot {
  session: RemoteSessionSummary
  workspace: { id: string | null; name: string; cwd: string } | null
  messages: RemoteMessageRecord[]
  tools: RemoteToolCall[]
  pendingPermissions: RemotePermissionRequest[]
  snapshotSeq: number
}

export interface MappedEvent {
  event: EventPayload['event']
  sessionId?: string
  data: unknown
}

export interface AuthenticatedPeerChannel {
  /**
   * Attestation supplied by the Noise/control-plane integration. Implementors
   * must expose this channel only after both the Noise IK transcript and the
   * Server membership for this exact connection have been verified.
   */
  readonly security: {
    protocol: 'Noise_IK_25519_ChaChaPoly_SHA256'
    connectionId: string
    membershipId: string
  }
  readonly peerDeviceId: string
  readonly peerIdentityKey: string
  readonly mode?: 'LAN' | 'P2P' | 'TURN' | 'Relay'
  send(message: RemoteMessage | RemoteMessage<EventPayload>): Promise<void>
  onMessage(handler: (message: RemoteMessage) => void): () => void
  close(code?: string): Promise<void>
}
