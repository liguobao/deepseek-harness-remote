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
  hostPairingAvailable: boolean
}

interface RemoteDevice {
  deviceId: string
  name: string
  platform: string
  online: boolean
}

interface HostPairingClaim {
  pairingId: string
  client: { name: string; fingerprint: string }
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

    function RemoteModeAction(props: {
      wide: boolean
      control: <T>(endpoint: string, payload?: unknown) => Promise<T>
    }): unknown {
      const [open, setOpen] = React.useState(false)
      const [status, setStatus] = React.useState<RemoteStatus | undefined>(undefined)
      const [devices, setDevices] = React.useState<RemoteDevice[]>([])
      const [code, setCode] = React.useState('')
      const [pendingPairing, setPendingPairing] = React.useState<string | undefined>(undefined)
      const [pendingHost, setPendingHost] = React.useState<{ name: string; fingerprint: string } | undefined>(undefined)
      const [hostCode, setHostCode] = React.useState<string | undefined>(undefined)
      const [hostClaims, setHostClaims] = React.useState<HostPairingClaim[]>([])
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

      const refreshHostClaims = async (): Promise<void> => {
        setHostClaims(await props.control<HostPairingClaim[]>('host.pairings').catch(() => []))
      }

      React.useEffect(() => {
        void refresh().catch(reason => {
          setError(messageOf(reason))
          setSupported(false)
        })
      }, [])

      React.useEffect(() => {
        if (pendingPairing === undefined) return
        const timer = window.setInterval(() => {
          void props.control<{ status: string }>('pairing.status', { pairingId: pendingPairing }).then(result => {
            if (result.status === 'paired') {
              setPendingPairing(undefined)
              setPendingHost(undefined)
              void refresh()
            }
            if (result.status === 'rejected' || result.status === 'expired') {
              setPendingPairing(undefined)
              setPendingHost(undefined)
              setError(`Pairing ${result.status}.`)
            }
          }).catch(reason => setError(messageOf(reason)))
        }, 1200)
        return () => window.clearInterval(timer)
      }, [pendingPairing])

      React.useEffect(() => {
        if (!open) return
        void refreshHostClaims()
        const timer = window.setInterval(() => { void refreshHostClaims() }, 1500)
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

      const pair = async (): Promise<void> => {
        if (code.trim() === '') return
        setBusy(true)
        setError(undefined)
        try {
          const claim = await props.control<{ pairingId: string; host: { name: string; fingerprint: string } }>('pairing.claim', { code: code.trim() })
          setPendingPairing(claim.pairingId)
          setPendingHost(claim.host)
          setCode('')
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const createHostPairing = async (): Promise<void> => {
        setBusy(true)
        setError(undefined)
        try {
          const result = await props.control<{ code: string }>('host.pairing.create')
          setHostCode(result.code)
        } catch (reason) {
          setError(messageOf(reason))
        } finally {
          setBusy(false)
        }
      }

      const confirmHostPairing = async (pairingId: string, decision: 'approve' | 'deny'): Promise<void> => {
        setBusy(true)
        setError(undefined)
        try {
          await props.control('host.pairing.confirm', { pairingId, decision })
          await refreshHostClaims()
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
            ? React.createElement('p', null, 'No paired remote Host.')
            : devices.map(device => React.createElement('button', {
              type: 'button',
              key: device.deviceId,
              disabled: busy || !device.online || status?.target?.deviceId === device.deviceId,
              onClick: () => void switchMode('remote', device.deviceId),
            }, `${device.name} · ${device.online ? 'Online' : 'Offline'}`))),
          React.createElement('div', { className: 'dshRemotePair' },
            React.createElement('input', {
              value: code,
              disabled: busy || pendingPairing !== undefined,
              placeholder: 'Pairing code',
              'aria-label': 'Pairing code',
              onChange: (event: Event) => setCode((event.target as HTMLInputElement).value),
            }),
            React.createElement('button', {
              type: 'button',
              disabled: busy || pendingPairing !== undefined || code.trim() === '',
              onClick: () => void pair(),
            }, pendingPairing === undefined ? 'Pair' : 'Waiting for Host…')),
          pendingHost === undefined ? null : React.createElement('p', { className: 'dshRemoteFingerprint' },
            `Verify on the Host: ${pendingHost.name} · ${pendingHost.fingerprint}`),
          status?.hostPairingAvailable ? React.createElement('div', { className: 'dshRemoteHostPairing' },
            React.createElement('button', {
              type: 'button',
              disabled: busy,
              onClick: () => void createHostPairing(),
            }, hostCode === undefined ? 'Pair another client to this Host' : `Code: ${hostCode}`),
            ...hostClaims.map(claim => React.createElement('div', { className: 'dshRemoteClaim', key: claim.pairingId },
              React.createElement('span', null, `${claim.client.name} · ${claim.client.fingerprint}`),
              React.createElement('button', { type: 'button', disabled: busy, onClick: () => void confirmHostPairing(claim.pairingId, 'approve') }, 'Approve'),
              React.createElement('button', { type: 'button', disabled: busy, onClick: () => void confirmHostPairing(claim.pairingId, 'deny') }, 'Deny')))) : null,
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
        '.dshRemotePair{display:grid;grid-template-columns:1fr auto;gap:8px}.dshRemoteError{margin:0;color:var(--dsw-alias-state-danger,#c33)}',
        '.dshRemoteHostPairing{display:grid;gap:8px;border-top:1px solid var(--dsw-alias-border-l3);padding-top:12px}.dshRemoteClaim{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:6px;font-size:13px}',
        '.dshRemoteFingerprint{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
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
        const result = await ctx.connection.rpc.call('/remote', endpoint, payload)
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
    }

    function messageOf(reason: unknown): string { return reason instanceof Error ? reason.message : String(reason) }

    module.exports.apply = apply
    module.exports.inject = inject
    return module.exports
  },
})
