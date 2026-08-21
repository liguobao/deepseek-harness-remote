import type { TransportStats } from '@dsh-remote/protocol'
import zhCN from './locales/zh-CN'

export type ConnectionPhase =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'

export interface ServerConfig {
  baseUrl: string
  account?: string
  loginMethod?: 'oauth' | 'password'
}

export interface DeviceIdentity {
  deviceId: string
  name: string
  platform: 'android'
  publicKey: string
  privateKey: string
}

export interface DeviceCredentials {
  serverUrl: string
  deviceId: string
  authorizationMethod: 'account' | 'owned_device'
  account?: string
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken: string
  refreshTokenExpiresAt: number
}

/** A Host visible through same-account membership, with its pinned identity key. */
export interface RemoteDevice {
  deviceId: string
  name: string
  platform: string
  /** Pinned Noise static X25519 public key; never replaced by a Server response. */
  identityKey: string
  membershipId: string
  online: boolean
  role?: 'host' | 'client'
  clientVersion?: string
  harnessVersion?: string
  lastSeenAt?: number
  fingerprint?: string
  trusted: boolean
}

export interface DevicePresence {
  deviceId: string
  online: boolean
  lastSeenAt?: number
}

export interface HostDescriptor {
  version: string
  cwd: string
  provider?: string
  model?: string
  attachedSessions: number
  canOpenPath: boolean
}

export interface WorkspaceView {
  workspaceId: string
  path: string
  title: string
  sessionIds: string[]
  createdAt: string
  updatedAt: string
}

export interface WorkspaceList {
  items: WorkspaceView[]
  archivedSessionIds: string[]
}

export interface DirectoryEntry {
  name: string
  path: string
  hidden: boolean
}

export interface DirectoryListing {
  path: string
  home: string
  crumbs: DirectoryEntry[]
  entries: DirectoryEntry[]
  truncated: boolean
}

export interface ModelSelection {
  provider: string
  model: string
  reasoningEffort?: string
}

export interface ModelReasoningEffort {
  id: string
  name: string
  description?: string
}

export interface ModelReasoning {
  efforts: ModelReasoningEffort[]
  defaultEffort?: string
}

export interface ModelCatalogModel {
  id: string
  name: string
  description?: string
  reasoning?: ModelReasoning
}

export interface ModelProviderGroup {
  id: string
  name: string
  models: ModelCatalogModel[]
}

export interface ModelCatalogFailure {
  id: string
  name: string
  message: string
}

export interface SessionModels {
  current: ModelSelection
  routable: boolean
  groups: ModelProviderGroup[]
  failures: ModelCatalogFailure[]
}

/** Native ApiProxy session row projection (mirrors @deepseek-ai/dsh-host-apiproxy). */
export interface RemoteSession {
  sessionId: string
  updatedAt: number
  running: boolean
  blank: boolean
  title?: string
  parentSessionId?: string
  origin?: 'subagent'
  cwd?: string
  agentPreset?: string
  projections?: {
    values?: Record<string, unknown>
  }
}

export interface PermissionPresetOption {
  value: string
  name: string
  description?: string
}

export interface PermissionSelect {
  currentValue: string
  options: PermissionPresetOption[]
}

export interface HistoryEntry {
  event: NativeSessionEvent
  view?: { for: 'call' | 'result'; view: unknown }
}

export interface SessionHistoryPage {
  events: HistoryEntry[]
  hasMore: boolean
}

export interface ChatItemBase {
  id: string
  sessionId: string
  createdAt: number
}

export interface ChatMessage extends ChatItemBase {
  kind: 'message'
  role: 'user' | 'assistant' | 'system'
  text: string
  images?: ChatImage[]
  streaming?: boolean
  /** Native session.prompt rpcId used to reconcile an optimistic user message. */
  requestRpcId?: string
}

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'

/** Temporary image bytes carried only in one native session.prompt request. */
export interface PromptImage {
  uri: string
  mediaType: ImageMediaType
  data: string
  bytes: number
  width: number
  height: number
  name?: string
}

/** Image presentation retained in the local optimistic chat row. */
export interface ChatImage {
  uri?: string
  name?: string
}

export interface ImageAttachmentLimits {
  maxImageBytes: number
  maxImagesPerMessage: number
  maxMessageImageBytes: number
  maxImagePixels: number
  maxImageDimension: number
  mediaTypes: readonly ImageMediaType[]
}

export interface ToolActivity extends ChatItemBase {
  kind: 'tool'
  toolName: string
  arguments?: string
  summary?: string
  callDetail?: ToolDisplayDetail
  resultDetail?: ToolDisplayDetail
  state: 'running' | 'finished' | 'failed'
}

export interface ToolDisplayDetail {
  text: string
  format: 'code' | 'markdown'
  truncated?: boolean
}

export interface ApprovalActivity extends ChatItemBase {
  kind: 'approval'
  approvalId: string
  toolName: string
  reason?: string
  frameRpcId?: string
  outcome?: ApprovalOutcome
}

export type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'

export interface QuestionActivity extends ChatItemBase {
  kind: 'question'
  frameRpcId?: string
  questions: AskUserQuestionItem[]
  outcome?: 'answered' | 'cancelled'
}

export type ChatItem = ChatMessage | ToolActivity | ApprovalActivity | QuestionActivity

/** Wire-safe question surface (mirrors @deepseek-ai/dsh-user-questions/types). */
export interface AskUserQuestionOption {
  label: string
  description?: string
}

export interface AskUserQuestionItem {
  id: string
  question: string
  detail?: string
  header?: string
  options?: AskUserQuestionOption[]
  multiSelect?: boolean
  intent?: { kind: 'plan-review'; approve: string }
}

export interface AskUserQuestionAnswer {
  answers: Array<{ id: string; selected: string[]; custom?: string }>
}

/** Structural mirror of @deepseek-ai/dsh-session SessionEvent (wire subset used by chat). */
export interface NativeSessionEvent {
  type: string
  seq: number
  time: number
  data: Record<string, unknown>
  sourceEventSeqs?: number[]
  surfaceOp?: 'append' | 'replace'
  ignorable?: true
}

export interface MuxFrame {
  type: string
  sessionId?: string
  event?: NativeSessionEvent
  view?: unknown
  lastSeq?: number
  approvalId?: string
  toolName?: string
  callId?: string
  reason?: string
  outcome?: string
  questions?: AskUserQuestionItem[]
  questionRpcId?: string
  error?: unknown
}

/** One mux stream frame with its native rpcId (needed to answer approvals/questions). */
export interface MuxStreamFrame {
  rpcId: string
  payload: MuxFrame
}

export interface HarnessApiFrame {
  streamId: string
  frame: { rpcId: string; payload: MuxFrame }
}

export interface ConnectionSnapshot {
  phase: ConnectionPhase
  stats: TransportStats
  error?: string
}

export interface PairLink {
  server?: string
}

/** Client-side transport routing preference (mirrors the Web Remote console). */
export type TransportPreference = 'auto' | 'turn' | 'relay'

export interface TransportPreferenceOption {
  value: TransportPreference
  name: string
  description: string
}

export const TRANSPORT_PREFERENCE_OPTIONS: TransportPreferenceOption[] = [
  { value: 'auto', name: zhCN.transport.auto, description: zhCN.transport.autoDescription },
  { value: 'turn', name: zhCN.transport.turn, description: zhCN.transport.turnDescription },
  { value: 'relay', name: zhCN.transport.relay, description: zhCN.transport.relayDescription },
]
