export interface DeviceIdentity {
  deviceId: string
  name: string
  platform: 'browser'
  publicKey: string
}

export interface Credentials {
  serverUrl: string
  deviceId: string
  account: string
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken: string
  refreshTokenExpiresAt: number
}

export interface RemoteHost {
  deviceId: string
  name: string
  platform: string
  online: boolean
  lastSeenAt?: number
  harnessVersion?: string
}
