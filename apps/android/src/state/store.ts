import type { EventPayload, PermissionDecision } from '@dsh-remote/protocol'
import * as Haptics from 'expo-haptics'
import { create } from 'zustand'
import { friendlyError } from '../lib/errors'
import { normalizePairingCode, normalizeServerUrl } from '../lib/server-url'
import { RemoteServerApi } from '../services/api'
import { AndroidRemoteConnection } from '../services/connection'
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
  RemoteDevice,
  RemoteSession,
  ServerConfig,
  SystemInfo,
  WorkspaceInfo,
} from '../types'
import { applyRemoteEvent } from './event-reducer'

type BootPhase = 'loading' | 'ready' | 'error'
type PairingPhase = 'idle' | 'claiming' | 'waiting' | 'complete' | 'error'

interface AppState {
  bootPhase: BootPhase
  config?: ServerConfig
  identity?: DeviceIdentity
  devices: RemoteDevice[]
  selectedDevice?: RemoteDevice
  connection: ConnectionSnapshot
  systemInfo?: SystemInfo
  workspace?: WorkspaceInfo
  sessions: RemoteSession[]
  selectedSession?: RemoteSession
  messages: Record<string, ChatItem[]>
  pairingPhase: PairingPhase
  pairingMessage?: string
  refreshing: boolean
  busyAction?: string
  error?: string

  bootstrap(): Promise<void>
  configureServer(input: string): Promise<boolean>
  pairDevice(code: string): Promise<RemoteDevice | undefined>
  refreshDevices(): Promise<void>
  connectDevice(device: RemoteDevice): Promise<boolean>
  reconnect(): Promise<void>
  disconnect(): Promise<void>
  openSession(session: RemoteSession): Promise<boolean>
  createSession(): Promise<RemoteSession | undefined>
  sendMessage(text: string): Promise<boolean>
  stopSession(): Promise<void>
  respondPermission(requestId: string, decision: PermissionDecision): Promise<void>
  forgetDevice(deviceId: string): Promise<void>
  resetLocalData(): Promise<void>
  setOffline(): void
  clearError(): void
  handleRemoteEvent(event: EventPayload): void
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
  sessions: [],
  messages: {},
  pairingPhase: 'idle',
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

  async configureServer(input) {
    set({ busyAction: 'server', error: undefined })
    try {
      const baseUrl = normalizeServerUrl(input)
      await new RemoteServerApi(baseUrl).health()
      const config = { baseUrl }
      await saveServerConfig(config)
      set({ config, busyAction: undefined, devices: [] })
      await get().refreshDevices()
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async pairDevice(input) {
    const { config, identity } = get()
    if (config === undefined || identity === undefined) return undefined
    const code = normalizePairingCode(input)
    if (code.replace('-', '').length !== 8) {
      set({ pairingPhase: 'error', pairingMessage: 'Enter all 8 characters from the host.' })
      return undefined
    }

    set({ pairingPhase: 'claiming', pairingMessage: undefined, error: undefined })
    try {
      const api = new RemoteServerApi(config.baseUrl)
      const claim = await api.claimPairing(code, identity)
      set({ pairingPhase: 'waiting', pairingMessage: 'Confirm this phone on the host.' })
      await waitForConfirmation(api, claim.pairingId, identity.deviceId)
      const host = { ...await api.getDevice(claim.hostDeviceId), trusted: true }
      if (host.publicKey.length === 0) throw new Error('The host did not provide an encryption key. Create a new pairing code.')
      await trustHost(host)
      set(state => ({
        pairingPhase: 'complete',
        pairingMessage: 'Device paired securely.',
        devices: mergeDevices(state.devices, [host]),
      }))
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      return host
    } catch (error) {
      set({ pairingPhase: 'error', pairingMessage: friendlyError(error) })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return undefined
    }
  },

  async refreshDevices() {
    const { config } = get()
    if (config === undefined) return
    set({ refreshing: true })
    const trusted = await loadTrustedHosts()
    const api = new RemoteServerApi(config.baseUrl)
    const current = await Promise.all(trusted.map(async host => {
      try {
        return { ...await api.getDevice(host.deviceId), trusted: true }
      } catch {
        return { ...host, online: false, trusted: true }
      }
    }))
    set({ devices: current.filter(device => device.role !== 'client'), refreshing: false })
  },

  async connectDevice(device) {
    const { config, identity } = get()
    if (config === undefined || identity === undefined) return false
    set({
      selectedDevice: device,
      connection: { phase: 'connecting', stats: { mode: 'Disconnected', connected: false } },
      systemInfo: undefined,
      workspace: undefined,
      sessions: [],
      error: undefined,
    })
    try {
      await connection.connect(config.baseUrl, identity, device, event => get().handleRemoteEvent(event))
      const [systemInfo, workspace, sessions] = await Promise.all([
        connection.systemInfo(), connection.workspace(), connection.sessions(),
      ])
      set({
        systemInfo,
        workspace,
        sessions,
        connection: { phase: 'connected', stats: { mode: 'Relay', connected: true } },
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
    set({ connection: disconnected, selectedDevice: undefined, systemInfo: undefined, workspace: undefined, sessions: [], selectedSession: undefined })
  },

  async openSession(session) {
    set({ busyAction: `session:${session.id}`, error: undefined })
    try {
      const detail = await connection.session(session.id)
      const items = Array.isArray(detail.messages) ? detail.messages.filter(isChatItem) : []
      set(state => ({
        selectedSession: detail,
        messages: { ...state.messages, [session.id]: items },
        busyAction: undefined,
      }))
      return true
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return false
    }
  },

  async createSession() {
    set({ busyAction: 'create-session', error: undefined })
    try {
      const session = await connection.createSession(get().workspace?.cwd)
      set(state => ({ sessions: upsertSession(state.sessions, session), busyAction: undefined }))
      return session
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
      return undefined
    }
  },

  async sendMessage(input) {
    const session = get().selectedSession
    const text = input.trim()
    if (session === undefined || text.length === 0) return false
    const optimistic: ChatItem = {
      kind: 'message',
      id: `local:${Date.now()}`,
      sessionId: session.id,
      role: 'user',
      text,
      createdAt: Date.now(),
    }
    set(state => ({
      messages: { ...state.messages, [session.id]: [...(state.messages[session.id] ?? []), optimistic] },
      busyAction: 'send-message',
      error: undefined,
    }))
    try {
      await connection.sendMessage(session.id, text)
      set({ busyAction: undefined })
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      return true
    } catch (error) {
      set(state => ({
        messages: {
          ...state.messages,
          [session.id]: (state.messages[session.id] ?? []).filter(item => item.id !== optimistic.id),
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
      await connection.stop(session.id)
    } catch (error) {
      set({ error: friendlyError(error) })
    } finally {
      set({ busyAction: undefined })
    }
  },

  async respondPermission(requestId, decision) {
    set({ busyAction: `permission:${requestId}`, error: undefined })
    try {
      await connection.respondPermission(requestId, decision)
      set(state => ({
        messages: mapPermissionDecision(state.messages, requestId, decision),
        busyAction: undefined,
      }))
      await Haptics.notificationAsync(decision === 'deny'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      set({ busyAction: undefined, error: friendlyError(error) })
    }
  },

  async forgetDevice(deviceId) {
    if (get().selectedDevice?.deviceId === deviceId) await get().disconnect()
    await forgetHost(deviceId)
    set(state => ({ devices: state.devices.filter(device => device.deviceId !== deviceId) }))
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

  handleRemoteEvent(event: EventPayload) {
    set(state => reduceEvent(state, event))
  },
}))

async function waitForConfirmation(api: RemoteServerApi, pairingId: string, clientDeviceId: string): Promise<void> {
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    const status = await api.pairingStatus(pairingId)
    if (status.claimedBy !== clientDeviceId) throw new Error('This pairing code was claimed by another device.')
    if (status.confirmed) return
    await delay(1_500)
  }
  throw new Error('The host has not confirmed this phone yet. Check the host and try again.')
}

function reduceEvent(state: AppState, event: EventPayload): Partial<AppState> {
  const data = isRecord(event.data) ? event.data : {}
  if (event.event === 'session.created' || event.event === 'session.updated') {
    const session = sessionFromEvent(data)
    return session === undefined ? {} : { sessions: upsertSession(state.sessions, session) }
  }
  const sessionId = typeof data.sessionId === 'string' ? data.sessionId : state.selectedSession?.id
  if (sessionId === undefined) return {}
  return { messages: { ...state.messages, [sessionId]: applyRemoteEvent(state.messages[sessionId] ?? [], event) } }
}

function sessionFromEvent(data: Record<string, unknown>): RemoteSession | undefined {
  if (typeof data.id !== 'string' || typeof data.title !== 'string') return undefined
  return {
    id: data.id,
    title: data.title,
    cwd: typeof data.cwd === 'string' ? data.cwd : undefined,
    running: data.running === true,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
  }
}

function upsertSession(sessions: RemoteSession[], session: RemoteSession): RemoteSession[] {
  return [session, ...sessions.filter(item => item.id !== session.id)]
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
}

function mergeDevices(current: RemoteDevice[], next: RemoteDevice[]): RemoteDevice[] {
  const byId = new Map(current.map(device => [device.deviceId, device]))
  for (const device of next) byId.set(device.deviceId, device)
  return [...byId.values()]
}

function mapPermissionDecision(
  messages: Record<string, ChatItem[]>,
  requestId: string,
  decision: PermissionDecision,
): Record<string, ChatItem[]> {
  return Object.fromEntries(Object.entries(messages).map(([sessionId, items]) => [
    sessionId,
    items.map(item => item.kind === 'permission' && item.request.requestId === requestId ? { ...item, decision } : item),
  ]))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isChatItem(value: unknown): value is ChatItem {
  return isRecord(value) && typeof value.id === 'string' && typeof value.sessionId === 'string'
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function initialData(): Pick<AppState,
  'config' | 'devices' | 'selectedDevice' | 'connection' | 'systemInfo' | 'workspace' | 'sessions' |
  'selectedSession' | 'messages' | 'pairingPhase' | 'pairingMessage' | 'refreshing' | 'busyAction' | 'error'> {
  return {
    config: undefined,
    devices: [],
    selectedDevice: undefined,
    connection: disconnected,
    systemInfo: undefined,
    workspace: undefined,
    sessions: [],
    selectedSession: undefined,
    messages: {},
    pairingPhase: 'idle',
    pairingMessage: undefined,
    refreshing: false,
    busyAction: undefined,
    error: undefined,
  }
}
