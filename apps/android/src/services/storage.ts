import { generateKeyPair } from '@dsh-remote/crypto'
import * as Application from 'expo-application'
import * as Crypto from 'expo-crypto'
import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import type { DeviceIdentity, RemoteDevice, ServerConfig } from '../types'

const KEYS = {
  config: 'dshremote.server.v1',
  identity: 'dshremote.identity.v1',
  trustedHosts: 'dshremote.trusted-hosts.v1',
} as const

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

export async function loadServerConfig(): Promise<ServerConfig | undefined> {
  return readJson<ServerConfig>(KEYS.config)
}

export async function saveServerConfig(config: ServerConfig): Promise<void> {
  await writeJson(KEYS.config, config)
}

export async function loadOrCreateIdentity(): Promise<DeviceIdentity> {
  const stored = await readJson<DeviceIdentity>(KEYS.identity)
  if (stored !== undefined) return stored

  const keyPair = generateKeyPair(Crypto.getRandomBytes(32))
  const model = Device.modelName?.trim()
  const appId = Application.applicationId
  const identity: DeviceIdentity = {
    deviceId: Crypto.randomUUID(),
    name: model ? `${model} · DSH Remote` : 'Android · DSH Remote',
    platform: 'android',
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  }
  if (appId === null) identity.name = model ?? 'Android phone'
  await writeJson(KEYS.identity, identity)
  return identity
}

export async function loadTrustedHosts(): Promise<RemoteDevice[]> {
  return (await readJson<RemoteDevice[]>(KEYS.trustedHosts)) ?? []
}

export async function trustHost(host: RemoteDevice): Promise<void> {
  const hosts = await loadTrustedHosts()
  const next = [...hosts.filter(item => item.deviceId !== host.deviceId), { ...host, trusted: true }]
  await writeJson(KEYS.trustedHosts, next)
}

export async function forgetHost(deviceId: string): Promise<void> {
  const hosts = await loadTrustedHosts()
  await writeJson(KEYS.trustedHosts, hosts.filter(host => host.deviceId !== deviceId))
}

export async function clearLocalData(): Promise<void> {
  await Promise.all(Object.values(KEYS).map(key => SecureStore.deleteItemAsync(key, secureOptions)))
}

async function readJson<T>(key: string): Promise<T | undefined> {
  const value = await SecureStore.getItemAsync(key, secureOptions)
  if (value === null) return undefined
  try {
    return JSON.parse(value) as T
  } catch {
    await SecureStore.deleteItemAsync(key, secureOptions)
    return undefined
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value), secureOptions)
}
