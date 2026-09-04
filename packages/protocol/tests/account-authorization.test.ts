import { describe, expect, it } from 'vitest'
import {
  browserAuthorizationExchangeResponseSchema,
  deviceRegistrationRequestSchema,
  deviceTokenPairSchema,
  MAX_AUTH_TOKEN_LENGTH,
  MAX_DEVICE_NAME_LENGTH,
  MAX_DEVICE_VERSION_LENGTH,
} from '../src/index.js'

const clientDevice = {
  deviceId: '0198f7c0-1234-7abc-8def-0123456789ab',
  name: 'Android phone',
  role: 'client' as const,
  platform: 'android',
  identityKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  clientVersion: '0.4.9',
}

const tokenPair = {
  accessToken: 'a'.repeat(16),
  accessTokenExpiresAt: 1,
  refreshToken: 'r'.repeat(16),
  refreshTokenExpiresAt: Number.MAX_SAFE_INTEGER,
}

describe('account authorization schemas', () => {
  it('applies device text limits to UTF-8 bytes', () => {
    expect(deviceRegistrationRequestSchema.parse({
      v: 1,
      device: { ...clientDevice, name: 'a'.repeat(MAX_DEVICE_NAME_LENGTH) },
    }).device.name).toHaveLength(MAX_DEVICE_NAME_LENGTH)
    expect(() => deviceRegistrationRequestSchema.parse({
      v: 1,
      device: { ...clientDevice, name: '界'.repeat(43) },
    })).toThrow()
    expect(() => deviceRegistrationRequestSchema.parse({
      v: 1,
      device: { ...clientDevice, clientVersion: 'v'.repeat(MAX_DEVICE_VERSION_LENGTH + 1) },
    })).toThrow()
  })

  it('enforces token lengths and safe expiration times', () => {
    expect(deviceTokenPairSchema.parse({
      ...tokenPair,
      accessToken: 'a'.repeat(MAX_AUTH_TOKEN_LENGTH),
    }).accessToken).toHaveLength(MAX_AUTH_TOKEN_LENGTH)
    expect(() => deviceTokenPairSchema.parse({ ...tokenPair, accessToken: 'a'.repeat(15) })).toThrow()
    expect(() => deviceTokenPairSchema.parse({
      ...tokenPair,
      refreshToken: 'r'.repeat(MAX_AUTH_TOKEN_LENGTH + 1),
    })).toThrow()
    expect(() => deviceTokenPairSchema.parse({
      ...tokenPair,
      refreshTokenExpiresAt: Number.MAX_SAFE_INTEGER + 1,
    })).toThrow()
  })

  it('bounds the Browser account without changing the token pair', () => {
    expect(browserAuthorizationExchangeResponseSchema.parse({
      ...tokenPair,
      account: 'a'.repeat(254),
    }).account).toHaveLength(254)
    expect(() => browserAuthorizationExchangeResponseSchema.parse({
      ...tokenPair,
      account: '界'.repeat(85),
    })).toThrow()
  })
})
