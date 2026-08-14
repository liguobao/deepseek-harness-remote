import type { PermissionDecision, PermissionRequest, SessionSummary, TransportStats } from '@dsh-remote/protocol'

export type ConnectionPhase =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'

export interface ServerConfig {
  baseUrl: string
}

export interface DeviceIdentity {
  deviceId: string
  name: string
  platform: 'android'
  publicKey: string
  privateKey: string
}

export interface RemoteDevice {
  deviceId: string
  name: string
  platform: string
  publicKey: string
  online: boolean
  role?: 'host' | 'client'
  lastSeenAt?: string
  trusted?: boolean
}

export interface PairingResult {
  pairingId: string
  hostDeviceId: string
  requiresHostConfirmation: boolean
}

export interface PairingStatus {
  pairingId: string
  hostDeviceId: string
  claimedBy?: string
  confirmed: boolean
}

export interface SystemInfo {
  deviceId: string
  deviceName: string
  os: string
  hostname?: string
  harnessVersion?: string
  pluginVersion?: string
  online: boolean
  connectionMode: TransportStats['mode']
  capabilities?: string[]
}

export interface WorkspaceInfo {
  cwd: string
  name?: string
}

export interface RemoteSession extends SessionSummary {
  messages?: ChatItem[]
}

interface ChatItemBase {
  id: string
  sessionId: string
  createdAt: number
}

export interface ChatMessage extends ChatItemBase {
  kind: 'message'
  role: 'user' | 'assistant' | 'system'
  text: string
  streaming?: boolean
}

export interface ToolActivity extends ChatItemBase {
  kind: 'tool'
  toolName: string
  summary?: string
  state: 'running' | 'finished' | 'failed'
}

export interface PermissionActivity extends ChatItemBase {
  kind: 'permission'
  request: PermissionRequest
  decision?: PermissionDecision
}

export type ChatItem = ChatMessage | ToolActivity | PermissionActivity

export interface ConnectionSnapshot {
  phase: ConnectionPhase
  stats: TransportStats
  error?: string
}

export interface PairLink {
  server?: string
  code?: string
}
