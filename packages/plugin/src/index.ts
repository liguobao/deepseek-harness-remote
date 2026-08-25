import type { Context } from '@deepseek-ai/cordis'
import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy/api'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import { ClientModeRuntime, type HostConnectionHandle } from './client-runtime.js'
import { Config, resolveConfig, type Config as ConfigInput, type ResolvedConfig } from './config.js'
import { PluginControlRuntime } from './control-runtime.js'
import { IdentityStore, serverStorageDirectory } from './identity-store.js'
import { SafeLogger } from './logging.js'
import { HostPluginRuntime } from './service.js'
import { ClientServerApi } from './server-api.js'
import { ServerCredentialStore } from './server-credentials.js'
import type { TypertGatewayLike } from './harness-api-bridge.js'
import { TypertGatewaySwitch } from './typert-gateway-switch.js'
import type { FileViewerHostServiceLike } from './file-viewer-bridge.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    dshRemote: HostPluginRuntime
    dshRemoteClient: ClientModeRuntime
    typertGateway: TypertGatewayLike
  }
}

export const name = 'ds-harness-remote'
export { Config }

export function apply(ctx: Context, input: ConfigInput = {}): void {
  ctx.inject(['settings', 'apiProxy', 'connection', 'typertGateway'], runtimeContext => activate(runtimeContext, input))
}

async function activate(ctx: Context, input: ConfigInput): Promise<void> {
  const settings = ctx.get('settings')
  const settingsScope: SettingsScope<ConfigInput> | undefined = settings?.register(settingsNamespace('ds-harness-remote'), Config, {
    base: input,
    applies: 'restart',
    validate: value => { resolveConfig(value) },
  })
  const config: ResolvedConfig = resolveConfig(settingsScope?.get() ?? input)
  if (!config.enabled) return
  // Mirrors SafeLogger output to the process stdout/stderr as well as the DSH
  // logger: the web process stdout is captured by the Desktop shell into
  // desktop.log, so remote RPC/transport diagnostics stay greppable there.
  const logger = new SafeLogger({
    debug: message => { ctx.logger.debug(message); console.debug(message) },
    info: message => { ctx.logger.info(message); console.info(message) },
    warn: message => { ctx.logger.warn(message); console.warn(message) },
    error: message => { ctx.logger.error(message); console.error(message) },
  }, config.logLevel)
  const defaultIdentityDirectory = new IdentityStore().directory
  const hostIdentities = new IdentityStore({
    directory: config.serverUrl === undefined
      ? defaultIdentityDirectory
      : serverStorageDirectory(defaultIdentityDirectory, config.serverUrl, 'host'),
  })
  const apiProxy = ctx.get('apiProxy') as ApiProxy
  const connection = ctx.get('connection') as HostConnectionHandle | undefined
  // The official Typert gateway (`typertGateway` from dsh-api-gateway) is the
  // dispatch path behind `/api/commands/*` on the host. It is an explicit
  // activation dependency so a peer bridge never silently omits commands.
  const nativeTypertGateway = ctx.get('typertGateway') as TypertGatewayLike
  const localTypertGateway = new TypertGatewaySwitch(nativeTypertGateway).local()
  const runtime = new HostPluginRuntime(
    config,
    hostIdentities,
    apiProxy,
    logger,
    () => localTypertGateway,
    () => ctx.get('fileViewerHost') as FileViewerHostServiceLike | undefined,
  )

  let clientRuntime: ClientModeRuntime | undefined
  const hostControl = runtime
  if (config.serverUrl !== undefined && apiProxy !== undefined && connection !== undefined) {
    const clientIdentities = new IdentityStore({
      directory: serverStorageDirectory(defaultIdentityDirectory, config.serverUrl, 'client'),
    })
    clientRuntime = new ClientModeRuntime(
      config,
      clientIdentities,
      new ClientServerApi(config.serverUrl, new ServerCredentialStore(clientIdentities.directory)),
      apiProxy,
      nativeTypertGateway,
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
    const disposeControl = controlRuntime?.register(connection!)
    try {
      await runtime.start()
      if (clientRuntime !== undefined) {
        await clientRuntime.start()
      } else {
        logger.warn('client remote mode is unavailable', {
          serverConfigured: config.serverUrl !== undefined,
          apiProxyAvailable: apiProxy !== undefined,
          connectionAvailable: connection !== undefined,
        })
      }
    } catch (error) {
      await disposeControl?.()
      await clientRuntime?.close()
      await runtime.close()
      throw error
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
export type { PeerConnectionContext, RpcRouterFactory } from './connection-controller.js'
export { fingerprint, IdentityInvalidError, IdentityStore } from './identity-store.js'
export { serverStorageDirectory } from './identity-store.js'
export type { HostIdentity, RemoteDeviceRole, TrustedPeer } from './identity-store.js'
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
export { RemoteFileViewerBridge } from './file-viewer-bridge.js'
export { createRemoteFileContentProvider } from './remote-file-content-provider.js'
export { TypertGatewaySwitch } from './typert-gateway-switch.js'
export type { AuthenticatedPeerChannel } from './types.js'
