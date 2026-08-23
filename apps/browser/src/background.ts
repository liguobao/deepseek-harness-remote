/**
 * DS Harness Remote browser launcher service worker.
 *
 * The extension reads the current Web authorization only for the exchange call,
 * replaces it with an isolated Browser device credential, and
 * then owns Host discovery only. Remote workspaces, sessions and transport live
 * in Remote Web. Opening a Host reuses the Web session already held by the browser.
 */
import { generateKeyPair } from '@dsh-remote/crypto'
import { emptyState, isRecord, type AppState } from './common.js'
import { ServerApi } from './server-api.js'
import type { Credentials, DeviceIdentity } from './types.js'

const IDENTITY_KEY = 'dshRemote.identity.v1'
const CREDENTIALS_KEY = 'dshRemote.credentials.v1'
const SETTINGS_KEY = 'dshRemote.settings.v1'
const DEFAULT_SERVER_URL = 'https://dsh.r2049.cn'

interface Settings { serverUrl: string }

async function storageGet<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key)
  return result[key] as T | undefined
}

async function storageSet(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

class Background {
  private state: AppState = { ...emptyState }
  private identity?: DeviceIdentity
  private credentials?: Credentials
  private settingsValue: Settings = { serverUrl: DEFAULT_SERVER_URL }
  private authorizationTask?: Promise<void>
  private refreshTask?: Promise<Credentials | undefined>
  private authEpoch = 0

  async start(): Promise<void> {
    const settings = await storageGet<Settings>(SETTINGS_KEY)
    this.settingsValue = { serverUrl: settings?.serverUrl?.trim() || DEFAULT_SERVER_URL }
    this.identity = await this.loadIdentity()
    this.credentials = await this.loadCredentials()
    this.state = {
      ...emptyState,
      settings: this.settingsValue,
      authorized: this.credentials !== undefined,
      ...(this.credentials === undefined ? {} : { account: this.credentials.account }),
    }
    if (this.credentials !== undefined) await this.refresh().catch(() => undefined)
    this.broadcast()
  }

  snapshot(): AppState { return this.state }

  private broadcast(): void {
    this.state = { ...this.state }
    void chrome.runtime.sendMessage({ type: 'state', state: this.state }).catch(() => undefined)
  }

  async command(action: string, payload: Record<string, unknown>): Promise<void> {
    switch (action) {
      case 'authorizeFromWeb':
        await this.authorizeFromWeb(String(payload.serverUrl ?? ''))
        return
      case 'signOut':
        await this.signOut()
        return
      case 'refresh':
        await this.refresh()
        return
      case 'openHost':
        await this.openHost(String(payload.deviceId ?? ''))
        return
      default:
        throw new Error('This launcher action is not supported.')
    }
  }

  private async authorizeFromWeb(serverUrl: string): Promise<void> {
    if (this.authorizationTask !== undefined) return this.authorizationTask
    const task = this.runWebAuthorization(serverUrl)
    this.authorizationTask = task
    this.state.authorizationBusy = true
    this.state.authorizationError = undefined
    this.broadcast()
    try {
      await task
    } catch (error) {
      this.state.authorizationError = errorMessage(error)
      throw error
    } finally {
      if (this.authorizationTask === task) this.authorizationTask = undefined
      this.state.authorizationBusy = false
      this.broadcast()
    }
  }

  private async runWebAuthorization(serverUrl: string): Promise<void> {
    const authEpoch = ++this.authEpoch
    const api = new ServerApi(serverUrl)
    const identity = this.identity ?? await this.loadIdentity()
    this.identity = identity
    const webToken = await readWebAccountToken(api.baseUrl)
    const credentials = await new ServerApi(api.baseUrl, webToken).exchangeBrowserAuthorization(identity)
    if (authEpoch !== this.authEpoch) {
      await new ServerApi(credentials.serverUrl, credentials.accessToken).removeSelf().catch(() => undefined)
      return
    }
    this.credentials = credentials
    this.settingsValue = { serverUrl: api.baseUrl }
    this.state = {
      ...this.state,
      settings: this.settingsValue,
      authorized: true,
      account: credentials.account,
      authorizationError: undefined,
      notice: undefined,
    }
    await Promise.all([
      storageSet(CREDENTIALS_KEY, JSON.stringify(credentials)),
      storageSet(SETTINGS_KEY, this.settingsValue),
    ])
    if (authEpoch !== this.authEpoch) return
    await this.refresh().catch(() => undefined)
  }

  private async signOut(): Promise<void> {
    const credentials = this.credentials
    const authorizationTask = this.authorizationTask
    const refreshTask = this.refreshTask
    this.authEpoch += 1
    this.credentials = undefined
    await authorizationTask?.catch(() => undefined)
    const refreshed = await refreshTask?.catch(() => undefined)
    if (refreshed !== undefined) {
      await new ServerApi(refreshed.serverUrl, refreshed.accessToken).removeSelf().catch(() => undefined)
    } else if (credentials !== undefined) {
      await this.revokeDevice(credentials).catch(() => undefined)
    }
    this.identity = undefined
    this.state = { ...emptyState, settings: this.settingsValue }
    await chrome.storage.local.remove([CREDENTIALS_KEY, IDENTITY_KEY])
    this.broadcast()
  }

  private async refresh(): Promise<void> {
    if (this.refreshTask !== undefined) {
      await this.refreshTask
      return
    }
    this.state.refreshing = true
    this.state.notice = undefined
    this.broadcast()
    const task = this.runRefresh()
    this.refreshTask = task
    try {
      await task
    } catch (error) {
      this.state.notice = `${errorMessage(error)} Try again.`
      throw error
    } finally {
      if (this.refreshTask === task) this.refreshTask = undefined
      this.state.refreshing = false
      this.broadcast()
    }
  }

  private async runRefresh(): Promise<Credentials | undefined> {
    const authEpoch = this.authEpoch
    let credentials = this.credentials
    if (credentials === undefined) return undefined
    let refreshed: Credentials | undefined
    if (credentials.accessTokenExpiresAt <= Date.now() + 30_000) {
      credentials = await new ServerApi(credentials.serverUrl).refresh(credentials.deviceId, credentials.refreshToken, credentials.account)
      refreshed = credentials
      if (authEpoch !== this.authEpoch) return refreshed
      this.credentials = credentials
      await storageSet(CREDENTIALS_KEY, JSON.stringify(credentials))
      if (authEpoch !== this.authEpoch) return refreshed
    }
    const hosts = await new ServerApi(credentials.serverUrl, credentials.accessToken).hosts()
    if (authEpoch !== this.authEpoch) return refreshed
    this.state.hosts = hosts
    return refreshed
  }

  private async openHost(deviceId: string): Promise<void> {
    if (deviceId.length === 0 || this.credentials === undefined) throw new Error('Authorize this launcher first.')
    this.state.openingHostId = deviceId
    this.state.notice = undefined
    this.broadcast()
    try {
      await this.refresh()
      const host = this.state.hosts.find(item => item.deviceId === deviceId)
      if (host === undefined) throw new Error('This Host is no longer available.')
      if (!host.online) throw new Error(`${host.name} is offline.`)
      const credentials = this.credentials
      if (credentials === undefined) throw new Error('Authorize this launcher first.')
      const launchUrl = new URL(`/app/remote/${encodeURIComponent(host.deviceId)}`, credentials.serverUrl).toString()
      await chrome.tabs.create({ url: launchUrl })
    } catch (error) {
      this.state.notice = `${errorMessage(error)} Try again.`
      throw error
    } finally {
      this.state.openingHostId = undefined
      this.broadcast()
    }
  }

  private async loadIdentity(): Promise<DeviceIdentity> {
    const stored = await storageGet<string>(IDENTITY_KEY)
    if (stored !== undefined) {
      try {
        const parsed = JSON.parse(stored) as DeviceIdentity
        if (parsed.platform === 'browser' && typeof parsed.deviceId === 'string' && typeof parsed.publicKey === 'string') return parsed
      } catch {
        // Replace malformed local state with a fresh launcher identity.
      }
    }
    const { publicKey } = generateKeyPair()
    const identity: DeviceIdentity = {
      deviceId: crypto.randomUUID(),
      name: `Browser on ${navigator.platform || 'unknown'}`,
      platform: 'browser',
      publicKey,
    }
    await storageSet(IDENTITY_KEY, JSON.stringify(identity))
    return identity
  }

  private async loadCredentials(): Promise<Credentials | undefined> {
    const stored = await storageGet<string>(CREDENTIALS_KEY)
    if (stored === undefined) return undefined
    try {
      const parsed = JSON.parse(stored) as Credentials
      return typeof parsed.serverUrl === 'string'
        && typeof parsed.deviceId === 'string'
        && typeof parsed.account === 'string'
        && typeof parsed.accessToken === 'string'
        && typeof parsed.refreshToken === 'string'
        ? parsed
        : undefined
    } catch {
      return undefined
    }
  }

  private async revokeDevice(credentials: Credentials): Promise<void> {
    let accessToken = credentials.accessToken
    if (credentials.accessTokenExpiresAt <= Date.now() + 30_000) {
      const refreshed = await new ServerApi(credentials.serverUrl).refresh(credentials.deviceId, credentials.refreshToken, credentials.account)
      accessToken = refreshed.accessToken
    }
    await new ServerApi(credentials.serverUrl, accessToken).removeSelf()
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message : 'Something went wrong.'
}

async function readWebAccountToken(serverUrl: string): Promise<string> {
  const origin = new URL(serverUrl).origin
  const tabs = await chrome.tabs.query({})
  const tab = tabs.find(candidate => {
    if (candidate.id === undefined || candidate.url === undefined) return false
    try { return new URL(candidate.url).origin === origin } catch { return false }
  })
  if (tab?.id === undefined) {
    await chrome.tabs.create({ url: new URL('/app/remote', origin).toString() })
    throw new Error('Sign in to Remote Web, then authorize again.')
  }
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: 'MAIN',
    func: (key: string) => window.localStorage.getItem(key),
    args: ['dsh.remote.accountToken'],
  })
  const token = results[0]?.result
  if (typeof token !== 'string' || token.length === 0) {
    await chrome.tabs.update(tab.id, { active: true })
    throw new Error('Sign in to Remote Web, then authorize again.')
  }
  return token
}

const background = new Background()
void background.start()

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isRecord(message) || message.type !== 'command' || typeof message.action !== 'string') return false
  void background.command(message.action, isRecord(message.payload) ? message.payload : {})
    .then(() => sendResponse({ ok: true }))
    .catch(error => sendResponse({ ok: false, error: errorMessage(error) }))
  return true
})

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isRecord(message) || message.type !== 'getState') return false
  sendResponse({ state: background.snapshot() })
  return false
})
