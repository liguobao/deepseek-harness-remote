import type { Context } from '@deepseek-ai/cordis'
import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy/api'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import { ClientModeRuntime, type HostConnectionHandle } from './client-runtime.js'
import { Config, resolveConfig, type Config as ConfigInput } from './config.js'
import { PluginControlRuntime } from './control-runtime.js'
import { IdentityStore, serverStorageDirectory } from './identity-store.js'
import { SafeLogger } from './logging.js'
import { HostPluginRuntime } from './service.js'
import { ClientServerApi } from './server-api.js'
import { ServerCredentialStore } from './server-credentials.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    dshRemote: HostPluginRuntime
    dshRemoteClient: ClientModeRuntime
  }
}

export const name = 'dsh-remote'
export { Config }

export function apply(ctx: Context, input: ConfigInput = {}): void {
  ctx.inject(['settings', 'apiProxy', 'connection'], runtimeContext => activate(runtimeContext, input))
}

async function activate(ctx: Context, input: ConfigInput): Promise<void> {
  const settings = ctx.get('settings')
  const settingsScope: SettingsScope<ConfigInput> | undefined = settings?.register(settingsNamespace('dsh-remote'), Config, {
    base: input,
    applies: 'restart',
    validate: value => { resolveConfig(value) },
  })
  const config = resolveConfig(settingsScope?.get() ?? input)
  if (!config.enabled) return
  const logger = new SafeLogger(ctx.logger, config.logLevel)
  const defaultIdentityDirectory = new IdentityStore().directory
  const hostIdentities = new IdentityStore({
    directory: config.serverUrl === undefined
      ? defaultIdentityDirectory
      : serverStorageDirectory(defaultIdentityDirectory, config.serverUrl, 'host'),
  })
  const apiProxy = ctx.get('apiProxy') as ApiProxy
  const connection = ctx.get('connection') as HostConnectionHandle | undefined
  const hostConfig = config.role === 'client' ? { ...config, serverUrl: undefined } : config
  const runtime = new HostPluginRuntime(hostConfig, hostIdentities, apiProxy, logger)

  let clientRuntime: ClientModeRuntime | undefined
  const hostControl = config.role === 'client' ? undefined : runtime
  if (config.role !== 'host' && config.serverUrl !== undefined && apiProxy !== undefined && connection !== undefined) {
    const clientIdentities = new IdentityStore({
      directory: serverStorageDirectory(defaultIdentityDirectory, config.serverUrl, 'client'),
    })
    clientRuntime = new ClientModeRuntime(
      config,
      clientIdentities,
      new ClientServerApi(config.serverUrl, new ServerCredentialStore(clientIdentities.directory)),
      apiProxy,
      logger,
      hostControl,
    )
  }

  const controlRuntime = connection === undefined
    ? undefined
    : new PluginControlRuntime(config, defaultIdentityDirectory, settingsScope, clientRuntime, hostControl)

  ctx.provide('dshRemote', runtime)
  if (clientRuntime !== undefined) ctx.provide('dshRemoteClient', clientRuntime)
  await ctx.effect(async () => {
    await runtime.start()
    const disposeControl = controlRuntime?.register(connection!)
    if (clientRuntime !== undefined) {
      await clientRuntime.start()
    } else if (config.role !== 'host') {
      logger.warn('client remote mode is unavailable', {
        serverConfigured: config.serverUrl !== undefined,
        apiProxyAvailable: apiProxy !== undefined,
        connectionAvailable: connection !== undefined,
      })
    }
    return async () => {
      await disposeControl?.()
      await clientRuntime?.close()
      await runtime.close()
    }
  }, 'dsh-remote lifecycle')
}

export type { ResolvedConfig } from './config.js'
export { resolveConfig } from './config.js'
export { ConnectionController, ConnectionRejectedError } from './connection-controller.js'
export { fingerprint, IdentityInvalidError, IdentityStore } from './identity-store.js'
export { serverStorageDirectory } from './identity-store.js'
export type { HostIdentity, RemoteDeviceRole, TrustedPeer } from './identity-store.js'
export { PairingController, PairingError } from './pairing-controller.js'
export type { PairingClaim, PairingServer } from './pairing-controller.js'
export { ClientServerApi, HostServerApi, ServerApiError } from './server-api.js'
export { HostServerConnection } from './server-connection.js'
export type { WebSocketFactory } from './server-connection.js'
export { ServerCredentialStore, ServerCredentialsInvalidError } from './server-credentials.js'
export type { ServerCredentials } from './server-credentials.js'
export { HOST_CAPABILITIES, RpcError, RpcRouter } from './rpc-router.js'
export { HostPluginRuntime } from './service.js'
export { ApiProxySwitch } from './api-proxy-switch.js'
export { ClientModeError, ClientModeRuntime } from './client-runtime.js'
export { PluginControlRuntime } from './control-runtime.js'
export { ClientSecureTransport } from './client-secure-transport.js'
export { HARNESS_API_ALLOWLIST, HarnessApiBridge } from './harness-api-bridge.js'
export { RemoteHarnessApiProxy } from './remote-api-proxy.js'
export type { AuthenticatedPeerChannel } from './types.js'
