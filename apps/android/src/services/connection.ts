import { RemoteClientCore } from '@dsh-remote/client-core'
import { AdaptiveTransport, type RtcIceServer } from '@dsh-remote/webrtc'
import { websocketUrl } from '../lib/server-url'
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
  private closeMux?: () => Promise<void>
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
    await this.close()
    this.muxHandler = onFrame
    const transport = new AdaptiveTransport(websocketUrl(baseUrl), {
      role: 'client',
      deviceId: identity.deviceId,
      accessToken,
      targetDeviceId: host.deviceId,
      forceRelay: options.forceRelay,
      preferredTransports: options.forceRelay
        ? ['relay']
        : options.preferredTransports ?? ['p2p', 'turn', 'relay'],
      fetchIceServers: options.fetchIceServers,
    })
    const secure = new SecureTransport(transport, identity, host)
    const core = new RemoteClientCore(secure, 60_000)
    this.core = core
    this.unsubscribeClose = core.onClose(() => {
      this.closeMux?.()
      this.closeMux = undefined
      this.core = undefined
      this.proxy = undefined
      options.onClose?.()
    })
    try {
      await core.connect()
      this.proxy = new RemoteApiProxy(core)
      this.closeMux = await this.proxy.openMuxStream(frame => this.muxHandler?.(frame))
    } catch (error) {
      await this.close()
      throw error
    }
  }

  /** ApiProxy tunnel client; only available while connected. */
  requireProxy(): RemoteApiProxy {
    if (this.proxy === undefined) throw new Error('Connect to the host first.')
    return this.proxy
  }

  getStats() {
    return this.core?.getStats()
  }

  async close(): Promise<void> {
    this.muxHandler = undefined
    const mux = this.closeMux
    this.closeMux = undefined
    if (mux !== undefined) await mux().catch(() => undefined)
    this.unsubscribeClose?.()
    this.unsubscribeClose = undefined
    const core = this.core
    this.core = undefined
    this.proxy = undefined
    if (core !== undefined) await core.close()
  }
}
