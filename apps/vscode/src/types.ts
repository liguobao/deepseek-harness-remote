export interface DeviceIdentity {
  deviceId: string
  name: string
  platform: 'vscode'
  publicKey: string
  privateKey: string
}

export interface Credentials {
  serverUrl: string
  deviceId: string
  account: string
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken: string
  refreshTokenExpiresAt: number
}

export interface RemoteHost {
  deviceId: string
  name: string
  platform: string
  identityKey: string
  membershipId: string
  online: boolean
  lastSeenAt?: number
  clientVersion?: string
  harnessVersion?: string
}

export interface RemoteSession {
  sessionId: string
  updatedAt: number
  running: boolean
  blank: boolean
  title?: string
  cwd?: string
  parentSessionId?: string
  projections?: { values?: Record<string, unknown> }
}

export interface RemoteWorkspace {
  workspaceId: string
  path: string
  title: string
  sessionIds: string[]
}

export interface HistoryEntry {
  event: { type: string; data?: unknown; seq?: number }
  view?: { for: 'call' | 'result'; view: unknown }
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool'
  text: string
  toolCallId?: string
  toolState?: 'running' | 'completed' | 'failed'
  toolKind?: string
  toolCard?: string
  toolDetail?: string
}

export interface DirectoryEntry { name: string; path: string; hidden: boolean }
export interface DirectoryListing {
  path: string
  home: string
  crumbs: DirectoryEntry[]
  entries: DirectoryEntry[]
  truncated: boolean
}

export interface ModelSelection { provider: string; model: string; reasoningEffort?: string }
export interface SessionModels {
  current: ModelSelection
  routable: boolean
  groups: Array<{ id: string; name: string; models: Array<{ id: string; name: string; description?: string; reasoning?: { efforts: Array<{ id: string; name: string; description?: string }> } }> }>
}
export interface MuxFrame { rpcId: string; payload: Record<string, unknown> }
export interface PendingApproval { frameRpcId: string; sessionId: string; approvalId: string; toolName: string; reason?: string }
export interface HostDescriptor { version: string; cwd: string; provider?: string; model?: string; attachedSessions: number; canOpenPath: boolean }
