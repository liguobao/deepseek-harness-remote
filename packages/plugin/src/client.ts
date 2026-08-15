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
  association?: {
    method: 'account' | 'host_registration_code'
    account?: string
  }
}

interface PluginConfigureResult {
  status: 'authorized'
  role: 'host' | 'client'
  account?: string
  settings: PluginSettingsView
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
    const inject = ['connection', 'slots']

    function RemotePluginOptions(props: {
      control: <T>(endpoint: string, payload?: unknown) => Promise<T>
    }): unknown {
      const [open, setOpen] = React.useState(false)
      const [serverUrl, setServerUrl] = React.useState('')
      const [role, setRole] = React.useState<'host' | 'client'>('host')
      const [deviceName, setDeviceName] = React.useState('')
      const [hostEnrollment, setHostEnrollment] = React.useState<'account' | 'host_registration_code'>('account')
      const [registrationCode, setRegistrationCode] = React.useState('')
      const [email, setEmail] = React.useState('')
      const [password, setPassword] = React.useState('')
      const [association, setAssociation] = React.useState<PluginSettingsView['association']>(undefined)
      const [loaded, setLoaded] = React.useState(false)
      const [writable, setWritable] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState<string | undefined>(undefined)
      const [error, setError] = React.useState<string | undefined>(undefined)

      const applyView = (view: PluginSettingsView): void => {
        setServerUrl(view.config.serverUrl ?? 'https://dsh.r2049.cn')
        setRole(view.config.role === 'client' ? 'client' : 'host')
        setDeviceName(view.deviceName)
        setAssociation(view.association)
        setWritable(view.writable)
        setLoaded(true)
      }

      const load = async (): Promise<void> => {
        const view = await props.control<PluginSettingsView>('settings.get')
        applyView(view)
      }

      React.useEffect(() => {
        void load().catch(reason => setError(messageOf(reason)))
      }, [])

      const save = async (event: Event): Promise<void> => {
        event.preventDefault()
        if (!writable) return
        setBusy(true)
        setNotice(undefined)
        setError(undefined)
        try {
          const result = await props.control<PluginConfigureResult>('settings.configure', {
            serverUrl,
            role,
            ...(role === 'host' && hostEnrollment === 'host_registration_code'
              ? { registrationCode }
              : { email, password }),
          })
          applyView(result.settings)
          setNotice('Associated. Restart Harness to apply.')
          setRegistrationCode('')
          setPassword('')
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const switchRole = async (): Promise<void> => {
        const nextRole = role === 'host' ? 'client' : 'host'
        setError(undefined)
        setNotice(undefined)
        if (association === undefined) {
          setRole(nextRole)
          return
        }
        setBusy(true)
        try {
          const view = await props.control<PluginSettingsView>('settings.role.set', { role: nextRole })
          applyView(view)
          setNotice('Mode changed. Restart Harness to apply.')
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
          setEmail('')
          setPassword('')
          setRegistrationCode('')
          setNotice('Signed out. Restart Harness to disconnect this mode.')
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const exitOptions = (): void => { setOpen(false) }

      const modeSwitch = React.createElement('div', { className: 'dshRemoteRoleField' },
        React.createElement('span', null, 'Mode'),
        React.createElement('button', {
          type: 'button',
          className: 'dshRemoteRoleSwitch',
          role: 'switch',
          'aria-checked': role === 'client',
          disabled: busy || !writable,
          onClick: () => void switchRole(),
        },
        React.createElement('span', { className: role === 'host' ? 'isActive' : '' }, 'Host'),
        React.createElement('span', { className: role === 'client' ? 'isActive' : '' }, 'Client')))

      return React.createElement('li', { className: `dshRemotePluginCard${open ? ' isOpen' : ''}` },
        React.createElement('button', {
          type: 'button',
          className: 'dshRemotePluginCardHeader',
          'aria-expanded': open,
          onClick: () => setOpen(current => !current),
        },
        React.createElement('span', { className: 'dshRemotePluginCardHeading' },
          React.createElement('strong', null, 'DeepSeek 远程连接'),
          React.createElement('span', null, 'Remote Host and Client connection')),
        association === undefined ? null : React.createElement('span', { className: 'dshRemotePluginCardStatus' }, 'Associated'),
        React.createElement('span', { className: 'dshRemotePluginCardChevron', 'aria-hidden': true }, '⌄')),
        !open ? null : React.createElement('div', { className: 'dshRemotePluginCardBody' },
          !loaded
            ? React.createElement('p', { className: 'dshRemoteSettingsState' }, error ?? '正在加载 DeepSeek 远程连接设置…')
            : association !== undefined
              ? React.createElement('div', { className: 'dshRemoteSettings' },
        React.createElement('div', { className: 'dshRemoteAssociation' },
          React.createElement('span', null, association.account === undefined ? 'Authorization' : 'Account'),
          React.createElement('strong', null, association.account ?? 'Host registration code')),
        modeSwitch,
        React.createElement('div', { className: 'dshRemoteSettingsActions' },
          React.createElement('button', { type: 'button', disabled: busy || !writable, onClick: () => void logout() }, busy ? 'Signing out…' : 'Sign out'),
          notice === undefined ? null : React.createElement('span', null, notice)),
        !writable ? React.createElement('p', { className: 'dshRemoteError' }, 'This DSH profile does not provide writable user settings.') : null,
        error === undefined ? null : React.createElement('p', { className: 'dshRemoteError', role: 'alert' }, error))
              : React.createElement('form', { className: 'dshRemoteSettings', onSubmit: (event: Event) => void save(event) },
        React.createElement('div', { className: 'dshRemoteSettingsIntro' },
          React.createElement('p', null, `Device: ${deviceName}. Choose a role and authorize it with the Server.`)),
        React.createElement('label', null,
          React.createElement('span', null, 'Server URL'),
          React.createElement('input', {
            type: 'url',
            value: serverUrl,
            disabled: busy || !writable,
            required: true,
            placeholder: 'https://dsh.r2049.cn',
            onChange: (event: Event) => { setServerUrl((event.target as HTMLInputElement).value); setNotice(undefined) },
          })),
        modeSwitch,
        role === 'host' ? React.createElement('label', null,
          React.createElement('span', null, 'Authorization method'),
          React.createElement('select', {
            value: hostEnrollment,
            disabled: busy || !writable,
            onChange: (event: Event) => setHostEnrollment((event.target as HTMLSelectElement).value as typeof hostEnrollment),
          },
          React.createElement('option', { value: 'account' }, 'Account password'),
          React.createElement('option', { value: 'host_registration_code' }, 'Host registration code'))) : null,
        role === 'host' && hostEnrollment === 'host_registration_code'
          ? React.createElement('label', null,
            React.createElement('span', null, 'Host registration code'),
            React.createElement('input', {
              value: registrationCode,
              disabled: busy || !writable,
              required: true,
              autoComplete: 'one-time-code',
              placeholder: 'ABCD-EFGH',
              onChange: (event: Event) => { setRegistrationCode((event.target as HTMLInputElement).value); setNotice(undefined) },
            }))
          : React.createElement(React.Fragment, null,
            React.createElement('label', null,
              React.createElement('span', null, 'Account'),
              React.createElement('input', {
                type: 'email',
                value: email,
                disabled: busy || !writable,
                required: true,
                autoComplete: 'username',
                onChange: (event: Event) => { setEmail((event.target as HTMLInputElement).value); setNotice(undefined) },
              })),
            React.createElement('label', null,
              React.createElement('span', null, 'Password'),
              React.createElement('input', {
                type: 'password',
                value: password,
                disabled: busy || !writable,
                required: true,
                autoComplete: 'current-password',
                onChange: (event: Event) => { setPassword((event.target as HTMLInputElement).value); setNotice(undefined) },
              }))),
        React.createElement('div', { className: 'dshRemoteSettingsActions' },
          React.createElement('button', { type: 'submit', disabled: busy || !writable }, busy ? 'Authorizing…' : 'Save'),
          React.createElement('button', { type: 'button', disabled: busy, onClick: exitOptions }, 'Exit'),
          notice === undefined ? null : React.createElement('span', null, notice)),
        !writable ? React.createElement('p', { className: 'dshRemoteError' }, 'This DSH profile does not provide writable user settings.') : null,
        error === undefined ? null : React.createElement('p', { className: 'dshRemoteError', role: 'alert' }, error))))
    }

    function RemoteModeAction(props: {
      wide: boolean
      control: <T>(endpoint: string, payload?: unknown) => Promise<T>
    }): unknown {
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

      const label = status?.mode === 'remote' ? `Remote · ${status.target?.name ?? 'Host'}` : 'Local'
      if (!supported) return null
      return React.createElement(React.Fragment, null,
        React.createElement('button', {
          type: 'button',
          className: 'dshRemoteModeButton',
          title: 'Switch Local / Remote Harness target',
          'aria-label': 'Switch Local / Remote Harness target',
          onClick: () => setOpen(true),
        }, React.createElement('span', { 'aria-hidden': true }, '◎'), props.wide
          ? React.createElement('span', null, label)
          : null),
        open ? React.createElement('div', { className: 'dshRemoteBackdrop', role: 'presentation' },
          React.createElement('section', {
            className: 'dshRemoteDialog',
            role: 'dialog',
            'aria-modal': true,
            'aria-label': 'Harness target',
          },
          React.createElement('div', { className: 'dshRemoteHeader' },
            React.createElement('strong', null, 'Harness target'),
            React.createElement('button', { type: 'button', onClick: () => setOpen(false), 'aria-label': 'Close' }, '×')),
          React.createElement('button', {
            type: 'button',
            disabled: busy || status?.mode === 'local',
            onClick: () => void switchMode('local'),
          }, 'This machine (Local)'),
          React.createElement('div', { className: 'dshRemoteDevices' }, devices.length === 0
            ? React.createElement('p', null, 'No authorized remote Host for this account.')
            : devices.map(device => React.createElement('button', {
              type: 'button',
              key: device.deviceId,
              disabled: busy || !device.online || status?.target?.deviceId === device.deviceId,
              onClick: () => void switchMode('remote', device.deviceId),
            }, `${device.name} · ${device.online ? 'Online' : 'Offline'}`))),
          status?.hostAuthorizationAvailable && status.host !== undefined
            ? React.createElement('div', { className: 'dshRemoteHostAccount' },
              React.createElement('strong', null, 'This machine as Remote Host'),
              React.createElement('p', null, status.host.online
                ? `Connected${status.host.account === undefined ? '' : ` as ${status.host.account}`}`
                : status.host.accountRequired
                  ? 'Sign in to authorize this Host on the selected Server.'
                  : status.host.error === undefined
                    ? 'Checking Host registration…'
                    : `Host unavailable: ${status.host.error}`),
              status.host.accountRequired ? React.createElement('div', { className: 'dshRemoteLogin' },
                React.createElement('input', {
                  type: 'email',
                  value: email,
                  disabled: busy,
                  autoComplete: 'username',
                  placeholder: 'Server account email',
                  'aria-label': 'Server account email',
                  onChange: (event: Event) => setEmail((event.target as HTMLInputElement).value),
                }),
                React.createElement('input', {
                  type: 'password',
                  value: password,
                  disabled: busy,
                  autoComplete: 'current-password',
                  placeholder: 'Password',
                  'aria-label': 'Server account password',
                  onChange: (event: Event) => setPassword((event.target as HTMLInputElement).value),
                }),
                React.createElement('button', {
                  type: 'button',
                  disabled: busy || email.trim() === '' || password === '',
                  onClick: () => void loginHost(),
                }, busy ? 'Signing in…' : 'Sign in and register Host'),
                React.createElement('input', {
                  value: hostRegistrationCode,
                  disabled: busy,
                  autoComplete: 'one-time-code',
                  placeholder: 'Host registration code',
                  'aria-label': 'Host registration code',
                  onChange: (event: Event) => setHostRegistrationCode((event.target as HTMLInputElement).value),
                }),
                React.createElement('button', {
                  type: 'button',
                  disabled: busy || hostRegistrationCode.trim() === '',
                  onClick: () => void registerHostWithCode(),
                }, busy ? 'Registering…' : 'Use registration code')) : null)
            : null,
          error === undefined ? null : React.createElement('p', { className: 'dshRemoteError', role: 'alert' }, error)))
          : null)
    }

    function installStyle(): () => void {
      const style = document.createElement('style')
      style.dataset.pluginCss = '@dsh-remote/plugin'
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
        '.dshRemotePluginCard{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;overflow:hidden;background:var(--dsw-alias-bg-primary)}',
        '.dshRemotePluginCard.isOpen{border-color:var(--dsw-alias-border-l1)}.dshRemotePluginCardHeader{width:100%;border:0!important;border-radius:0!important;display:flex;align-items:center;gap:12px;padding:14px 16px!important;background:transparent!important;text-align:left;color:var(--dsw-alias-label-primary)!important}.dshRemotePluginCardHeader:not(:disabled){cursor:pointer}',
        '.dshRemotePluginCardHeading{display:grid;gap:3px;min-width:0;flex:1}.dshRemotePluginCardHeading>span{color:var(--dsw-alias-label-secondary);font-size:13px}.dshRemotePluginCardStatus{font-size:12px;color:var(--dsw-alias-label-secondary)}.dshRemotePluginCardChevron{font-size:18px;transition:transform .16s ease}.dshRemotePluginCard.isOpen .dshRemotePluginCardChevron{transform:rotate(180deg)}',
        '.dshRemotePluginCardBody{border-top:1px solid var(--dsw-alias-border-l3);padding:16px}.dshRemoteSettings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;max-width:720px}',
        '.dshRemoteSettingsIntro,.dshRemoteSettingsActions,.dshRemoteSettingsWide,.dshRemoteSettings>.dshRemoteError{grid-column:1/-1}.dshRemoteSettingsIntro p,.dshRemoteSettingsState{margin:5px 0 0;color:var(--dsw-alias-label-secondary);line-height:1.5}',
        '.dshRemoteAssociation{display:grid;gap:6px;color:var(--dsw-alias-label-secondary);font-size:13px}.dshRemoteAssociation strong{color:var(--dsw-alias-label-primary);font-size:15px}',
        '.dshRemoteSettings label,.dshRemoteRoleField{display:grid;gap:6px;color:var(--dsw-alias-label-secondary);font-size:13px}.dshRemoteSettings label>span:first-child,.dshRemoteRoleField>span:first-child{font-weight:600;color:var(--dsw-alias-label-primary)}',
        '.dshRemoteSettings input,.dshRemoteSettings select,.dshRemoteSettings button{min-height:38px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit}',
        '.dshRemoteRoleSwitch{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:3px!important}.dshRemoteRoleSwitch span{display:grid;place-items:center;border-radius:6px;color:var(--dsw-alias-label-secondary)}.dshRemoteRoleSwitch span.isActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}',
        '.dshRemoteSettingsActions{display:flex;align-items:center;gap:12px}.dshRemoteSettingsActions button:not(:disabled){cursor:pointer}.dshRemoteSettingsActions span{color:var(--dsw-alias-label-secondary);font-size:13px}',
        '@media(max-width:700px){.dshRemoteSettings{grid-template-columns:1fr}.dshRemoteSettingsIntro,.dshRemoteSettingsActions,.dshRemoteSettingsWide,.dshRemoteSettings>.dshRemoteError{grid-column:1}}',
      ].join('')
      document.head.append(style)
      return () => style.remove()
    }

    function apply(ctx: {
      connection: { rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<ControlResult> } }
      effect(effect: () => (() => void), label: string): void
      slots: {
        inject(name: string, factory: () => unknown): void
        register(options: Record<string, unknown>, component: unknown): unknown
      }
    }): void {
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
        if (!result.ok) throw new Error(result.error?.message ?? 'Remote mode request failed.')
        return result.value as T
      }
      ctx.effect(installStyle, 'dsh-remote: client styles')
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'dsh-remote-mode',
        order: -20,
        inject: () => ({ control }),
      }, RemoteModeAction))
      ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        id: 'dsh-remote',
        order: 30,
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
