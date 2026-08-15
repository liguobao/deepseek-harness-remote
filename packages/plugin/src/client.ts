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

    function installStyle(): () => void {
      const style = document.createElement('style')
      style.dataset.pluginCss = 'dsh-remote'
      style.textContent = [
        '.dshRemoteModeButton{min-height:36px;border:0;background:transparent;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px;padding:0 10px;border-radius:8px;cursor:pointer}',
        '.dshRemoteModeButton:hover{background:var(--dsw-alias-interactive-bg-hover)}',
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
