import { createIcons, ExternalLink, Laptop, LogOut, RefreshCw, Server, WifiOff } from 'lucide'
import { emptyState, relativeTime, type AppState } from './common.js'

const lucideIcons = { ExternalLink, Laptop, LogOut, RefreshCw, Server, WifiOff }
const lucideNames: Record<keyof typeof lucideIcons, string> = {
  ExternalLink: 'external-link',
  Laptop: 'laptop',
  LogOut: 'log-out',
  RefreshCw: 'refresh-cw',
  Server: 'server',
  WifiOff: 'wifi-off',
}

function icon(name: keyof typeof lucideIcons, size = 16): string {
  return `<i data-lucide="${lucideNames[name]}" aria-hidden="true" style="width:${size}px;height:${size}px"></i>`
}

async function sendCommand(action: string, payload: Record<string, unknown> = {}): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'command', action, payload }) as { ok?: unknown; error?: unknown } | undefined
  if (response?.ok !== true) throw new Error(typeof response?.error === 'string' ? response.error : 'The launcher did not respond. Try again.')
}

export class Ui {
  private state: AppState = { ...emptyState }
  private localError?: string

  async start(): Promise<void> {
    chrome.runtime.onMessage.addListener((message: unknown) => {
      if (typeof message !== 'object' || message === null || (message as { type?: string }).type !== 'state') return
      this.state = (message as { state: AppState }).state
      this.render()
    })
    const response = await chrome.runtime.sendMessage({ type: 'getState' }).catch(() => undefined)
    if (response !== undefined && typeof response === 'object' && 'state' in response) this.state = (response as { state: AppState }).state
    this.render()
    if (this.state.authorized) void sendCommand('refresh').catch(error => this.showError(error))
    window.setInterval(() => {
      if (this.state.authorized && this.state.openingHostId === undefined) void sendCommand('refresh').catch(() => undefined)
    }, 15_000)
  }

  private render(): void {
    const root = document.getElementById('root')
    if (root === null) return
    root.innerHTML = this.state.authorized ? this.renderLauncher() : this.renderAuthorization()
    this.wire()
    createIcons({ icons: lucideIcons })
  }

  private renderLauncher(): string {
    const copy = launcherCopy()
    const onlineHosts = this.state.hosts.filter(host => host.online)
    const hosts = [...this.state.hosts].sort((left, right) => Number(right.online) - Number(left.online))
    const rows = hosts.map(host => {
      const opening = this.state.openingHostId === host.deviceId
      const detail = [platformLabel(host.platform), host.harnessVersion ? `Harness ${host.harnessVersion}` : undefined]
        .filter((value): value is string => value !== undefined)
        .join(' · ')
      const action = host.online
        ? opening
          ? `${icon('RefreshCw', 15)}${escapeHtml(copy.opening)}`
          : ''
        : host.lastSeenAt === undefined
          ? ''
          : escapeHtml(copy.lastSeen(relativeTime(host.lastSeenAt)))
      const label = host.online ? `${opening ? copy.opening : copy.open} ${host.name}` : undefined
      return `<button class="hostRow${host.online ? '' : ' hostRowOffline'}${opening ? ' hostRowOpening' : ''}" type="button" data-host-id="${escapeHtml(host.deviceId)}"${label === undefined ? '' : ` aria-label="${escapeHtml(label)}"`} ${opening || !host.online ? 'disabled' : ''}>
        <span class="hostIcon">${icon('Laptop', 21)}</span>
        <span class="hostCopy"><strong>${escapeHtml(host.name)}</strong><span>${escapeHtml(detail || copy.ready)}</span></span>
        <span class="hostStatus"><span class="statusDot"></span>${escapeHtml(host.online ? copy.online : copy.offline)}</span>
        ${action ? `<span class="hostAction">${action}</span>` : ''}
      </button>`
    }).join('')
    const empty = `<div class="emptyState">${icon('WifiOff', 25)}<strong>${escapeHtml(copy.noMachines)}</strong><p>${escapeHtml(copy.noMachinesHint)}</p></div>`
    const notice = this.state.notice ?? this.localError
    return `<main class="launcher">
      ${this.renderHeader(true)}
      <section class="hostSection" aria-labelledby="online-title">
        <div class="sectionHeading"><div><h1 id="online-title">${escapeHtml(copy.myMachines)}</h1><p>${escapeHtml(copy.machineHint)}</p></div><span class="count">${escapeHtml(copy.onlineCount(onlineHosts.length, hosts.length))}</span></div>
        ${notice === undefined ? '' : `<div class="error" role="alert">${escapeHtml(notice)}</div>`}
        <div class="hostList">${rows || empty}</div>
      </section>
      <footer class="launcherMeta"><span>${icon('Server', 13)}${escapeHtml(serverHost(this.state.settings?.serverUrl))}</span></footer>
    </main>`
  }

  private renderAuthorization(): string {
    const copy = authorizationCopy()
    const error = this.state.authorizationError ?? this.localError
    return `<main class="authorizationRoot">
      ${this.renderHeader(false)}
      <section class="authorizationContent" aria-labelledby="authorization-title">
        <div class="authorizationIntro"><h1 id="authorization-title">${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.overview)}</p></div>
        <button class="primary" id="authorizeWeb" type="button" ${this.state.authorizationBusy ? 'disabled' : ''}>${escapeHtml(this.state.authorizationBusy ? copy.authorizing : copy.authorize)}${icon('ExternalLink', 16)}</button>
        ${error === undefined ? '' : `<div class="error" role="alert">${escapeHtml(error)}</div>`}
        <p class="authorizationNote">${escapeHtml(copy.note)}</p>
      </section>
    </main>`
  }

  private renderHeader(actions: boolean): string {
    const copy = launcherCopy()
    return `<header class="topbar">
      <div class="brand"><img src="media/icon.png" width="30" height="30" alt=""><span><strong>DeepSeek Harness Remote</strong>${this.state.account === undefined ? '' : `<small>${escapeHtml(this.state.account)}</small>`}</span></div>
      ${actions ? `<div class="topActions"><button class="iconButton" id="refresh" type="button" aria-label="${escapeHtml(copy.refresh)}" title="${escapeHtml(copy.refresh)}" ${this.state.refreshing ? 'disabled' : ''}>${icon('RefreshCw', 17)}</button><button class="signOutButton" id="signOut" type="button">${icon('LogOut', 15)}${escapeHtml(copy.signOut)}</button></div>` : ''}
    </header>`
  }

  private wire(): void {
    if (!this.state.authorized) {
      document.getElementById('authorizeWeb')?.addEventListener('click', () => {
        this.localError = undefined
        void sendCommand('authorizeFromWeb').catch(error => this.showError(error))
      })
      return
    }
    document.getElementById('refresh')?.addEventListener('click', () => {
      this.localError = undefined
      void sendCommand('refresh').catch(error => this.showError(error))
    })
    document.getElementById('signOut')?.addEventListener('click', () => {
      if (!window.confirm(launcherCopy().signOutConfirm)) return
      void sendCommand('signOut').catch(error => this.showError(error))
    })
    document.querySelectorAll<HTMLElement>('[data-host-id]').forEach(row => row.addEventListener('click', () => {
      const deviceId = row.dataset.hostId
      if (deviceId === undefined) return
      this.localError = undefined
      void sendCommand('openHost', { deviceId }).then(() => window.close()).catch(error => this.showError(error))
    }))
  }

  private showError(error: unknown): void {
    this.localError = error instanceof Error && error.message ? error.message : 'Something went wrong. Try again.'
    this.render()
  }
}

function serverHost(value: string | undefined): string {
  if (value === undefined) return ''
  try { return new URL(value).host } catch { return value }
}

function platformLabel(value: string): string {
  if (value === 'darwin') return 'macOS'
  if (value === 'win32') return 'Windows'
  if (value === 'linux') return 'Linux'
  return value || 'Computer'
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function launcherCopy() {
  if (navigator.language.toLowerCase().startsWith('zh')) return {
    myMachines: '我的设备', machineHint: '查看所有机器，选择在线机器继续工作', onlineCount: (online: number, total: number) => `${online}/${total} 台在线`, online: '在线', offline: '离线', open: '进入', ready: '可以进入', opening: '正在打开', refresh: '刷新', signOut: '退出',
    signOutConfirm: '退出插件并清理插件自己的授权？这不会退出 Remote Web。', noMachines: '暂无机器', noMachinesHint: '在远端电脑启动 DeepSeek Harness，并确认 Remote Host 已启用。',
    lastSeen: (time: string) => `最近在线 ${time.replace(' ago', '前')}`,
  }
  return {
    myMachines: 'My devices', machineHint: 'See every machine and choose one that is online', onlineCount: (online: number, total: number) => `${online}/${total} online`, online: 'Online', offline: 'Offline', open: 'Open', ready: 'Ready to open', opening: 'Opening', refresh: 'Refresh', signOut: 'Sign out',
    signOutConfirm: 'Sign out of the extension and remove only its authorization? Remote Web stays signed in.', noMachines: 'No machines yet', noMachinesHint: 'Start DeepSeek Harness on the remote computer and make sure Remote Host is enabled.',
    lastSeen: (time: string) => `Last seen ${time}`,
  }
}

function authorizationCopy() {
  if (navigator.language.toLowerCase().startsWith('zh')) return {
    title: '一次连接，随时可用。', overview: '登录 Remote Web，查看设备并继续工作。', authorize: '使用 Web 登录', authorizing: '正在连接…',
    note: '尚未登录时，会先打开 Remote Web；登录后回到插件继续。',
  }
  return {
    title: 'Connect once. Ready whenever you are.', overview: 'Sign in to Remote Web to see your devices and continue working.', authorize: 'Use Web sign-in', authorizing: 'Connecting…',
    note: 'If needed, sign in to Remote Web first, then return here to continue.',
  }
}
