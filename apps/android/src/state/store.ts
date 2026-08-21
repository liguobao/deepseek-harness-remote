import * as Haptics from 'expo-haptics'
import { create } from 'zustand'
import zhCN from '../locales/zh-CN'
import { friendlyError, isRpcTimeoutError } from '../lib/errors'
import { normalizeServerUrl } from '../lib/server-url'
import { RemoteServerApi } from '../services/api'
import { createNativeRpcId } from '../services/api-proxy'
import { AndroidRemoteConnection } from '../services/connection'
import { reconcileTrustedDevices } from '../services/device-directory'
import { resolveAutomaticPreferredTransports } from '../services/network-route'
import { serverSession } from '../services/server-session'
import {
  clearLocalData,
  forgetHost,
  loadOrCreateIdentity,
  loadServerConfig,
  loadTransportPreference,
  loadTrustedHosts,
  saveServerConfig,
  saveTransportPreference,
  trustHost,
} from '../services/storage'
import type {
  ChatItem,
  ConnectionSnapshot,
  DeviceIdentity,
  HistoryEntry,
  HostDescriptor,
  ModelSelection,
  MuxStreamFrame,
  RemoteDevice,
  RemoteSession,
  ServerConfig,
  SessionModels,
  TransportPreference,
  WorkspaceList,
  WorkspaceView,
} from '../types'
import { foldHistory, applyMuxFrameToMessages } from './event-reducer'

type BootPhase = 'loading' | 'ready' | 'error'
type AuthPhase = 'idle' | 'authenticating' | 'complete' | 'error'

interface AppState {
  bootPhase: BootPhase
  config?: ServerConfig
  identity?: DeviceIdentity
  account?: string
  devices: RemoteDevice[]
  selectedDevice?: RemoteDevice
  connection: ConnectionSnapshot
  hostDescriptor?: HostDescriptor
  workspaces: WorkspaceView[]
  archivedSessionIds: string[]
  sessions: RemoteSession[]
  selectedSession?: RemoteSession
  messages: Record<string, ChatItem[]>
  sessionModels?: SessionModels
  modelSelecting: boolean
  permissionSelecting: boolean
  historyHasMore: boolean
  historyLoadingOlder: boolean
  oldestLoadedSeq?: number
  transportPreference: TransportPreference
  pendingOAuthBaseUrl?: string
  authPhase: AuthPhase
  refreshing: boolean
  busyAction?: string
  error?: string

  bootstrap(): Promise<void>
  configureServer(input: string, email: string, password: string): Promise<boolean>
  startOAuth(input: string): Promise<string | undefined>
  completeOAuth(token: string): Promise<boolean>
  configureServerWithOAuthToken(input: string, webToken: string): Promise<boolean>
  refreshDevices(): Promise<void>
  trustDevice(device: RemoteDevice): Promise<boolean>
  forgetDevice(deviceId: string): Promise<boolean>
  connectDevice(device: RemoteDevice, options?: { forceRelay?: boolean }): Promise<boolean>
  reconnect(options?: { forceRelay?: boolean }): Promise<boolean>
  disconnect(): Promise<void>
  openSession(session: RemoteSession): Promise<boolean>
  sendMessage(text: string): Promise<boolean>
  stopSession(): Promise<void>
  respondApproval(itemId: string, outcome: 'allowed-once' | 'rejected'): Promise<void>
  respondQuestion(itemId: string, selected: Record<string, string[]>): Promise<void>
  createSession(workspaceId?: string): Promise<boolean>
  archiveSession(sessionId: string): Promise<boolean>
  selectModel(selection: ModelSelection): Promise<boolean>
  selectPermission(preset: string): Promise<boolean>
  loadOlderHistory(): Promise<void>
  workspaceCreate(path: string): Promise<boolean>
  workspaceRename(workspaceId: string, title: string): Promise<boolean>
  workspaceDelete(workspaceId: string): Promise<boolean>
  workspaceMove(workspaceId: string, beforeWorkspaceId?: string): Promise<boolean>
  hostListDirectory(path?: string): Promise<import('../types').DirectoryListing | undefined>
  setTransportPreference(preference: TransportPreference): Promise<void>
  resetLocalData(): Promise<void>
  signOut(): Promise<void>
  setOffline(): void
  clearError(): void
  handleMuxFrame(frame: MuxStreamFrame): void
}

const disconnected: ConnectionSnapshot = {
  phase: 'disconnected',
  stats: { mode: 'Disconnected', connected: false },
}

const connection = new AndroidRemoteConnection()

export const useAppStore = create<AppState>((set, get) => ({
  bootPhase: 'loading',
  devices: [],
  connection: disconnected,
  workspaces: [],
  archivedSessionIds: [],
  sessions: [],
  messages: {},
  modelSelecting: false,
  permissionSelecting: false,
  historyHasMore: false,
  historyLoadingOlder: false,
  transportPreference: 'auto',
  authPhase: 'idle',
  refreshing: false,

  async bootstrap() {
    set({ bootPhase: 'loading', error: undefined })
    try {
      const [config, identity, transportPreference] = await Promise.all([
        loadServerConfig(),
        loadOrCreateIdentity(),
        loadTransportPreference(),
      ])
      set({ config, identity, account: config?.account, transportPreference, bootPhase: 'ready' })
      if (config !== undefined) await get().refreshDevices()
    } catch (error) {
      set({ bootPhase: 'error', error: friendlyError(error) })
    }
  },

  async configureServer(input, email, password) {
    set({ busyAction: 'server', error: undefined })
    try {
      const baseUrl = normalizeServerUrl(input)
      const identity = get().identity
      if (identity === undefined) throw new Error(zhCN.runtime.identityNotReady)
      const publicApi = new RemoteServerApi(baseUrl)
      await publicApi.health()
      const { credentials } = await serverSession.authenticateWithAccount(baseUrl, identity, email, password)
      const config = { baseUrl, account: credentials.account, loginMethod: 'password' as const }
      await saveServerConfig(config)
      set({
        config,
        account: credentials.account,
        busyAction: undefined,
        devices: [],
        authPhase: 'complete',
      })
      await get().refreshDevices()
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  /**
   * Start Zhihu OAuth: validate the server, check OAuth is configured, and
   * return the browser URL the UI should open. The server is remembered so
   * the deep-link callback can finish device registration.
   */
  async startOAuth(input) {
    set({ busyAction: 'oauth', error: undefined })
    try {
      const baseUrl = normalizeServerUrl(input)
      const publicApi = new RemoteServerApi(baseUrl)
      await publicApi.health()
      const { configured } = await publicApi.oauthStatus()
      if (!configured) throw new Error(zhCN.runtime.zhihuUnsupported)
      set({ pendingOAuthBaseUrl: baseUrl, busyAction: undefined })
      return `${baseUrl}/api/v1/auth/oauth/start?return_to=${encodeURIComponent('dshremote://oauth')}`
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return undefined
    }
  },

  /** Finish OAuth from the dshremote://oauth deep link with the web token. */
  async completeOAuth(token) {
    const baseUrl = get().pendingOAuthBaseUrl
    if (baseUrl === undefined || token.length < 16) {
      set({ pendingOAuthBaseUrl: undefined })
      return false
    }
    set({ pendingOAuthBaseUrl: undefined })
    return get().configureServerWithOAuthToken(baseUrl, token)
  },

  async configureServerWithOAuthToken(input, webToken) {
    set({ busyAction: 'server', error: undefined })
    try {
      const baseUrl = normalizeServerUrl(input)
      const identity = get().identity
      if (identity === undefined) throw new Error(zhCN.runtime.identityNotReady)
      const publicApi = new RemoteServerApi(baseUrl)
      await publicApi.health()
      const { credentials } = await serverSession.authenticateWithOAuthToken(baseUrl, identity, webToken)
      const config = { baseUrl, account: credentials.account, loginMethod: 'oauth' as const }
      await saveServerConfig(config)
      set({
        config,
        account: credentials.account,
        busyAction: undefined,
        devices: [],
        authPhase: 'complete',
      })
      await get().refreshDevices()
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async refreshDevices() {
    const { config, identity } = get()
    if (config === undefined || identity === undefined) return
    set({ refreshing: true })
    try {
      const trusted = await loadTrustedHosts()
      const { api } = await serverSession.authenticate(config.baseUrl, identity)
      const result = await reconcileTrustedDevices(api, trusted)
      await Promise.all(result.missingTrustedDeviceIds.map(forgetHost))
      set({ devices: result.devices, refreshing: false })
    } catch (error) {
      set({ refreshing: false, error: friendlyError(error) })
    }
  },

  async trustDevice(device) {
    if (device.identityKey.length === 0) return false
    await trustHost(device)
    set(state => ({
      devices: state.devices.map(item => item.deviceId === device.deviceId ? { ...item, trusted: true } : item),
    }))
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    return true
  },

  async connectDevice(device, options = {}) {
    const { config, identity } = get()
    if (config === undefined || identity === undefined) return false
    set({
      selectedDevice: device,
      connection: { phase: 'connecting', stats: { mode: 'Disconnected', connected: false } },
      hostDescriptor: undefined,
      workspaces: [],
      sessions: [],
      error: undefined,
    })
    try {
      const { api, credentials } = await serverSession.authenticate(config.baseUrl, identity)
      const preference = get().transportPreference
      const forceRelay = options.forceRelay === true || preference === 'relay'
      const preferredTransports = forceRelay
        ? ['relay'] as const
        : preference === 'turn'
          ? ['turn', 'relay'] as const
          : await resolveAutomaticPreferredTransports()
      await connection.connect(
        config.baseUrl,
        identity,
        device,
        credentials.accessToken,
        frame => get().handleMuxFrame(frame),
        {
          fetchIceServers: async connectionId => api.turnCredentials(connectionId),
          preferredTransports: [...preferredTransports],
          forceRelay,
          onClose: () => {
            if (get().connection.phase === 'connected' || get().connection.phase === 'reconnecting') {
              set({ connection: { phase: 'offline', stats: { mode: 'Disconnected', connected: false }, error: zhCN.runtime.hostClosed } })
            }
          },
        },
      )
      const proxy = connection.requireProxy()
      const [hostDescriptor, workspaceList, sessions] = await Promise.all([
        proxy.hostDescribe(),
        proxy.workspaceList(),
        proxy.sessionList(),
      ])
      set({
        hostDescriptor,
        workspaces: workspaceList.items,
        archivedSessionIds: workspaceList.archivedSessionIds,
        sessions,
        connection: { phase: 'connected', stats: connection.getStats() ?? { mode: 'Relay', connected: true } },
      })
      return true
    } catch (error) {
      await connection.close()
      const message = friendlyError(error)
      set({ connection: { phase: 'offline', stats: { mode: 'Disconnected', connected: false }, error: message }, error: message })
      return false
    }
  },

  async reconnect(options = {}) {
    const device = get().selectedDevice
    if (device === undefined || get().connection.phase === 'connecting') return false
    set(state => ({ connection: { ...state.connection, phase: 'reconnecting', error: undefined } }))
    return get().connectDevice(device, options)
  },

  async disconnect() {
    await connection.close()
    set({
      connection: disconnected,
      selectedDevice: undefined,
      hostDescriptor: undefined,
      workspaces: [],
      archivedSessionIds: [],
      sessions: [],
      selectedSession: undefined,
      sessionModels: undefined,
      historyHasMore: false,
      historyLoadingOlder: false,
      oldestLoadedSeq: undefined,
    })
  },

  async openSession(session) {
    set({ busyAction: `session:${session.sessionId}`, error: undefined })
    const load = async () => {
      const history = await connection.requireProxy().sessionHistory(session.sessionId)
      const items = foldHistory(history.events, session.sessionId)
      set(state => ({
        selectedSession: session,
        messages: {
          ...state.messages,
          [session.sessionId]: mergeHistoryAndLive(items, state.messages[session.sessionId] ?? []),
        },
        historyHasMore: history.hasMore,
        oldestLoadedSeq: oldestSeq(history.events),
        busyAction: undefined,
      }))
      void refreshSessionModels(session.sessionId)
    }
    try {
      await load()
      return true
    } catch (error) {
      if (isRpcTimeoutError(error)) {
        // session.history is read-only, so it is safe to recover the stale
        // path with a fresh Relay-only connection and retry exactly once.
        // Mutating ApiProxy calls deliberately do not use this path because a
        // timeout leaves their result unknown.
        const recovered = await get().reconnect({ forceRelay: true })
        if (recovered) {
          try {
            await load()
            return true
          } catch (retryError) {
            set({ busyAction: undefined, error: friendlyError(retryError) })
            return false
          }
        }
        set({ busyAction: undefined })
        return false
      }
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async createSession(workspaceId) {
    if (get().connection.phase !== 'connected') return false
    set({ busyAction: 'create-session', error: undefined })
    try {
      const proxy = connection.requireProxy()
      const { sessionId } = await proxy.sessionCreate(workspaceId)
      const sessions = await proxy.sessionList()
      set({ sessions, busyAction: undefined })
      const created = sessions.find(session => session.sessionId === sessionId)
      if (created !== undefined) await get().openSession(created)
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async archiveSession(sessionId) {
    if (get().connection.phase !== 'connected') return false
    set({ busyAction: `archive:${sessionId}`, error: undefined })
    try {
      const proxy = connection.requireProxy()
      const archivedSessionIds = await proxy.workspaceArchiveSession(sessionId)
      const sessions = await proxy.sessionList()
      set(state => ({
        archivedSessionIds,
        sessions,
        busyAction: undefined,
        selectedSession: state.selectedSession?.sessionId === sessionId ? undefined : state.selectedSession,
        sessionModels: state.selectedSession?.sessionId === sessionId ? undefined : state.sessionModels,
      }))
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async selectModel(selection) {
    const session = get().selectedSession
    if (session === undefined || get().connection.phase !== 'connected') return false
    set({ modelSelecting: true, error: undefined })
    try {
      const selected = await connection.requireProxy().sessionSelectModel(session.sessionId, selection)
      set(state => ({
        sessionModels: state.sessionModels === undefined ? undefined : { ...state.sessionModels, current: selected },
        modelSelecting: false,
      }))
      return true
    } catch (error) {
      set({ modelSelecting: false, error: friendlyError(error) })
      return false
    }
  },

  async selectPermission(preset) {
    const session = get().selectedSession
    if (session === undefined || get().connection.phase !== 'connected') return false
    set({ permissionSelecting: true, error: undefined })
    try {
      await connection.requireProxy().sessionSelectPermission(session.sessionId, preset)
      set(state => {
        const update = (item: RemoteSession): RemoteSession => {
          if (item.sessionId !== session.sessionId || item.projections?.values === undefined) return item
          const permissions = item.projections.values.permissions
          if (typeof permissions !== 'object' || permissions === null) return item
          return {
            ...item,
            projections: { values: { ...item.projections.values, permissions: { ...permissions, currentValue: preset } } },
          }
        }
        return {
          sessions: state.sessions.map(update),
          selectedSession: state.selectedSession === undefined ? undefined : update(state.selectedSession),
          permissionSelecting: false,
        }
      })
      return true
    } catch (error) {
      set({ permissionSelecting: false, error: friendlyError(error) })
      return false
    }
  },

  async workspaceRename(workspaceId, title) {
    if (get().connection.phase !== 'connected') return false
    set({ busyAction: `rename-workspace:${workspaceId}`, error: undefined })
    try {
      const proxy = connection.requireProxy()
      const workspace = await proxy.workspaceRename(workspaceId, title)
      set(state => ({
        workspaces: state.workspaces.map(item => item.workspaceId === workspaceId ? workspace : item),
        busyAction: undefined,
      }))
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async workspaceDelete(workspaceId) {
    if (get().connection.phase !== 'connected') return false
    set({ busyAction: `delete-workspace:${workspaceId}`, error: undefined })
    try {
      const proxy = connection.requireProxy()
      await proxy.workspaceDelete(workspaceId)
      set(state => ({
        workspaces: state.workspaces.filter(item => item.workspaceId !== workspaceId),
        sessions: state.sessions.filter(session => {
          const workspace = state.workspaces.find(item => item.workspaceId === workspaceId)
          return workspace === undefined || !workspace.sessionIds.includes(session.sessionId)
        }),
        busyAction: undefined,
      }))
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async workspaceMove(workspaceId, beforeWorkspaceId) {
    if (get().connection.phase !== 'connected') return false
    set({ busyAction: `move-workspace:${workspaceId}`, error: undefined })
    try {
      const proxy = connection.requireProxy()
      const workspaceIds = await proxy.workspaceInsertBefore(workspaceId, beforeWorkspaceId)
      const byId = new Map(get().workspaces.map(item => [item.workspaceId, item]))
      set({
        workspaces: workspaceIds.flatMap(id => byId.get(id) === undefined ? [] : [byId.get(id)!]),
        busyAction: undefined,
      })
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async hostListDirectory(path) {
    if (get().connection.phase !== 'connected') return undefined
    try {
      return await connection.requireProxy().hostListDirectory(path)
    } catch (error) {
      set({ error: friendlyError(error) })
      return undefined
    }
  },

  async loadOlderHistory() {
    const session = get().selectedSession
    const beforeSeq = get().oldestLoadedSeq
    if (session === undefined || beforeSeq === undefined || get().historyLoadingOlder || !get().historyHasMore) return
    set({ historyLoadingOlder: true })
    try {
      const page = await connection.requireProxy().sessionHistory(session.sessionId, beforeSeq, 60)
      const items = foldHistory(page.events, session.sessionId)
      const older = oldestSeq(page.events)
      set(state => ({
        messages: {
          ...state.messages,
          [session.sessionId]: prependHistory(items, state.messages[session.sessionId] ?? []),
        },
        historyHasMore: page.hasMore,
        oldestLoadedSeq: older ?? state.oldestLoadedSeq,
        historyLoadingOlder: false,
      }))
    } catch (error) {
      set({ historyLoadingOlder: false, error: friendlyError(error) })
    }
  },

  async workspaceCreate(path) {
    if (get().connection.phase !== 'connected') return false
    set({ busyAction: 'create-workspace', error: undefined })
    try {
      const proxy = connection.requireProxy()
      const { workspace } = await proxy.workspaceCreate(path)
      set(state => ({
        workspaces: [...state.workspaces.filter(item => item.workspaceId !== workspace.workspaceId), workspace],
        busyAction: undefined,
      }))
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async sendMessage(input) {
    const session = get().selectedSession
    const text = input.trim()
    if (session === undefined || text.length === 0) return false
    const requestRpcId = createNativeRpcId()
    const optimistic: ChatItem = {
      kind: 'message',
      id: `local:${Date.now()}`,
      sessionId: session.sessionId,
      role: 'user',
      text,
      createdAt: Date.now(),
      requestRpcId,
    }
    set(state => ({
      messages: { ...state.messages, [session.sessionId]: [...(state.messages[session.sessionId] ?? []), optimistic] },
      busyAction: 'send-message',
      error: undefined,
    }))
    try {
      await connection.requireProxy().sessionPrompt(session.sessionId, text, requestRpcId)
      set({ busyAction: undefined })
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      return true
    } catch (error) {
      set(state => ({
        messages: {
          ...state.messages,
          [session.sessionId]: (state.messages[session.sessionId] ?? []).filter(item => item.id !== optimistic.id),
        },
        busyAction: undefined,
        error: friendlyError(error),
      }))
      return false
    }
  },

  async stopSession() {
    const session = get().selectedSession
    if (session === undefined) return
    set({ busyAction: 'stop-session' })
    try {
      await connection.requireProxy().sessionCancel(session.sessionId)
    } catch (error) {
      set({ error: friendlyError(error) })
    } finally {
      set({ busyAction: undefined })
    }
  },

  async respondApproval(itemId, outcome) {
    set({ busyAction: `approval:${itemId}`, error: undefined })
    try {
      const proxy = connection.requireProxy()
      const item = findApproval(get().messages, itemId)
      if (item === undefined || item.frameRpcId === undefined) {
        throw new Error(zhCN.runtime.openSessionFirst)
      }
      await proxy.respondApproval(item.frameRpcId, item.sessionId, item.approvalId, outcome)
      set(state => ({
        messages: mapApprovalOutcome(state.messages, itemId, outcome),
        busyAction: undefined,
      }))
      await Haptics.notificationAsync(outcome === 'rejected'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
    }
  },

  async respondQuestion(itemId, selected) {
    set({ busyAction: `question:${itemId}`, error: undefined })
    try {
      const proxy = connection.requireProxy()
      const item = findQuestion(get().messages, itemId)
      if (item === undefined || item.frameRpcId === undefined) {
        throw new Error(zhCN.runtime.openSessionFirst)
      }
      const answers = item.questions.map(question => ({
        id: question.id,
        selected: selected[question.id] ?? [],
      }))
      await proxy.respondQuestion(item.frameRpcId, item.sessionId, { answers })
      set(state => ({
        messages: mapQuestionAnswered(state.messages, itemId),
        busyAction: undefined,
      }))
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
    }
  },

  async forgetDevice(deviceId) {
    const { config, identity } = get()
    if (config === undefined || identity === undefined) return false
    set({ busyAction: `forget:${deviceId}`, error: undefined })
    try {
      if (get().selectedDevice?.deviceId === deviceId) await get().disconnect()
      await forgetHost(deviceId)
      set(state => ({
        devices: state.devices.filter(device => device.deviceId !== deviceId),
        busyAction: undefined,
      }))
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async resetLocalData() {
    await get().disconnect()
    await clearLocalData()
    const identity = await loadOrCreateIdentity()
    set({ ...initialData(), identity, bootPhase: 'ready' })
  },

  async signOut() {
    const { config, identity } = get()
    await get().disconnect()
    if (config !== undefined && identity !== undefined) {
      try {
        const { api } = await serverSession.authenticate(config.baseUrl, identity)
        await api.removeSelf()
      } catch {
        // Local sign-out must still complete if the server is unavailable.
      }
    }
    await clearLocalData()
    const nextIdentity = await loadOrCreateIdentity()
    set({ ...initialData(), identity: nextIdentity, bootPhase: 'ready' })
  },

  async setTransportPreference(preference) {
    await saveTransportPreference(preference)
    const wasConnected = get().connection.phase === 'connected' || get().connection.phase === 'reconnecting'
    set({ transportPreference: preference })
    if (wasConnected) await get().reconnect()
  },

  setOffline() {
    if (get().connection.phase !== 'disconnected') {
      set({ connection: { phase: 'offline', stats: { mode: 'Disconnected', connected: false }, error: zhCN.runtime.networkUnavailable } })
    }
  },

  clearError() {
    set({ error: undefined })
  },

  handleMuxFrame(frame) {
    set(state => ({
      messages: applyMuxFrameToMessages(state.messages, frame),
    }))
  },
}))

function findApproval(messages: Record<string, ChatItem[]>, itemId: string) {
  for (const items of Object.values(messages)) {
    const found = items.find(item => item.kind === 'approval' && item.id === itemId)
    if (found !== undefined && found.kind === 'approval') return found
  }
  return undefined
}

function findQuestion(messages: Record<string, ChatItem[]>, itemId: string) {
  for (const items of Object.values(messages)) {
    const found = items.find(item => item.kind === 'question' && item.id === itemId)
    if (found !== undefined && found.kind === 'question') return found
  }
  return undefined
}

function mapApprovalOutcome(
  messages: Record<string, ChatItem[]>,
  itemId: string,
  outcome: 'allowed-once' | 'rejected',
): Record<string, ChatItem[]> {
  return mapItems(messages, item => item.kind === 'approval' && item.id === itemId
    ? { ...item, outcome }
    : item)
}

function mapQuestionAnswered(
  messages: Record<string, ChatItem[]>,
  itemId: string,
): Record<string, ChatItem[]> {
  return mapItems(messages, item => item.kind === 'question' && item.id === itemId
    ? { ...item, outcome: 'answered' as const }
    : item)
}

function mapItems(
  messages: Record<string, ChatItem[]>,
  map: (item: ChatItem) => ChatItem,
): Record<string, ChatItem[]> {
  return Object.fromEntries(Object.entries(messages).map(([sessionId, items]) => [sessionId, items.map(map)]))
}

function mergeHistoryAndLive(history: ChatItem[], live: ChatItem[]): ChatItem[] {
  const liveById = new Map(live.map(item => [item.id, item]))
  const historyIds = new Set(history.map(item => item.id))
  return [
    ...history.map(item => liveById.get(item.id) ?? item),
    ...live.filter(item => !historyIds.has(item.id)),
  ]
}

/** Prepend an older history page in front of the current chat items, deduplicated by id. */
function prependHistory(older: ChatItem[], current: ChatItem[]): ChatItem[] {
  const currentIds = new Set(current.map(item => item.id))
  return [...older.filter(item => !currentIds.has(item.id)), ...current]
}

/** Smallest event seq in a history page; drives the next `session.history` beforeSeq. */
function oldestSeq(events: HistoryEntry[]): number | undefined {
  let oldest: number | undefined
  for (const entry of events) {
    const seq = entry.event.seq
    if (Number.isSafeInteger(seq)) oldest = oldest === undefined ? seq : Math.min(oldest, seq)
  }
  return oldest
}

/** Best-effort model catalog load; a failure must not block opening the session. */
async function refreshSessionModels(sessionId: string): Promise<void> {
  try {
    const models = await connection.requireProxy().sessionModels(sessionId)
    useAppStore.setState({ sessionModels: models })
  } catch {
    // ignored: the chat stays usable without a model catalog
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function initialData(): Pick<AppState,
  'config' | 'account' | 'devices' | 'selectedDevice' | 'connection' | 'hostDescriptor' | 'workspaces' |
  'archivedSessionIds' | 'sessions' | 'selectedSession' | 'messages' | 'sessionModels' | 'modelSelecting' | 'permissionSelecting' |
  'historyHasMore' | 'historyLoadingOlder' | 'oldestLoadedSeq' | 'transportPreference' | 'authPhase' | 'refreshing' | 'busyAction' | 'error'> {
  return {
    config: undefined,
    account: undefined,
    devices: [],
    selectedDevice: undefined,
    connection: disconnected,
    hostDescriptor: undefined,
    workspaces: [],
    archivedSessionIds: [],
    sessions: [],
    selectedSession: undefined,
    messages: {},
    sessionModels: undefined,
    modelSelecting: false,
    permissionSelecting: false,
    historyHasMore: false,
    historyLoadingOlder: false,
    oldestLoadedSeq: undefined,
    transportPreference: 'auto',
    authPhase: 'idle',
    refreshing: false,
    busyAction: undefined,
    error: undefined,
  }
}
