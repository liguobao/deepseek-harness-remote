import { RemoteClientCore } from '@dsh-remote/client-core'
import { AdaptiveTransport, type RtcIceServer } from '@dsh-remote/webrtc'
import { websocketUrl } from '../lib/server-url'
import { strings } from '../locales/i18n'
import type { DeviceIdentity, MuxStreamFrame, RemoteDevice } from '../types'
import { RemoteApiProxy } from './api-proxy'
import { SecureTransport } from './secure-transport'

export type MuxFrameHandler = (frame: MuxStreamFrame) => void
export type CloseHandler = () => void

export interface AndroidConnectionOptions {
  preferredTransports?: Array<'lan' | 'p2p' | 'turn' | 'relay'>
  forceRelay?: boolean
  fetchIceServers?: (connectionId: string) => Promise<RtcIceServer[]>
  onClose?: CloseHandler
}

export class AndroidRemoteConnection {
  private core?: RemoteClientCore
  private proxy?: RemoteApiProxy
  private closeMux?: (notifyRemote?: boolean) => Promise<void>
  private unsubscribeClose?: () => void
  private muxHandler?: MuxFrameHandler

  async connect(
    baseUrl: string,
    identity: DeviceIdentity,
    host: RemoteDevice,
    accessToken: string,
    onFrame: MuxFrameHandler,
    options: AndroidConnectionOptions = {},
  ): Promise<void> {
    // Replacing a connection must not wait for a graceful stream-close RPC:
    // the old data path may be exactly what is being recovered from.
    await this.close()
    this.muxHandler = onFrame
    let webRtcFallback = false
    let replacingFallback = false
    const createTransport = (relayOnly: boolean) => new AdaptiveTransport(websocketUrl(baseUrl), {
      role: 'client',
      deviceId: identity.deviceId,
      accessToken,
      targetDeviceId: host.deviceId,
      forceRelay: options.forceRelay || relayOnly,
      preferredTransports: options.forceRelay || relayOnly
        ? ['relay']
        : options.preferredTransports ?? ['lan', 'p2p', 'turn', 'relay'],
      fetchIceServers: options.fetchIceServers,
      onWebRtcFallback: error => {
        webRtcFallback = true
        // Do not include credentials, SDP, prompts, or tunnel payloads.
        console.warn('[dsh-remote] WebRTC fallback:', error.message)
      },
    })
    const connectCore = async (relayOnly: boolean) => {
      const transport = createTransport(relayOnly)
      // Host-side ApiProxy calls are capped at 30s. Leave a small delivery
      // margin, then treat silence as an unhealthy business channel.
      const core = new RemoteClientCore(new SecureTransport(transport, identity, host), 35_000)
      this.core = core
      this.unsubscribeClose = core.onClose(() => {
        // A late close from a replaced connection must not tear down the new
        // connection that may already be stored on this instance.
        if (this.core !== core) return
        void this.closeMux?.(false)
        this.closeMux = undefined
        this.core = undefined
        this.proxy = undefined
        if (!replacingFallback) options.onClose?.()
      })
      await core.connect()
      return core
    }
    try {
      let core = await connectCore(false)
      // Mirror the Desktop plugin: Hosts that accepted a WebRTC offer before
      // the client fell back can later close that logical Relay connection.
      // A new relay-only connection ID prevents that stale RTC state leaking
      // into the working fallback channel.
      if (webRtcFallback) {
        replacingFallback = true
        await core.close()
        this.unsubscribeClose?.()
        this.unsubscribeClose = undefined
        this.core = undefined
        replacingFallback = false
        webRtcFallback = false
        core = await connectCore(true)
      }
      this.proxy = new RemoteApiProxy(core)
      this.closeMux = await this.proxy.openMuxStream(frame => this.muxHandler?.(frame))
    } catch (error) {
      await this.close()
      throw error
    }
  }

  /** ApiProxy tunnel client; only available while connected. */
  requireProxy(): RemoteApiProxy {
    if (this.proxy === undefined) throw new Error(strings.runtime.connectHostFirst)
    return this.proxy
  }

  getStats() {
    return this.core?.getStats()
  }

  async close(): Promise<void> {
    this.muxHandler = undefined
    const mux = this.closeMux
    this.closeMux = undefined
    // Closing the whole transport makes a remote stream-close redundant.
    // Only remove the local subscription here so a half-open RTC path cannot
    // add another RPC timeout before recovery begins.
    if (mux !== undefined) await mux(false).catch(() => undefined)
    this.unsubscribeClose?.()
    this.unsubscribeClose = undefined
    const core = this.core
    this.core = undefined
    this.proxy = undefined
    if (core !== undefined) await core.close()
  }
}
