import * as Haptics from 'expo-haptics'
import { create } from 'zustand'
import { friendlyError } from '../lib/errors'
import { normalizeServerUrl } from '../lib/server-url'
import { RemoteServerApi } from '../services/api'
import { createNativeRpcId } from '../services/api-proxy'
import { AndroidRemoteConnection } from '../services/connection'
import { reconcileTrustedDevices } from '../services/device-directory'
import { serverSession } from '../services/server-session'
import {
  clearLocalData,
  forgetHost,
  loadOrCreateIdentity,
  loadServerConfig,
  loadTrustedHosts,
  saveServerConfig,
  trustHost,
} from '../services/storage'
import type {
  ChatItem,
  ConnectionSnapshot,
  DeviceIdentity,
  HistoryEntry,
  HostDescriptor,
  MuxStreamFrame,
  RemoteDevice,
  RemoteSession,
  ServerConfig,
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
  sessions: RemoteSession[]
  selectedSession?: RemoteSession
  messages: Record<string, ChatItem[]>
  authPhase: AuthPhase
  refreshing: boolean
  busyAction?: string
  error?: string

  bootstrap(): Promise<void>
  configureServer(input: string, email: string, password: string): Promise<boolean>
  refreshDevices(): Promise<void>
  trustDevice(device: RemoteDevice): Promise<boolean>
  forgetDevice(deviceId: string): Promise<boolean>
  connectDevice(device: RemoteDevice): Promise<boolean>
  reconnect(): Promise<void>
  disconnect(): Promise<void>
  openSession(session: RemoteSession): Promise<boolean>
  sendMessage(text: string): Promise<boolean>
  stopSession(): Promise<void>
  respondApproval(itemId: string, outcome: 'allowed-once' | 'rejected'): Promise<void>
  respondQuestion(itemId: string, selected: Record<string, string[]>): Promise<void>
  resetLocalData(): Promise<void>
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
  sessions: [],
  messages: {},
  authPhase: 'idle',
  refreshing: false,

  async bootstrap() {
    set({ bootPhase: 'loading', error: undefined })
    try {
      const [config, identity] = await Promise.all([loadServerConfig(), loadOrCreateIdentity()])
      set({ config, identity, bootPhase: 'ready' })
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
      if (identity === undefined) throw new Error('The Android device identity is not ready.')
      const publicApi = new RemoteServerApi(baseUrl)
      await publicApi.health()
      const { credentials } = await serverSession.authenticateWithAccount(baseUrl, identity, email, password)
      const config = { baseUrl }
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

  async connectDevice(device) {
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
      await connection.connect(
        config.baseUrl,
        identity,
        device,
        credentials.accessToken,
        frame => get().handleMuxFrame(frame),
        {
          fetchIceServers: async connectionId => api.turnCredentials(connectionId),
          onClose: () => {
            if (get().connection.phase === 'connected' || get().connection.phase === 'reconnecting') {
              set({ connection: { phase: 'offline', stats: { mode: 'Disconnected', connected: false }, error: 'The host connection closed.' } })
            }
          },
        },
      )
      const proxy = connection.requireProxy()
      const [hostDescriptor, workspaces, sessions] = await Promise.all([
        proxy.hostDescribe(),
        proxy.workspaceList(),
        proxy.sessionList(),
      ])
      set({
        hostDescriptor,
        workspaces,
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

  async reconnect() {
    const device = get().selectedDevice
    if (device === undefined || get().connection.phase === 'connecting') return
    set(state => ({ connection: { ...state.connection, phase: 'reconnecting', error: undefined } }))
    await get().connectDevice(device)
  },

  async disconnect() {
    await connection.close()
    set({
      connection: disconnected,
      selectedDevice: undefined,
      hostDescriptor: undefined,
      workspaces: [],
      sessions: [],
      selectedSession: undefined,
    })
  },

  async openSession(session) {
    set({ busyAction: `session:${session.sessionId}`, error: undefined })
    try {
      const proxy = connection.requireProxy()
      const history = await proxy.sessionHistory(session.sessionId)
      const items = foldHistory(history.events, session.sessionId)
      set(state => ({
        selectedSession: session,
        messages: {
          ...state.messages,
          [session.sessionId]: mergeHistoryAndLive(items, state.messages[session.sessionId] ?? []),
        },
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
        throw new Error('Open the session before answering a host request.')
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
        throw new Error('Open the session before answering a host request.')
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

  setOffline() {
    if (get().connection.phase !== 'disconnected') {
      set({ connection: { phase: 'offline', stats: { mode: 'Disconnected', connected: false }, error: 'Network unavailable.' } })
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function initialData(): Pick<AppState,
  'config' | 'account' | 'devices' | 'selectedDevice' | 'connection' | 'hostDescriptor' | 'workspaces' |
  'sessions' | 'selectedSession' | 'messages' | 'authPhase' | 'refreshing' | 'busyAction' | 'error'> {
  return {
    config: undefined,
    account: undefined,
    devices: [],
    selectedDevice: undefined,
    connection: disconnected,
    hostDescriptor: undefined,
    workspaces: [],
    sessions: [],
    selectedSession: undefined,
    messages: {},
    authPhase: 'idle',
    refreshing: false,
    busyAction: undefined,
    error: undefined,
  }
}
