import type { HostPluginRuntime } from '../service.js'

export function doctor(runtime: HostPluginRuntime): string {
  const state = runtime.diagnostics()
  return [
    'DSH Remote doctor',
    `Plugin: ${state.loaded ? 'loaded' : 'starting'}`,
    `Identity: ${state.identityValid ? `valid (${state.deviceId})` : 'unavailable'}`,
    `Server: ${state.serverConfigured ? 'configured' : 'not configured'}`,
    `Connection: ${state.online ? 'online' : 'offline'}`,
    `Trusted devices: ${state.trustedPeers}`,
    `Pending approvals: ${state.pendingApprovals}`,
    `Last event seq: ${state.lastSeq}`,
  ].join('\n')
}
