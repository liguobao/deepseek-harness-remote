import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'
import { RemoteClientCore } from '@dsh-remote/client-core'
import { generateKeyPair } from '@dsh-remote/crypto'
import { PROTOCOL_VERSION } from '@dsh-remote/protocol'
import { RelayTransport } from '@dsh-remote/webrtc'
import { SecureTransport } from '../../apps/android/src/services/secure-transport'
import type { DeviceIdentity, PairingResult, PairingStatus, RemoteDevice } from '../../apps/android/src/types'

const baseUrl = (process.env.DSH_REMOTE_HTTP_SERVER ?? 'http://127.0.0.1:8080').replace(/\/$/, '')
const code = process.env.DSH_REMOTE_PAIRING_CODE
if (code === undefined) throw new Error('DSH_REMOTE_PAIRING_CODE is required')

Object.assign(globalThis, { WebSocket })

const clientKeys = generateKeyPair()
const identity: DeviceIdentity = {
  deviceId: randomUUID(),
  name: 'Android smoke client',
  platform: 'android',
  ...clientKeys,
}
const registration = await request<{ accessToken: string }>('/api/v1/devices/register', {
  method: 'POST',
  body: JSON.stringify({
    v: PROTOCOL_VERSION,
    device: {
      deviceId: identity.deviceId,
      name: identity.name,
      role: 'client',
      platform: identity.platform,
      identityKey: identity.publicKey,
      clientVersion: '0.1.0',
    },
  }),
})
const accessToken = registration.accessToken
const claim = await request<PairingResult>('/api/v1/pairings/claim', {
  method: 'POST',
  body: JSON.stringify({
    v: PROTOCOL_VERSION,
    code: code.replace(/[^0-9A-HJKMNP-TV-Z]/gi, '').toUpperCase(),
    clientDeviceId: identity.deviceId,
  }),
}, accessToken)

for (let attempt = 0; attempt < 40; attempt += 1) {
  const status = await request<PairingStatus>(`/api/v1/pairings/${encodeURIComponent(claim.pairingId)}/status`, {}, accessToken)
  if (status.status === 'paired') break
  if (status.status === 'rejected' || status.status === 'expired') throw new Error(`Pairing ${status.status}`)
  await new Promise(resolve => setTimeout(resolve, 250))
  if (attempt === 39) throw new Error('Host did not confirm pairing')
}

const host: RemoteDevice = { ...claim.host, online: true, trusted: true }
const wsUrl = new URL('/ws/v1/connect', baseUrl)
wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'
const relay = new RelayTransport(wsUrl.toString(), {
  role: 'client',
  deviceId: identity.deviceId,
  accessToken,
  targetDeviceId: host.deviceId,
  capabilities: ['transport.relay'],
  preferredTransports: ['relay'],
})
const secure = new SecureTransport(relay, identity, host)
const client = new RemoteClientCore(secure, 5_000)
const events: string[] = []
client.onEvent(event => events.push(event.event))
await client.connect()

const sessions = await client.rpc<Array<{ id: string }>>('sessions.list', {})
if (sessions.length === 0) throw new Error('No sessions returned')
const sessionId = sessions[0]!.id
await client.rpc('session.send', { sessionId, text: 'Android encrypted smoke test' })

const deadline = Date.now() + 5_000
while (!events.includes('permission.requested') && Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 100))
}
if (!events.includes('message.delta')) throw new Error('No streaming event received')
if (!events.includes('permission.requested')) throw new Error('No permission request received')

await client.rpc('permissions.respond', { sessionId, requestId: 'perm-1', decision: 'deny' })
await client.close()
console.log(JSON.stringify({ paired: true, encryptedRelay: true, sessions: sessions.length, events }))

async function request<TResult>(path: string, init: RequestInit = {}, token?: string): Promise<TResult> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      ...init.headers,
    },
  })
  if (!response.ok) throw new Error(`${path} failed (${response.status}): ${await response.text()}`)
  return response.json() as Promise<TResult>
}
