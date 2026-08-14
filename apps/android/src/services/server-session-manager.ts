import type { DeviceCredentials, DeviceIdentity } from '../types'
import { RemoteServerApi } from './api'

type TokenPair = Omit<DeviceCredentials, 'deviceId' | 'serverUrl'>

export interface AuthenticatedServer {
  api: RemoteServerApi
  credentials: DeviceCredentials
}

export interface CredentialPersistence {
  load(serverUrl: string, deviceId: string): Promise<DeviceCredentials | undefined>
  save(credentials: DeviceCredentials): Promise<void>
}

export type ApiFactory = (baseUrl: string, accessToken?: string) => RemoteServerApi

export class ServerSessionManager {
  private readonly inFlight = new Map<string, Promise<AuthenticatedServer>>()

  constructor(
    private readonly persistence: CredentialPersistence,
    private readonly apiFactory: ApiFactory,
  ) {}

  authenticate(baseUrl: string, identity: DeviceIdentity): Promise<AuthenticatedServer> {
    const key = `${baseUrl}\0${identity.deviceId}`
    const pending = this.inFlight.get(key)
    if (pending !== undefined) return pending

    const created = this.authenticateOnce(baseUrl, identity).finally(() => {
      if (this.inFlight.get(key) === created) this.inFlight.delete(key)
    })
    this.inFlight.set(key, created)
    return created
  }

  private async authenticateOnce(baseUrl: string, identity: DeviceIdentity): Promise<AuthenticatedServer> {
    const now = Date.now()
    let credentials = await this.persistence.load(baseUrl, identity.deviceId)
    if (credentials === undefined || credentials.accessTokenExpiresAt <= now + 30_000) {
      const publicApi = this.apiFactory(baseUrl)
      let tokens: TokenPair
      if (credentials !== undefined && credentials.refreshTokenExpiresAt > now + 30_000) {
        tokens = await publicApi.refreshToken(identity.deviceId, credentials.refreshToken)
      } else {
        // The Server treats registration with the same deviceId and identity key
        // as idempotent, while still rejecting revoked or key-mismatched devices.
        tokens = await publicApi.registerDevice(identity)
      }
      credentials = { ...tokens, deviceId: identity.deviceId, serverUrl: baseUrl }
      await this.persistence.save(credentials)
    }
    return {
      api: this.apiFactory(baseUrl, credentials.accessToken),
      credentials,
    }
  }
}
