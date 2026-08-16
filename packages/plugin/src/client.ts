interface Window {
  __ModuleLoader__: {
    load(input: { id: string; factory: (require: (id: string) => unknown) => unknown }): void
  }
}

declare const DSH_REMOTE_CLIENT_MODULE_ID: string | undefined

const clientModuleId = typeof DSH_REMOTE_CLIENT_MODULE_ID === 'string'
  ? DSH_REMOTE_CLIENT_MODULE_ID
  : '@dsh-remote/plugin'

interface ControlResult<T = unknown> {
  ok: boolean
  value?: T
  error?: { message?: string }
}

interface RemoteStatus {
  mode: 'local' | 'remote'
  target?: { deviceId: string; name: string }
  available: boolean
  connected?: boolean
  transport?: 'LAN' | 'P2P' | 'TURN' | 'Relay' | 'Disconnected'
  hostAuthorizationAvailable: boolean
  host?: {
    configured: boolean
    online: boolean
    reconnecting: boolean
    lastActiveAt?: number
    error?: string
    account?: string
    accountRequired: boolean
  }
}

interface RemoteDevice {
  deviceId: string
  name: string
  platform: string
  online: boolean
}

interface RemoteDirectoryEntry {
  name: string
  path: string
  hidden: boolean
}

interface RemoteDirectoryListing {
  path: string
  home: string
  crumbs: RemoteDirectoryEntry[]
  entries: RemoteDirectoryEntry[]
  truncated: boolean
}

interface RemoteWorkspaceView {
  workspaceId: string
  path: string
  title: string
}

interface PluginSettings {
  enabled?: boolean
  role?: 'host' | 'client' | 'both'
  serverUrl?: string
  forceRelay?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  reconnect?: boolean | {
    enabled?: boolean
    initialDelayMs?: number
    maxDelayMs?: number
    jitter?: number
  }
}

interface PluginSettingsView {
  config: PluginSettings
  deviceName: string
  writable: boolean
  applies: 'restart'
  association?: PluginAssociation
  associations?: Partial<Record<'host' | 'client', PluginAssociation>>
}

interface PluginAssociation {
  method: 'account' | 'host_registration_code' | 'owned_device'
  account?: string
}

interface PluginConfigureResult {
  status: 'authorized'
  role: 'host' | 'client'
  account?: string
  settings: PluginSettingsView
}

const localeNamespace = 'dsh-remote'

const en = {
  pluginTitle: 'DeepSeek Remote',
  pluginDescription: 'Connect once. Available anytime.',
  expandSettings: 'Show settings: {name}',
  collapseSettings: 'Hide settings: {name}',
  unsaved: 'Unsaved',
  associated: 'Authorized',
  authorizationComplete: 'Authorization complete',
  loadingSettings: 'Loading DeepSeek Remote settings…',
  mode: 'Mode',
  pluginMode: 'Plugin mode',
  host: 'Host',
  client: 'Client',
  authorization: 'Authorization',
  account: 'Account',
  hostRegistrationCode: 'One-time device authorization code',
  ownedDeviceAuthorization: 'Owned device',
  authorizedOn: '{role} is authorized on {serverUrl}.',
  readOnly: 'This DSH profile does not provide writable user settings.',
  discard: 'Discard',
  save: 'Save',
  saving: 'Saving…',
  signOut: 'Sign out',
  signingOut: 'Signing out…',
  serverUrl: 'Server URL',
  serverUrlHint: 'HTTPS origin used for account authorization and encrypted relay.',
  authorizationMethod: 'Authorization method',
  accountPassword: 'Account password',
  registrationCode: 'Device authorization code',
  registrationCodeHint: 'Generate it after signing in on the Server website. Use it once to connect this device.',
  accountHint: 'The account must belong to the selected Server.',
  password: 'Password',
  passwordHint: 'Used only for this HTTPS authorization request and never saved.',
  modeSavedNeedsAuthorization: 'Mode saved. Authorize {role} before connecting. Existing registrations were kept.',
  modeSavedReused: 'Mode saved. Existing registration reused. Restart Harness to apply.',
  modeSavedOwnedRole: 'Mode saved. This owned device was authorized automatically. Restart Harness to apply.',
  enterRegistrationCode: 'Enter the device authorization code.',
  enterAccountPassword: 'Enter the Server account and password.',
  associationSaved: 'Associated. Restart Harness to apply.',
  signedOut: 'Signed out. Restart Harness to disconnect this mode.',
  remoteRequestFailed: 'Remote mode request failed.',
  switchTarget: 'Switch Local / Remote Harness target',
  harnessTarget: 'Harness target',
  close: 'Close',
  local: 'Local',
  remoteTarget: 'Remote · {name}',
  thisMachineLocal: 'This machine (Local)',
  noRemoteHosts: 'No authorized remote Host for this account.',
  online: 'Online',
  offline: 'Offline',
  thisMachineHost: 'This machine as Remote Host',
  connected: 'Connected',
  connectedAs: 'Connected as {account}',
  connection: 'Connection',
  checkingConnection: 'Checking connection…',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  lastActive: 'Last active: {time}',
  neverConnected: 'No successful connection yet.',
  reconnect: 'Reconnect',
  reconnectingAction: 'Reconnecting…',
  reconnectStarted: 'Reconnect requested.',
  connectionAuthorizationExpired: 'Authorization expired. Sign out and authorize this Host again.',
  connectionDeviceRevoked: 'This Host was revoked on the Server. Sign out and authorize it again.',
  connectionOwnershipRequired: 'The Server no longer recognizes this Host as an owned device.',
  connectionRateLimited: 'The Server is receiving too many requests. Automatic retry will continue.',
  connectionVersionMismatch: 'The Plugin and Server protocol versions are incompatible.',
  connectionInvalidResponse: 'The Server returned an invalid control message.',
  connectionReachability: 'Cannot reach the Server. Check the network and Server address.',
  connectionUnexpected: 'The connection stopped unexpectedly. Automatic retry will continue.',
  hostSignInHint: 'Sign in to authorize this Host on the selected Server.',
  checkingHost: 'Checking Host registration…',
  hostUnavailable: 'Host unavailable: {error}',
  serverAccountEmail: 'Server account email',
  serverAccountPassword: 'Server account password',
  signInRegisterHost: 'Sign in and register Host',
  signingIn: 'Signing in…',
  useRegistrationCode: 'Use connection code',
  registering: 'Registering…',
  remoteEntry: 'Remote',
  remoteTitle: 'Open a remote workspace',
  remoteDescription: 'Choose one of your Hosts, then select a working directory. The Harness interface stays on this device.',
  chooseHost: 'Host',
  chooseDirectory: 'Working directory',
  selectHostHint: 'Select an online Host to browse its directories.',
  emptyDirectory: 'This directory has no visible subdirectories.',
  openWorkspace: 'Open workspace',
  openingWorkspace: 'Opening…',
  loadingDirectory: 'Loading directories…',
  backToHosts: 'Choose another Host',
  currentDirectory: 'Selected directory',
  directoryTruncated: 'Only part of this directory could be shown.',
  existingWorkspaces: 'Existing workspaces',
  remotePathPlaceholder: '/home/user/project',
  remotePathHint: 'Enter an absolute directory path on the selected Host.',
  noRemoteWorkspaces: 'No remote workspaces yet. Use + to add one.',
  activeRemote: '{name}',
  exitRemote: 'Exit',
  addRemoteWorkspace: 'Add remote workspace',
  remoteModeLabel: 'Remote mode · {name}',
  remoteNetworkP2p: 'P2P',
  remoteNetworkTurn: 'TURN',
  remoteNetworkRelay: 'Relay',
  remoteNetworkLan: 'LAN',
  remoteNetworkOffline: 'Disconnected',
  remoteLinkEncrypted: 'End-to-end encrypted',
  connectionRouteTitle: 'Connection route',
  connectionRouteFrom: 'From',
  connectionRouteVia: 'Via',
  connectionRouteTo: 'To',
  connectionRouteCurrentDevice: 'This device',
  connectionRouteLan: 'Local network',
  connectionRouteP2p: 'Direct internet path',
  connectionRouteTurn: 'TURN relay service',
  connectionRouteRelay: 'Remote Server',
  connectionRouteHost: 'Work computer running Harness',
  connectionRouteEncrypted: 'Application data remains end-to-end encrypted along this route.',
  openLocalWorkspaces: 'Open local workspaces',
  clientSignInHint: 'Sign in to this Server to list your remote Hosts.',
  signInClient: 'Sign in to Remote',
} as const

const zh: Record<keyof typeof en, string> = {
  pluginTitle: 'DeepSeek 远程连接',
  pluginDescription: '一次连接，随时可用。',
  expandSettings: '展开设置：{name}',
  collapseSettings: '收起设置：{name}',
  unsaved: '未保存',
  associated: '已授权',
  authorizationComplete: '已完成授权',
  loadingSettings: '正在加载 DeepSeek 远程连接设置…',
  mode: '模式',
  pluginMode: '插件模式',
  host: '主机',
  client: 'Client',
  authorization: '授权',
  account: '账号',
  hostRegistrationCode: '一次性设备授权码',
  ownedDeviceAuthorization: '自有设备',
  authorizedOn: '{role}已经在 {serverUrl} 完成授权。',
  readOnly: '此 DSH profile 不提供可写的用户设置。',
  discard: '放弃修改',
  save: '保存',
  saving: '保存中…',
  signOut: '退出授权',
  signingOut: '正在退出…',
  serverUrl: 'Server 地址',
  serverUrlHint: '用于账号授权和加密中继的 HTTPS 地址。',
  authorizationMethod: '授权方式',
  accountPassword: '账号密码',
  registrationCode: '设备授权码',
  registrationCodeHint: '登录 Server 网页后生成，用一次即可连接这台设备。',
  accountHint: '账号必须属于所选 Server。',
  password: '密码',
  passwordHint: '仅用于本次 HTTPS 授权请求，不会保存。',
  modeSavedNeedsAuthorization: '模式已保存。连接前请先授权 {role}；已有注册信息已保留。',
  modeSavedReused: '模式已保存并复用已有注册信息。重启 Harness 后生效。',
  modeSavedOwnedRole: '模式已保存，并已自动授权此自有设备。重启 Harness 后生效。',
  enterRegistrationCode: '请输入设备授权码。',
  enterAccountPassword: '请输入 Server 账号和密码。',
  associationSaved: '关联成功。重启 Harness 后生效。',
  signedOut: '已退出授权。重启 Harness 后将断开此模式。',
  remoteRequestFailed: '远程模式请求失败。',
  switchTarget: '切换本地或远程 Harness',
  harnessTarget: 'Harness 目标',
  close: '关闭',
  local: '本地',
  remoteTarget: '远程 · {name}',
  thisMachineLocal: '此设备（本地）',
  noRemoteHosts: '此账号没有已授权的远程 Host。',
  online: '在线',
  offline: '离线',
  thisMachineHost: '将此设备作为远程 Host',
  connected: '已连接',
  connectedAs: '已使用 {account} 连接',
  connection: '连接状态',
  checkingConnection: '正在检查连接…',
  connecting: '正在连接',
  reconnecting: '正在重连',
  lastActive: '最后活跃：{time}',
  neverConnected: '尚未成功连接过。',
  reconnect: '手动重连',
  reconnectingAction: '正在重连…',
  reconnectStarted: '已发起重连。',
  connectionAuthorizationExpired: '授权已失效，请退出授权后重新连接此 Host。',
  connectionDeviceRevoked: '此 Host 已在 Server 上被撤销，请退出授权后重新连接。',
  connectionOwnershipRequired: 'Server 已不再将此 Host 识别为当前账号的设备。',
  connectionRateLimited: 'Server 请求过多，插件将继续自动重试。',
  connectionVersionMismatch: 'Plugin 与 Server 的协议版本不兼容。',
  connectionInvalidResponse: 'Server 返回了无效的控制消息。',
  connectionReachability: '无法连接 Server，请检查网络和 Server 地址。',
  connectionUnexpected: '连接意外中断，插件将继续自动重试。',
  hostSignInHint: '登录后在所选 Server 上授权此 Host。',
  checkingHost: '正在检查 Host 注册状态…',
  hostUnavailable: 'Host 不可用：{error}',
  serverAccountEmail: 'Server 账号邮箱',
  serverAccountPassword: 'Server 账号密码',
  signInRegisterHost: '登录并注册 Host',
  signingIn: '正在登录…',
  useRegistrationCode: '使用连接码',
  registering: '正在注册…',
  remoteEntry: 'Remote',
  remoteTitle: '打开远端工作区',
  remoteDescription: '选择自己的主机和工作目录。交互界面仍运行在当前设备上。',
  chooseHost: '主机',
  chooseDirectory: '工作目录',
  selectHostHint: '选择一台在线主机以浏览其目录。',
  emptyDirectory: '这个目录下没有可见的子目录。',
  openWorkspace: '打开工作区',
  openingWorkspace: '正在打开…',
  loadingDirectory: '正在加载目录…',
  backToHosts: '选择其他主机',
  currentDirectory: '已选目录',
  directoryTruncated: '目录内容较多，目前只显示了一部分。',
  existingWorkspaces: '已有工作区',
  remotePathPlaceholder: '/home/user/project',
  remotePathHint: '输入所选主机上的绝对目录路径。',
  noRemoteWorkspaces: '这台主机还没有工作区，点击 + 添加。',
  activeRemote: '{name}',
  exitRemote: '退出',
  addRemoteWorkspace: '添加远程工作区',
  remoteModeLabel: '远程模式 · {name}',
  remoteNetworkP2p: 'P2P',
  remoteNetworkTurn: 'TURN',
  remoteNetworkRelay: '中继',
  remoteNetworkLan: '局域网',
  remoteNetworkOffline: '已断开',
  remoteLinkEncrypted: '端到端加密',
  connectionRouteTitle: '连接线路',
  connectionRouteFrom: '起点',
  connectionRouteVia: '经过',
  connectionRouteTo: '终点',
  connectionRouteCurrentDevice: '当前设备',
  connectionRouteLan: '同一局域网',
  connectionRouteP2p: '互联网直连',
  connectionRouteTurn: 'TURN 中继服务',
  connectionRouteRelay: 'Remote Server',
  connectionRouteHost: '运行 Harness 的工作电脑',
  connectionRouteEncrypted: '线路上的业务数据保持端到端加密。',
  openLocalWorkspaces: '打开本地工作区',
  clientSignInHint: '登录 Server 后即可查看自己的远端主机。',
  signInClient: '登录 Remote',
}

type LocaleKey = keyof typeof en
type Translate = (key: LocaleKey, params?: Record<string, string | number>) => string
interface LocalizedMessage {
  key: LocaleKey
  params?: Record<string, string | number>
}

function formatLocalTime(value: number): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function connectionErrorMessage(code: string, t: Translate): string {
  if (code === 'ACCOUNT_AUTH_REQUIRED' || code === 'AUTH_INVALID' || code === 'TOKEN_EXPIRED') {
    return t('connectionAuthorizationExpired')
  }
  if (code === 'DEVICE_REVOKED') return t('connectionDeviceRevoked')
  if (code === 'DEVICE_OWNERSHIP_REQUIRED') return t('connectionOwnershipRequired')
  if (code === 'RATE_LIMITED') return t('connectionRateLimited')
  if (code === 'UNSUPPORTED_VERSION') return t('connectionVersionMismatch')
  if (code === 'INVALID_MESSAGE') return t('connectionInvalidResponse')
  if (code === 'CONNECTION_FAILED' || code === 'SERVER_NOT_CONFIGURED') return t('connectionReachability')
  return t('connectionUnexpected')
}

function connectionStatusLabel(status: RemoteStatus['host'] | undefined, t: Translate): string {
  if (status === undefined) return t('checkingConnection')
  if (status.online) return t('online')
  if (!status.reconnecting) return t('offline')
  return t(status.lastActiveAt === undefined && status.error === undefined ? 'connecting' : 'reconnecting')
}

function connectionStatusClass(status: RemoteStatus['host'] | undefined): string {
  if (status?.online) return ' isOnline'
  if (status?.reconnecting) return ' isReconnecting'
  return status === undefined ? '' : ' isOffline'
}

window.__ModuleLoader__.load({
  id: clientModuleId,
  factory: require => {
    const module = { exports: {} as Record<string, unknown> }
    const React = require('react') as {
      Fragment: unknown
      createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): unknown
      useEffect(effect: () => void | (() => void), deps: unknown[]): void
      useState<T>(initial: T): [T, (value: T | ((previous: T) => T)) => void]
    }
    const inject = ['connection', 'slots', 'locale']

    function RemotePluginOptions(props: {
      control: <T>(endpoint: string, payload?: unknown) => Promise<T>
      t: Translate
    }): unknown {
      const { t } = props
      const [open, setOpen] = React.useState(false)
      const [serverUrl, setServerUrl] = React.useState('')
      const role = 'host' as const
      const [registrationCode, setRegistrationCode] = React.useState('')
      const [associations, setAssociations] = React.useState<Partial<Record<'host' | 'client', PluginAssociation>>>({})
      const [loaded, setLoaded] = React.useState(false)
      const [writable, setWritable] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [reconnectBusy, setReconnectBusy] = React.useState(false)
      const [hostStatus, setHostStatus] = React.useState<RemoteStatus['host'] | undefined>(undefined)
      const [notice, setNotice] = React.useState<LocalizedMessage | undefined>(undefined)
      const [error, setError] = React.useState<string | undefined>(undefined)
      const [settingsView, setSettingsView] = React.useState<PluginSettingsView | undefined>(undefined)
      const persistedServerUrl = settingsView?.config.serverUrl ?? 'https://dsh.r2049.cn'
      const association = associations.host
      const serverDirty = settingsView !== undefined && serverUrl !== persistedServerUrl
      const authorizationDirty = registrationCode !== ''
      const draftDirty = serverDirty || authorizationDirty

      const applyView = (view: PluginSettingsView): void => {
        setSettingsView(view)
        setServerUrl(view.config.serverUrl ?? 'https://dsh.r2049.cn')
        setAssociations(view.associations ?? (view.association === undefined ? {} : { host: view.association }))
        setWritable(view.writable)
        setLoaded(true)
      }

      const load = async (): Promise<void> => {
        const [view, status] = await Promise.all([
          props.control<PluginSettingsView>('settings.get'),
          props.control<RemoteStatus>('status').catch(() => undefined),
        ])
        applyView(view)
        setHostStatus(status?.host)
      }

      const refreshHostStatus = async (): Promise<void> => {
        setHostStatus((await props.control<RemoteStatus>('status')).host)
      }

      React.useEffect(() => {
        void load().catch(reason => setError(messageOf(reason)))
      }, [])

      React.useEffect(() => {
        if (association === undefined) return
        void refreshHostStatus().catch(() => undefined)
        const timer = window.setInterval(() => {
          void refreshHostStatus().catch(() => undefined)
        }, 30_000)
        return () => window.clearInterval(timer)
      }, [association !== undefined])

      const save = async (event?: Event): Promise<void> => {
        event?.preventDefault()
        if (!writable) return
        setBusy(true)
        setNotice(undefined)
        setError(undefined)
        try {
          if (registrationCode.trim() === '') {
            throw new Error(t('enterRegistrationCode'))
          }
          const result = await props.control<PluginConfigureResult>('settings.configure', {
            serverUrl,
            role,
            registrationCode,
          })
          applyView(result.settings)
          setNotice({ key: 'associationSaved' })
          setRegistrationCode('')
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const logout = async (): Promise<void> => {
        setBusy(true)
        setError(undefined)
        setNotice(undefined)
        try {
          const view = await props.control<PluginSettingsView>('settings.logout')
          applyView(view)
          setRegistrationCode('')
          setNotice({ key: 'signedOut' })
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const reconnectHost = async (): Promise<void> => {
        setReconnectBusy(true)
        setError(undefined)
        setNotice(undefined)
        try {
          const status = await props.control<RemoteStatus>('host.reconnect')
          setHostStatus(status.host)
          setNotice({ key: 'reconnectStarted' })
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setReconnectBusy(false)
        }
      }

      const discard = (): void => {
        if (settingsView !== undefined) applyView(settingsView)
        setRegistrationCode('')
        setNotice(undefined)
        setError(undefined)
      }

      return React.createElement('li', { className: `dshRemotePluginCard${open ? ' isOpen' : ''}` },
        React.createElement('div', { className: 'dshRemotePluginCardHeader' },
          React.createElement('button', {
            type: 'button',
            className: 'dshRemotePluginCardToggle',
            'aria-expanded': open,
            'aria-label': t(open ? 'collapseSettings' : 'expandSettings', { name: t('pluginTitle') }),
            onClick: () => setOpen(current => !current),
          },
          React.createElement('span', { className: 'dshRemotePluginCardHeading' },
            React.createElement('strong', null, t('pluginTitle')),
            React.createElement('span', null, t('pluginDescription'))),
          draftDirty
            ? React.createElement('span', { className: 'dshRemotePluginCardStatus' }, t('unsaved'))
            : association === undefined ? null : React.createElement('span', {
              className: `dshRemotePluginCardStatus${connectionStatusClass(hostStatus)}`,
            }, hostStatus === undefined ? t('associated') : connectionStatusLabel(hostStatus, t)),
          React.createElement('span', { className: 'dshRemotePluginCardChevron', 'aria-hidden': true }, '⌄'))),
        !open ? null : React.createElement('div', { className: 'dshRemotePluginCardBody' },
          !loaded
            ? React.createElement('p', { className: 'dshRemoteSettingsState' }, error ?? t('loadingSettings'))
            : association !== undefined
              ? React.createElement('div', { className: 'dshRemoteSettings' },
        React.createElement('div', { className: 'dshRemoteSettingsTop' },
          React.createElement('div', { className: 'dshRemoteAssociation' },
            React.createElement('span', null, t(association.account === undefined ? role : 'account')),
            React.createElement('strong', null, association.account
              ?? t('authorizationComplete')),
            React.createElement('p', null, association.account === undefined
              ? serverUrl
              : t('authorizedOn', { role: t(role), serverUrl })))),
        React.createElement('div', { className: 'dshRemoteConnection', 'aria-live': 'polite' },
          React.createElement('div', { className: 'dshRemoteConnectionSummary' },
            React.createElement('span', null, t('connection')),
            React.createElement('strong', null,
              React.createElement('span', {
                className: `dshRemoteConnectionDot${connectionStatusClass(hostStatus)}`,
                'aria-hidden': true,
              }),
              connectionStatusLabel(hostStatus, t)),
            React.createElement('p', null, hostStatus === undefined
              ? t('checkingConnection')
              : hostStatus.lastActiveAt === undefined
                ? t('neverConnected')
                : t('lastActive', { time: formatLocalTime(hostStatus.lastActiveAt) }))),
          React.createElement('button', {
            type: 'button',
            className: 'dshRemoteReconnect',
            disabled: reconnectBusy || hostStatus?.configured === false,
            onClick: () => void reconnectHost(),
          }, t(reconnectBusy ? 'reconnectingAction' : 'reconnect'))),
        hostStatus?.error === undefined || hostStatus.online
          ? null
          : React.createElement('p', { className: 'dshRemoteConnectionIssue', role: 'status' }, connectionErrorMessage(hostStatus.error, t)),
        !writable ? React.createElement('p', { className: 'dshRemoteError' }, t('readOnly')) : null,
        React.createElement('div', { className: 'dshRemoteSettingsFooter' },
          error !== undefined
            ? React.createElement('p', { className: 'dshRemoteError', role: 'alert' }, error)
            : notice === undefined ? null : React.createElement('p', { className: 'dshRemoteNotice', role: 'status' }, t(notice.key, notice.params)),
          draftDirty
            ? React.createElement(React.Fragment, null,
              React.createElement('button', { type: 'button', className: 'dshRemoteDiscard', disabled: busy, onClick: discard }, t('discard')),
              React.createElement('button', { type: 'button', className: 'dshRemoteSave', disabled: busy || !writable, onClick: () => void save() }, t(busy ? 'saving' : 'save')))
            : React.createElement('button', {
              type: 'button',
              className: 'dshRemoteDiscard',
              disabled: busy || !writable,
              onClick: () => void logout(),
            }, t(busy ? 'signingOut' : 'signOut'))))
              : React.createElement('form', { className: 'dshRemoteSettings', noValidate: true, onSubmit: (event: Event) => void save(event) },
        React.createElement('div', { className: 'dshRemoteField' },
          React.createElement('label', { htmlFor: 'dsh-remote-server-url' }, t('serverUrl')),
          React.createElement('input', {
            id: 'dsh-remote-server-url',
            type: 'url',
            value: serverUrl,
            disabled: busy || !writable,
            required: true,
            placeholder: 'https://dsh.r2049.cn',
            onChange: (event: Event) => { setServerUrl((event.target as HTMLInputElement).value); setNotice(undefined) },
          }),
          React.createElement('p', null, t('serverUrlHint'))),
        React.createElement('div', { className: 'dshRemoteField' },
          React.createElement('label', { htmlFor: 'dsh-remote-registration-code' }, t('hostRegistrationCode')),
          React.createElement('input', {
            id: 'dsh-remote-registration-code',
            value: registrationCode,
            disabled: busy || !writable,
            required: true,
            autoComplete: 'one-time-code',
            placeholder: 'ABCD-EFGH',
            onChange: (event: Event) => { setRegistrationCode((event.target as HTMLInputElement).value); setNotice(undefined) },
          }),
          React.createElement('p', null, t('registrationCodeHint'))),
        !writable ? React.createElement('p', { className: 'dshRemoteError' }, t('readOnly')) : null,
        React.createElement('div', { className: 'dshRemoteSettingsFooter' },
          error !== undefined
            ? React.createElement('p', { className: 'dshRemoteError', role: 'alert' }, error)
            : notice === undefined ? null : React.createElement('p', { className: 'dshRemoteNotice', role: 'status' }, t(notice.key, notice.params)),
          React.createElement('button', { type: 'button', className: 'dshRemoteDiscard', disabled: busy || !draftDirty, onClick: discard }, t('discard')),
          React.createElement('button', { type: 'submit', className: 'dshRemoteSave', disabled: busy || !writable || !draftDirty }, t(busy ? 'saving' : 'save'))))))
    }

    function RemoteWorkspaceAction(props: {
      wide: boolean
      control: <T>(endpoint: string, payload?: unknown) => Promise<T>
      t: Translate
    }): unknown {
      const { t } = props
      const [open, setOpen] = React.useState(false)
      const [status, setStatus] = React.useState<RemoteStatus | undefined>(undefined)
      const [devices, setDevices] = React.useState<RemoteDevice[]>([])
      const [selectedHost, setSelectedHost] = React.useState<RemoteDevice | undefined>(undefined)
      const [workspaces, setWorkspaces] = React.useState<RemoteWorkspaceView[]>([])
      const [path, setPath] = React.useState('')
      const [addingWorkspace, setAddingWorkspace] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [needsAuthorization, setNeedsAuthorization] = React.useState(false)
      const [email, setEmail] = React.useState('')
      const [password, setPassword] = React.useState('')
      const [notice, setNotice] = React.useState<string | undefined>(undefined)
      const [error, setError] = React.useState<string | undefined>(undefined)

      React.useEffect(() => {
        if (!open) return
        const closeOnEscape = (event: KeyboardEvent): void => {
          if (event.key === 'Escape') setOpen(false)
        }
        window.addEventListener('keydown', closeOnEscape)
        return () => window.removeEventListener('keydown', closeOnEscape)
      }, [open])

      React.useEffect(() => {
        void props.control<RemoteStatus>('status').then(setStatus).catch(() => undefined)
      }, [])

      React.useEffect(() => {
        const remoteActive = status?.mode === 'remote'
        document.documentElement.classList.toggle('dshRemoteTargetActive', remoteActive)
        return () => {
          if (remoteActive) document.documentElement.classList.remove('dshRemoteTargetActive')
        }
      }, [status?.mode])

      const selectHost = async (host: RemoteDevice): Promise<void> => {
        setBusy(true)
        setError(undefined)
        try {
          setWorkspaces(await props.control<RemoteWorkspaceView[]>('workspaces.list', { targetDeviceId: host.deviceId }))
          setSelectedHost(host)
          setPath('')
          setAddingWorkspace(false)
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const show = async (): Promise<void> => {
        setOpen(true)
        setBusy(true)
        setNotice(undefined)
        setError(undefined)
        try {
          const nextStatus = await props.control<RemoteStatus>('status')
          setStatus(nextStatus)
          if (nextStatus.available) {
            try {
              setDevices(await props.control<RemoteDevice[]>('devices'))
              setNeedsAuthorization(false)
            } catch {
              setNeedsAuthorization(true)
            }
          }
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const signInClient = async (): Promise<void> => {
        if (email.trim() === '' || password === '') return
        setBusy(true)
        setError(undefined)
        try {
          await props.control('client.account.login', { email: email.trim(), password })
          setDevices(await props.control<RemoteDevice[]>('devices'))
          setNeedsAuthorization(false)
          setPassword('')
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const openLocalWorkspaces = async (): Promise<void> => {
        setBusy(true)
        setError(undefined)
        try {
          await props.control('mode.set', { mode: 'local' })
          window.location.reload()
        } catch (reason) {
          setError(messageOf(reason))
          setBusy(false)
        }
      }

      const openWorkspace = async (): Promise<void> => {
        if (selectedHost === undefined || path.trim() === '') return
        setBusy(true)
        setError(undefined)
        try {
          await props.control('workspace.open', {
            targetDeviceId: selectedHost.deviceId,
            path: path.trim(),
          })
          window.location.reload()
        } catch (reason) {
          setError(messageOf(reason))
          setBusy(false)
        }
      }

      const remoteLabel = status?.mode === 'remote'
        ? t('activeRemote', { name: status.target?.name ?? t('host') })
        : t('remoteEntry')

      return React.createElement(React.Fragment, null,
        React.createElement('div', { className: `dshRemoteSidebarEntry${status?.mode === 'remote' ? ' isActive' : ''}` },
        React.createElement(status?.mode === 'remote' ? 'div' : 'button', {
          ...(status?.mode === 'remote' ? {} : { type: 'button', onClick: () => void show() }),
          className: 'dshRemoteModeButton',
          title: remoteLabel,
          'aria-label': remoteLabel,
        }, React.createElement('svg', {
          className: 'dshRemoteComputerIcon',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        React.createElement('rect', { x: 3, y: 4, width: 18, height: 13, rx: 2 }),
        React.createElement('path', { d: 'M8 21h8M12 17v4' })), props.wide
          ? React.createElement('span', { className: 'dshRemoteSidebarLabel' }, remoteLabel)
          : null),
        status?.mode === 'remote' && props.wide ? React.createElement('button', {
          type: 'button',
          className: 'dshRemoteExitLink',
          disabled: busy,
          onClick: () => void openLocalWorkspaces(),
        }, t('exitRemote')) : null),
        !open ? null : React.createElement('div', {
          className: 'dshRemoteBackdrop',
          role: 'presentation',
          onMouseDown: (event: MouseEvent) => { if (event.target === event.currentTarget) setOpen(false) },
        }, React.createElement('section', { className: 'dshRemotePage', role: 'dialog', 'aria-modal': true, 'aria-label': t('remoteTitle') },
          React.createElement('header', { className: 'dshRemotePageHeader' },
            React.createElement('div', null,
              React.createElement('strong', null, t('remoteTitle')),
              React.createElement('p', null, t('remoteDescription'))),
            React.createElement('button', { type: 'button', onClick: () => setOpen(false), 'aria-label': t('close') }, '×')),
          React.createElement('main', { className: 'dshRemotePageBody' },
            status?.mode === 'remote' ? React.createElement('button', {
              type: 'button',
              className: 'dshRemoteLocalLink',
              disabled: busy,
              onClick: () => void openLocalWorkspaces(),
            }, t('openLocalWorkspaces')) : null,
            React.createElement(React.Fragment, null,
                needsAuthorization ? React.createElement('section', { className: 'dshRemoteEnable' },
                  React.createElement('strong', null, t('signInClient')),
                  React.createElement('p', null, t('clientSignInHint')),
                  React.createElement('div', { className: 'dshRemoteClientLogin' },
                    React.createElement('input', {
                      type: 'email', value: email, disabled: busy, autoComplete: 'username', placeholder: t('account'),
                      'aria-label': t('account'), onChange: (event: Event) => setEmail((event.target as HTMLInputElement).value),
                    }),
                    React.createElement('input', {
                      type: 'password', value: password, disabled: busy, autoComplete: 'current-password', placeholder: t('password'),
                      'aria-label': t('password'), onChange: (event: Event) => setPassword((event.target as HTMLInputElement).value),
                    }),
                    React.createElement('button', { type: 'button', disabled: busy || email.trim() === '' || password === '', onClick: () => void signInClient() }, t(busy ? 'signingIn' : 'signInClient')))) : null,
                needsAuthorization ? null : React.createElement(React.Fragment, null,
                React.createElement('section', { className: 'dshRemoteHosts', 'aria-label': t('chooseHost') },
                  React.createElement('div', { className: 'dshRemoteSectionHeading' },
                    React.createElement('strong', null, t('chooseHost')),
                    selectedHost === undefined ? null : React.createElement('button', {
                      type: 'button',
                      onClick: () => { setSelectedHost(undefined); setWorkspaces([]); setPath(''); setAddingWorkspace(false); setError(undefined) },
                    }, t('backToHosts'))),
                  selectedHost === undefined
                    ? React.createElement('div', { className: 'dshRemoteHostList' }, devices.length === 0
                      ? React.createElement('p', null, busy ? t('checkingConnection') : t('noRemoteHosts'))
                      : devices.map(device => React.createElement('button', {
                        type: 'button',
                        key: device.deviceId,
                        disabled: busy || !device.online,
                        onClick: () => void selectHost(device),
                      }, React.createElement('span', null, device.name), React.createElement('small', null, `${device.platform} · ${t(device.online ? 'online' : 'offline')}`))))
                    : React.createElement('div', { className: 'dshRemoteSelectedHost' },
                      React.createElement('span', null, selectedHost.name),
                      React.createElement('small', null, `${selectedHost.platform} · ${t('online')}`))),
                selectedHost === undefined ? React.createElement('p', { className: 'dshRemoteHint' }, t('selectHostHint'))
                  : React.createElement('section', { className: 'dshRemoteBrowser', 'aria-label': t('chooseDirectory') },
                    React.createElement('div', { className: 'dshRemoteSectionHeading' },
                      React.createElement('strong', null, t('existingWorkspaces')),
                      React.createElement('button', {
                        type: 'button',
                        className: 'dshRemoteAddWorkspace',
                        title: t('addRemoteWorkspace'),
                        'aria-label': t('addRemoteWorkspace'),
                        'aria-expanded': addingWorkspace,
                        onClick: () => { setAddingWorkspace(current => !current); setPath('') },
                      }, '+')),
                    React.createElement('div', { className: 'dshRemoteDirectoryList' }, workspaces.length === 0
                      ? React.createElement('p', null, t('noRemoteWorkspaces'))
                      : workspaces.map(workspace => React.createElement('button', {
                        type: 'button', key: workspace.workspaceId, disabled: busy,
                        className: !addingWorkspace && path === workspace.path ? 'isSelected' : '',
                        'aria-pressed': !addingWorkspace && path === workspace.path,
                        onClick: () => { setAddingWorkspace(false); setPath(workspace.path) },
                      }, React.createElement('span', { 'aria-hidden': true }, '▱'),
                      React.createElement('span', null, workspace.title), React.createElement('small', null, workspace.path)))),
                    !addingWorkspace ? null : React.createElement('label', { className: 'dshRemotePathField' },
                      React.createElement('span', null, t('chooseDirectory')),
                      React.createElement('input', {
                        value: path, disabled: busy, placeholder: t('remotePathPlaceholder'),
                        onChange: (event: Event) => setPath((event.target as HTMLInputElement).value),
                      }),
                      React.createElement('small', null, t('remotePathHint'))),
                    React.createElement('footer', { className: 'dshRemoteOpenBar' },
                      React.createElement('div', null, React.createElement('span', null, t('currentDirectory')), React.createElement('strong', null, path || '—')),
                      React.createElement('button', { type: 'button', disabled: busy || path.trim() === '', onClick: () => void openWorkspace() }, t(busy ? 'openingWorkspace' : 'openWorkspace')))))),
            notice === undefined ? null : React.createElement('p', { className: 'dshRemoteNotice', role: 'status' }, notice),
            error === undefined ? null : React.createElement('p', { className: 'dshRemoteError', role: 'alert' }, error)))))
    }

    function RemoteModeAction(props: {
      wide: boolean
      control: <T>(endpoint: string, payload?: unknown) => Promise<T>
      t: Translate
    }): unknown {
      const { t } = props
      const [open, setOpen] = React.useState(false)
      const [status, setStatus] = React.useState<RemoteStatus | undefined>(undefined)
      const [devices, setDevices] = React.useState<RemoteDevice[]>([])
      const [hostRegistrationCode, setHostRegistrationCode] = React.useState('')
      const [email, setEmail] = React.useState('')
      const [password, setPassword] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState<string | undefined>(undefined)
      const [supported, setSupported] = React.useState(true)

      const refresh = async (): Promise<void> => {
        const [nextStatus, nextDevices] = await Promise.all([
          props.control<RemoteStatus>('status'),
          props.control<RemoteDevice[]>('devices').catch(() => []),
        ])
        setStatus(nextStatus)
        setDevices(nextDevices)
      }

      const refreshStatus = async (): Promise<void> => {
        setStatus(await props.control<RemoteStatus>('status'))
      }

      React.useEffect(() => {
        void refresh().catch(reason => {
          setError(messageOf(reason))
          setSupported(false)
        })
      }, [])

      React.useEffect(() => {
        if (!open) return
        void refreshStatus()
        const timer = window.setInterval(() => {
          void refreshStatus()
        }, 1500)
        return () => window.clearInterval(timer)
      }, [open])

      const switchMode = async (mode: 'local' | 'remote', targetDeviceId?: string): Promise<void> => {
        setBusy(true)
        setError(undefined)
        try {
          await props.control('mode.set', { mode, ...(targetDeviceId === undefined ? {} : { targetDeviceId }) })
          window.location.reload()
        } catch (reason) {
          setError(messageOf(reason))
          setBusy(false)
        }
      }

      const loginHost = async (): Promise<void> => {
        if (email.trim() === '' || password === '') return
        setBusy(true)
        setError(undefined)
        try {
          await props.control('host.account.login', { email: email.trim(), password })
          await refreshStatus()
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setPassword('')
          setBusy(false)
        }
      }

      const registerHostWithCode = async (): Promise<void> => {
        if (hostRegistrationCode.trim() === '') return
        setBusy(true)
        setError(undefined)
        try {
          await props.control('host.registration-code.submit', { code: hostRegistrationCode.trim() })
          setHostRegistrationCode('')
          await refreshStatus()
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const label = status?.mode === 'remote'
        ? t('remoteTarget', { name: status.target?.name ?? t('host') })
        : t('local')
      if (!supported) return null
      return React.createElement(React.Fragment, null,
        React.createElement('button', {
          type: 'button',
          className: 'dshRemoteModeButton',
          title: t('switchTarget'),
          'aria-label': t('switchTarget'),
          onClick: () => setOpen(true),
        }, React.createElement('span', { 'aria-hidden': true }, '◎'), props.wide
          ? React.createElement('span', null, label)
          : null),
        open ? React.createElement('div', { className: 'dshRemoteBackdrop', role: 'presentation' },
          React.createElement('section', {
            className: 'dshRemoteDialog',
            role: 'dialog',
            'aria-modal': true,
            'aria-label': t('harnessTarget'),
          },
          React.createElement('div', { className: 'dshRemoteHeader' },
            React.createElement('strong', null, t('harnessTarget')),
            React.createElement('button', { type: 'button', onClick: () => setOpen(false), 'aria-label': t('close') }, '×')),
          React.createElement('button', {
            type: 'button',
            disabled: busy || status?.mode === 'local',
            onClick: () => void switchMode('local'),
          }, t('thisMachineLocal')),
          React.createElement('div', { className: 'dshRemoteDevices' }, devices.length === 0
            ? React.createElement('p', null, t('noRemoteHosts'))
            : devices.map(device => React.createElement('button', {
              type: 'button',
              key: device.deviceId,
              disabled: busy || !device.online || status?.target?.deviceId === device.deviceId,
              onClick: () => void switchMode('remote', device.deviceId),
            }, `${device.name} · ${t(device.online ? 'online' : 'offline')}`))),
          status?.hostAuthorizationAvailable && status.host !== undefined
            ? React.createElement('div', { className: 'dshRemoteHostAccount' },
              React.createElement('strong', null, t('thisMachineHost')),
              React.createElement('p', null, status.host.online
                ? status.host.account === undefined ? t('connected') : t('connectedAs', { account: status.host.account })
                : status.host.accountRequired
                  ? t('hostSignInHint')
                  : status.host.error === undefined
                    ? t('checkingHost')
                    : t('hostUnavailable', { error: connectionErrorMessage(status.host.error, t) })),
              status.host.accountRequired ? React.createElement('div', { className: 'dshRemoteLogin' },
                React.createElement('input', {
                  type: 'email',
                  value: email,
                  disabled: busy,
                  autoComplete: 'username',
                  placeholder: t('serverAccountEmail'),
                  'aria-label': t('serverAccountEmail'),
                  onChange: (event: Event) => setEmail((event.target as HTMLInputElement).value),
                }),
                React.createElement('input', {
                  type: 'password',
                  value: password,
                  disabled: busy,
                  autoComplete: 'current-password',
                  placeholder: t('password'),
                  'aria-label': t('serverAccountPassword'),
                  onChange: (event: Event) => setPassword((event.target as HTMLInputElement).value),
                }),
                React.createElement('button', {
                  type: 'button',
                  disabled: busy || email.trim() === '' || password === '',
                  onClick: () => void loginHost(),
                }, t(busy ? 'signingIn' : 'signInRegisterHost')),
                React.createElement('input', {
                  value: hostRegistrationCode,
                  disabled: busy,
                  autoComplete: 'one-time-code',
                  placeholder: t('hostRegistrationCode'),
                  'aria-label': t('hostRegistrationCode'),
                  onChange: (event: Event) => setHostRegistrationCode((event.target as HTMLInputElement).value),
                }),
                React.createElement('button', {
                  type: 'button',
                  disabled: busy || hostRegistrationCode.trim() === '',
                  onClick: () => void registerHostWithCode(),
                }, t(busy ? 'registering' : 'useRegistrationCode'))) : null)
            : null,
          error === undefined ? null : React.createElement('p', { className: 'dshRemoteError', role: 'alert' }, error)))
          : null)
    }

    function RemoteSessionHeaderAction(props: {
      control: <T>(endpoint: string, payload?: unknown) => Promise<T>
      t: Translate
    }): unknown {
      const { t } = props
      const [status, setStatus] = React.useState<RemoteStatus | undefined>(undefined)
      const [busy, setBusy] = React.useState(false)
      const [routeOpen, setRouteOpen] = React.useState(false)

      React.useEffect(() => {
        let active = true
        const refresh = (): void => {
          void props.control<RemoteStatus>('status').then(next => {
            if (active) setStatus(next)
          }).catch(() => undefined)
        }
        refresh()
        const timer = window.setInterval(refresh, 1_500)
        return () => {
          active = false
          window.clearInterval(timer)
        }
      }, [])

      if (status?.mode !== 'remote') return null
      const exit = async (): Promise<void> => {
        setBusy(true)
        try {
          await props.control('mode.set', { mode: 'local' })
          window.location.reload()
        } finally {
          setBusy(false)
        }
      }
      const transport = status.transport ?? 'Disconnected'
      const networkLabel = transport === 'P2P'
        ? t('remoteNetworkP2p')
        : transport === 'TURN'
          ? t('remoteNetworkTurn')
          : transport === 'Relay'
            ? t('remoteNetworkRelay')
            : transport === 'LAN'
              ? t('remoteNetworkLan')
              : t('remoteNetworkOffline')
      const networkOnline = status.connected === true && transport !== 'Disconnected'
      const routeVia = transport === 'P2P'
        ? t('connectionRouteP2p')
        : transport === 'TURN'
          ? t('connectionRouteTurn')
          : transport === 'Relay'
            ? t('connectionRouteRelay')
            : t('connectionRouteLan')
      return React.createElement('div', { className: 'dshRemoteSessionHeader', role: 'status' },
        React.createElement('svg', {
          viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
          strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
        }, React.createElement('rect', { x: 3, y: 4, width: 18, height: 13, rx: 2 }), React.createElement('path', { d: 'M8 21h8M12 17v4' })),
        React.createElement('span', null, t('remoteModeLabel', { name: status.target?.name ?? t('host') })),
        React.createElement('button', {
          type: 'button',
          className: `dshRemoteNetwork${networkOnline ? ' isOnline' : ' isOffline'}`,
          title: networkLabel,
          disabled: !networkOnline,
          'aria-haspopup': 'dialog',
          'aria-expanded': routeOpen,
          onClick: () => setRouteOpen(value => !value),
        }, React.createElement('i', { 'aria-hidden': true }), networkLabel),
        networkOnline ? React.createElement('span', { className: 'dshRemoteEncrypted' }, t('remoteLinkEncrypted')) : null,
        React.createElement('button', { type: 'button', className: 'dshRemoteHeaderExitLink', disabled: busy, onClick: () => void exit() }, t('exitRemote')),
        !routeOpen ? null : React.createElement('div', {
          className: 'dshRemoteRouteBackdrop',
          role: 'presentation',
          onMouseDown: (event: MouseEvent) => { if (event.target === event.currentTarget) setRouteOpen(false) },
        }, React.createElement('section', {
          className: 'dshRemoteRoutePanel',
          role: 'dialog',
          'aria-modal': true,
          'aria-label': t('connectionRouteTitle'),
        }, React.createElement('header', null,
          React.createElement('strong', null, t('connectionRouteTitle')),
          React.createElement('button', { type: 'button', 'aria-label': t('close'), onClick: () => setRouteOpen(false) }, '×')),
        React.createElement('ol', null,
          React.createElement('li', null, React.createElement('small', null, t('connectionRouteFrom')), React.createElement('strong', null, t('connectionRouteCurrentDevice'))),
          React.createElement('li', null, React.createElement('small', null, t('connectionRouteVia')), React.createElement('strong', null, routeVia)),
          React.createElement('li', null, React.createElement('small', null, t('connectionRouteTo')), React.createElement('strong', null, status.target?.name ?? t('host')), React.createElement('span', null, t('connectionRouteHost')))),
        React.createElement('p', null, t('connectionRouteEncrypted')))))
    }

    function installStyle(): () => void {
      const style = document.createElement('style')
      style.dataset.pluginCss = 'dsh-remote'
      style.textContent = [
        'html.dshRemoteTargetActive button[aria-label="添加工作区"],html.dshRemoteTargetActive button[aria-label="Add workspace"]{display:none!important}',
        '.dshRemoteModeButton{min-height:36px;border:0;background:transparent;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px;padding:0 10px;border-radius:8px}.dshRemoteModeButton:is(button){cursor:pointer}',
        '.dshRemoteModeButton:is(button):hover{background:var(--dsw-alias-interactive-bg-hover)}',
        '.dshRemoteSidebarEntry{box-sizing:border-box;position:relative;width:100%;height:36px;min-width:0;display:block;overflow:hidden}.dshRemoteSidebarEntry .dshRemoteModeButton{box-sizing:border-box;width:100%;min-width:0;padding-right:48px}.dshRemoteSidebarEntry.isActive .dshRemoteModeButton{color:var(--dsw-alias-label-secondary);background:transparent}.dshRemoteSidebarLabel{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshRemoteExitLink{position:absolute;top:50%;right:10px;transform:translateY(-50%);white-space:nowrap;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:0;font:inherit;font-size:12px;line-height:20px;cursor:pointer}.dshRemoteExitLink:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteExitLink:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:2px}.dshRemoteExitLink:disabled{opacity:.45;cursor:default;text-decoration:none}',
        '.dshRemoteComputerIcon{width:18px;height:18px;flex:0 0 auto;color:var(--dsw-alias-label-secondary)}',
        '.dshRemoteSessionHeader{position:fixed;z-index:25;top:12px;right:84px;height:28px;display:inline-flex;align-items:center;gap:7px;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}.dshRemoteSessionHeader>svg{width:15px;height:15px;flex:0 0 auto}.dshRemoteSessionHeader>span{max-width:260px;overflow:hidden;text-overflow:ellipsis}.dshRemoteNetwork{border:0;background:transparent;color:inherit;font:inherit;padding:3px 2px;display:inline-flex;align-items:center;gap:5px;cursor:pointer}.dshRemoteNetwork:hover:not(:disabled){color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteNetwork:disabled{cursor:default}.dshRemoteNetwork>i{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}.dshRemoteNetwork.isOnline>i{background:var(--dsw-alias-state-success-primary,#287a3d)}.dshRemoteNetwork.isOffline{color:var(--dsw-alias-state-error-primary,#b42318)}.dshRemoteNetwork.isOffline>i{background:currentColor}.dshRemoteEncrypted{color:var(--dsw-alias-label-tertiary)}.dshRemoteHeaderExitLink{border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:3px 2px;font:inherit;text-decoration:none;cursor:pointer}.dshRemoteHeaderExitLink:hover{text-decoration:underline;color:var(--dsw-alias-label-primary)}.dshRemoteHeaderExitLink:disabled{opacity:.45;cursor:default;text-decoration:none}.dshRemoteRouteBackdrop{position:fixed;inset:0;z-index:26}.dshRemoteRoutePanel{position:absolute;top:48px;right:28px;width:min(460px,calc(100vw - 32px));color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;box-shadow:var(--dsw-shadow-lv2);padding:16px;white-space:normal}.dshRemoteRoutePanel>header{display:flex;align-items:center;justify-content:space-between}.dshRemoteRoutePanel>header strong{font-size:14px}.dshRemoteRoutePanel>header button{width:28px;height:28px;border:0;border-radius:7px;background:transparent;color:inherit;font-size:20px;cursor:pointer}.dshRemoteRoutePanel>header button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteRoutePanel ol{display:flex;align-items:stretch;margin:16px 0;padding:0;list-style:none}.dshRemoteRoutePanel li{position:relative;min-width:0;flex:1;display:flex;flex-direction:column;gap:4px;padding-right:20px}.dshRemoteRoutePanel li:not(:last-child)::after{content:"→";position:absolute;right:7px;top:21px;color:var(--dsw-alias-label-tertiary)}.dshRemoteRoutePanel li small{color:var(--dsw-alias-label-tertiary)}.dshRemoteRoutePanel li strong,.dshRemoteRoutePanel li span{overflow:hidden;text-overflow:ellipsis}.dshRemoteRoutePanel li strong{font-size:13px}.dshRemoteRoutePanel li span{color:var(--dsw-alias-label-secondary);font-size:11px}.dshRemoteRoutePanel>p{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}@media(max-width:620px){.dshRemoteSessionHeader{top:8px;right:52px}.dshRemoteSessionHeader>svg{display:none}.dshRemoteSessionHeader>span{max-width:130px}.dshRemoteEncrypted{display:none}.dshRemoteRoutePanel{top:42px;right:12px}.dshRemoteRoutePanel ol{flex-direction:column;gap:18px}.dshRemoteRoutePanel li:not(:last-child)::after{content:"↓";top:auto;right:auto;bottom:-16px;left:3px}}',
        '.dshRemoteModeButton:focus-visible,.dshRemotePage button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
        '.dshRemotePage{width:min(720px,100%);max-height:min(760px,calc(100vh - 40px));display:flex;flex-direction:column;background:var(--dsw-alias-bg-primary,#fff);color:var(--dsw-alias-label-primary);border-radius:14px;overflow:hidden;animation:dshRemotePageIn .18s cubic-bezier(.25,1,.5,1)}',
        '.dshRemotePageHeader{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px 24px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshRemotePageHeader>div{min-width:0}.dshRemotePageHeader strong{display:block;font-size:18px;line-height:1.4}.dshRemotePageHeader p{max-width:70ch;margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.5}.dshRemotePageHeader>button{width:40px;height:40px;border:0;border-radius:8px;background:transparent;color:inherit;font-size:24px;cursor:pointer}.dshRemotePageHeader>button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
        '.dshRemotePageBody{padding:24px;overflow:auto;display:flex;flex-direction:column;gap:24px}.dshRemotePageBody button{font:inherit;color:inherit}',
        '.dshRemoteSectionHeading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px}.dshRemoteSectionHeading>strong{font-size:14px}.dshRemoteSectionHeading>button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:6px 0}',
        '.dshRemoteSectionHeading>.dshRemoteAddWorkspace{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;border-radius:50%;font-size:20px;line-height:1}.dshRemoteSectionHeading>.dshRemoteAddWorkspace:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}',
        '.dshRemoteHostList{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteHostList>button{min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:left;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);background:transparent;padding:10px 4px;cursor:pointer}.dshRemoteHostList>button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteHostList>button:disabled{opacity:.5;cursor:default}.dshRemoteHostList small,.dshRemoteSelectedHost small{color:var(--dsw-alias-label-secondary)}',
        '.dshRemoteSelectedHost{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-2)}',
        '.dshRemoteBrowser{display:flex;flex-direction:column}.dshRemoteCrumbs{display:flex;align-items:center;gap:4px;overflow:auto;padding:2px 0 10px}.dshRemoteCrumbs>button{flex:0 0 auto;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:5px 7px;border-radius:6px;cursor:pointer}.dshRemoteCrumbs>button:not(:last-child)::after{content:" /";color:var(--dsw-alias-label-tertiary)}.dshRemoteCrumbs>button:disabled{color:var(--dsw-alias-label-primary);font-weight:600}',
        '.dshRemoteDirectoryList{min-height:72px;display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteDirectoryList>button{min-height:52px;display:grid;grid-template-columns:auto 1fr;column-gap:10px;text-align:left;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);background:transparent;padding:8px 4px;cursor:pointer}.dshRemoteDirectoryList>button:hover,.dshRemoteDirectoryList>button.isSelected{background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteDirectoryList>button.isSelected{color:var(--dsw-alias-label-primary)}.dshRemoteDirectoryList>button>span:first-child{grid-row:1/3}.dshRemoteDirectoryList>button>small{grid-column:2;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis}.dshRemoteDirectoryList>p,.dshRemoteHint{margin:12px 0;color:var(--dsw-alias-label-secondary);font-size:13px}',
        '.dshRemotePathField{display:flex;flex-direction:column;gap:6px;margin-top:20px}.dshRemotePathField>span{font-size:13px;font-weight:600}.dshRemotePathField>input{min-height:40px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:0 12px;font:inherit}.dshRemotePathField>small{color:var(--dsw-alias-label-secondary)}',
        '.dshRemoteOpenBar{position:sticky;bottom:-96px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:20px;padding:14px 0;background:var(--dsw-alias-bg-primary,#fff);border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteOpenBar>div{min-width:0;display:flex;flex-direction:column;gap:3px}.dshRemoteOpenBar span{color:var(--dsw-alias-label-secondary);font-size:12px}.dshRemoteOpenBar strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.dshRemoteOpenBar>button,.dshRemoteEnable>button{min-height:40px;flex:0 0 auto;border:0;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-primary,#fff);padding:8px 16px;cursor:pointer}.dshRemoteOpenBar>button:disabled,.dshRemoteEnable>button:disabled{opacity:.5;cursor:default}',
        '.dshRemoteEnable{max-width:600px;display:flex;flex-direction:column;align-items:flex-start;gap:10px}.dshRemoteEnable p{margin:0;color:var(--dsw-alias-label-secondary);line-height:1.5}',
        '.dshRemoteClientLogin{width:min(440px,100%);display:flex;flex-direction:column;gap:8px}.dshRemoteClientLogin input{min-height:40px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:0 12px;font:inherit}.dshRemoteClientLogin button{align-self:flex-start;min-height:40px;border:0;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-primary,#fff);padding:8px 16px;cursor:pointer}',
        '.dshRemoteLocalLink{align-self:flex-start;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:4px 0;cursor:pointer}.dshRemoteLocalLink:hover{color:var(--dsw-alias-label-primary)}',
        '@keyframes dshRemotePageIn{from{opacity:0;transform:translateY(6px) scale(.99)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.dshRemotePage{animation:none}}@media(max-width:620px){.dshRemoteBackdrop{padding:12px}.dshRemotePage{max-height:calc(100vh - 24px)}.dshRemotePageHeader{padding:12px 16px}.dshRemotePageBody{padding:20px 16px}.dshRemoteOpenBar{align-items:flex-end}.dshRemoteOpenBar>button{min-height:48px}}',
        '.dshRemoteBackdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.42);display:grid;place-items:center;padding:20px}',
        '.dshRemoteDialog{width:min(460px,100%);max-height:80vh;overflow:auto;background:var(--dsw-alias-bg-primary,#fff);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:18px;display:grid;gap:12px;box-shadow:0 18px 60px rgba(0,0,0,.28)}',
        '.dshRemoteDialog button,.dshRemoteDialog input{font:inherit;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:9px 10px;background:transparent;color:inherit}',
        '.dshRemoteDialog button:not(:disabled){cursor:pointer}.dshRemoteDialog button:disabled{opacity:.5}',
        '.dshRemoteHeader{display:flex;align-items:center;justify-content:space-between}.dshRemoteHeader button{border:0;font-size:22px;padding:0 6px}',
        '.dshRemoteDevices{display:grid;gap:8px}.dshRemoteDevices p{margin:4px 0;color:var(--dsw-alias-label-secondary)}',
        '.dshRemoteError{margin:0;color:var(--dsw-alias-state-danger,#c33)}',
        '.dshRemoteHostAccount{display:grid;gap:8px;border-top:1px solid var(--dsw-alias-border-l3);padding-top:12px}.dshRemoteHostAccount p{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px}',
        '.dshRemoteLogin{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dshRemoteLogin button{grid-column:1/-1}',
        '.dshRemotePluginCard{list-style:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;transition:border-color .16s,background .16s}',
        '.dshRemotePluginCard:hover{border-color:var(--dsw-alias-label-dimmed)}.dshRemotePluginCard.isOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}',
        '.dshRemotePluginCardHeader{display:flex;align-items:center}.dshRemotePluginCardToggle{appearance:none;width:100%;min-width:0;font:inherit;color:inherit;text-align:left;cursor:pointer;background:transparent;border:0;border-radius:12px;display:flex;align-items:center;gap:12px;padding:14px 16px}.dshRemotePluginCardToggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
        '.dshRemotePluginCardHeading{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}.dshRemotePluginCardHeading>strong{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.dshRemotePluginCardHeading>span{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.dshRemotePluginCardStatus{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.dshRemotePluginCardStatus.isOnline{color:var(--dsw-alias-state-success,#287a3d)}.dshRemotePluginCardStatus.isReconnecting{color:var(--dsw-alias-state-warning,#8a5a00)}.dshRemotePluginCardStatus.isOffline{color:var(--dsw-alias-state-danger,#b42318)}.dshRemotePluginCardChevron{color:var(--dsw-alias-label-tertiary);font-size:18px;line-height:14px;transition:transform .16s}.dshRemotePluginCard.isOpen .dshRemotePluginCardChevron{transform:rotate(180deg)}',
        '.dshRemotePluginCardBody{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.dshRemoteSettings{display:flex;flex-direction:column;max-width:720px}.dshRemoteSettingsTop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 0}.dshRemoteSettingsState{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}',
        '.dshRemoteField{display:flex;flex-direction:column;gap:6px;padding:12px 0}.dshRemoteField+.dshRemoteField{border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteField label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5}.dshRemoteField input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.dshRemoteField input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.dshRemoteField input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.dshRemoteField p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}',
        '.dshRemoteAssociation{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.dshRemoteAssociation>span{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.dshRemoteAssociation strong{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:1.5}.dshRemoteAssociation p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}',
        '.dshRemoteConnection{border-top:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0}.dshRemoteConnectionSummary{min-width:0;display:flex;flex-direction:column;gap:4px}.dshRemoteConnectionSummary>span{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.dshRemoteConnectionSummary strong{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:1.5}.dshRemoteConnectionSummary p,.dshRemoteConnectionIssue{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.dshRemoteConnectionDot{width:8px;height:8px;flex:0 0 auto;border-radius:999px;background:var(--dsw-alias-label-tertiary)}.dshRemoteConnectionDot.isOnline{background:var(--dsw-alias-state-success,#287a3d)}.dshRemoteConnectionDot.isReconnecting{background:var(--dsw-alias-state-warning,#8a5a00)}.dshRemoteConnectionDot.isOffline{background:var(--dsw-alias-state-danger,#b42318)}.dshRemoteConnectionIssue{color:var(--dsw-alias-state-danger,#b42318);padding:0 0 12px}.dshRemoteReconnect{appearance:none;flex:0 0 auto;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);min-height:34px;padding:5px 14px;font-size:13px;line-height:1.5}.dshRemoteReconnect:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteReconnect:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.dshRemoteReconnect:disabled{opacity:.4;cursor:default}',
        '.dshRemoteSettingsFooter{border-top:1px solid var(--dsw-alias-border-l2);display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px}.dshRemoteSettingsFooter .dshRemoteError,.dshRemoteNotice{min-width:0;flex:1;margin:0;font-size:12px;line-height:1.5}.dshRemoteNotice{color:var(--dsw-alias-label-tertiary)}.dshRemoteDiscard,.dshRemoteSave{appearance:none;font:inherit;cursor:pointer;border:1px solid transparent;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.dshRemoteDiscard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:transparent}.dshRemoteDiscard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.dshRemoteSave{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.dshRemoteDiscard:disabled,.dshRemoteSave:disabled{opacity:.4;cursor:default}.dshRemoteDiscard:focus-visible,.dshRemoteSave:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
        '@media(max-width:620px){.dshRemotePluginCardStatus{display:none}.dshRemoteSettingsTop{gap:10px}.dshRemoteConnection{align-items:flex-start}.dshRemoteReconnect{min-height:40px}}',
      ].join('')
      document.head.append(style)
      return () => style.remove()
    }

    function apply(ctx: {
      connection: { rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<ControlResult> } }
      effect(effect: () => (() => void), label: string): void
      locale: {
        bind(namespace: string): Translate
        register(namespace: string, dictionaries: { zh: typeof zh; en: typeof en }): () => void
      }
      slots: {
        inject(name: string, factory: () => unknown): void
        register(options: Record<string, unknown>, component: unknown): unknown
      }
    }): void {
      const t = ctx.locale.bind(localeNamespace)
      const control = async <T,>(endpoint: string, payload: unknown = {}): Promise<T> => {
        let result: ControlResult
        for (let attempt = 0; ; attempt += 1) {
          try {
            result = await ctx.connection.rpc.call('/remote', endpoint, payload)
            break
          } catch (reason) {
            // The browser face can mount one turn before the injected Host
            // runtime has registered /remote. A 405 comes from the static Web
            // fallback, so the RPC was not dispatched and is safe to retry.
            if (attempt >= 19 || !isPendingControlRoute(reason)) throw reason
            await delay(100)
          }
        }
        if (!result.ok) throw new Error(result.error?.message ?? t('remoteRequestFailed'))
        return result.value as T
      }
      ctx.effect(() => ctx.locale.register(localeNamespace, { zh, en }), 'dsh-remote: dictionaries')
      ctx.effect(installStyle, 'dsh-remote: client styles')
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'dsh-remote-global-context',
        order: 20,
        locale: localeNamespace,
        inject: () => ({ control }),
      }, RemoteSessionHeaderAction))
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'dsh-remote-workspace',
        order: -20,
        locale: localeNamespace,
        inject: () => ({ control }),
      }, RemoteWorkspaceAction))
      ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        id: 'dsh-remote',
        order: 30,
        locale: localeNamespace,
        inject: () => ({ control }),
      }, RemotePluginOptions))
    }

    function isPendingControlRoute(reason: unknown): boolean {
      return reason instanceof Error && /transport failure for \/remote\/[^:]+: HTTP 405$/.test(reason.message)
    }

    function delay(ms: number): Promise<void> {
      return new Promise(resolve => window.setTimeout(resolve, ms))
    }

    function messageOf(reason: unknown): string { return reason instanceof Error ? reason.message : String(reason) }

    module.exports.apply = apply
    module.exports.inject = inject
    return module.exports
  },
})
