import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-user-approval'
import type { WorkspaceRegistry } from '@deepseek-ai/dsh-workspace'
import { Config, resolveConfig, type Config as ConfigInput } from './config.js'
import { IdentityStore } from './identity-store.js'
import { SafeLogger } from './logging.js'
import { HostPluginRuntime, type RuntimeDependencies } from './service.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    dshRemote: HostPluginRuntime
  }
}

export const name = 'dsh-remote'
export const inject = ['sessions', 'agents', 'approval']
export { Config }

export async function apply(ctx: Context, input: ConfigInput = {}): Promise<void> {
  const config = resolveConfig(input)
  if (!config.enabled) return
  const logger = new SafeLogger(ctx.logger, config.logLevel)
  const runtime = new HostPluginRuntime(config, new IdentityStore(), {
    sessions: ctx.sessions,
    agents: ctx.agents,
    workspaceRegistry: ctx.get('workspaceRegistry') as WorkspaceRegistry | undefined,
    sessionTitle: ctx.get('sessionTitle') as RuntimeDependencies['sessionTitle'],
  }, logger)

  ctx.provide('dshRemote', runtime)
  ctx.on('session/created', session => runtime.onSessionCreated(session))
  ctx.on('session/event', (session, event) => runtime.onSessionEvent(session, event))
  ctx.on('agent/status', ({ agent, status }) => runtime.onAgentStatus(agent, status))
  ctx.on('approval/request', (request, next) => runtime.answerApproval(request, next), { prepend: true })
  await ctx.effect(async () => {
    await runtime.start()
    return async () => runtime.close()
  }, 'dsh-remote lifecycle')
}

export type { ResolvedConfig } from './config.js'
export { resolveConfig } from './config.js'
export { ConnectionController, ConnectionRejectedError } from './connection-controller.js'
export { EventSequencer, FullResyncRequiredError } from './event-sequencer.js'
export { fingerprint, IdentityInvalidError, IdentityStore } from './identity-store.js'
export type { HostIdentity, TrustedPeer } from './identity-store.js'
export { PairingController, PairingError } from './pairing-controller.js'
export type { PairingClaim, PairingServer } from './pairing-controller.js'
export { HostServerApi, ServerApiError } from './server-api.js'
export { HostServerConnection } from './server-connection.js'
export type { WebSocketFactory } from './server-connection.js'
export { ServerCredentialStore, ServerCredentialsInvalidError } from './server-credentials.js'
export type { ServerCredentials } from './server-credentials.js'
export { PendingApprovals } from './pending-approvals.js'
export { HOST_CAPABILITIES, RpcError, RpcRouter } from './rpc-router.js'
export { HostPluginRuntime } from './service.js'
export type { AuthenticatedPeerChannel, RemotePermissionRequest, RemoteSessionSummary, SessionSnapshot } from './types.js'
