import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'
import {
  NoiseIkSession,
  createNoisePrologue,
  fromBase64Url,
  generateKeyPair,
  identityFingerprint,
  toBase64Url,
} from '@dsh-remote/crypto'
import {
  PROTOCOL_VERSION,
  createControlFrame,
  createMessage,
  createRpcError,
  createRpcResponse,
  decodeMessage,
  encodeMessage,
  parseControlFrame,
  type ConnectIncomingPayload,
  type DeviceDescriptor,
  type RelayPayload,
  type RemoteMessage,
  type SecureHandshakePayload,
} from '@dsh-remote/protocol'

const server = process.env.DSH_REMOTE_SERVER ?? 'ws://127.0.0.1:8080/ws/v1/connect'
const deviceId = process.env.DSH_REMOTE_DEVICE_ID ?? randomUUID()
const keyPair = generateKeyPair()
const trustedPeers = new Map<string, string>()
const connections = new Map<string, {
  clientDeviceId: string
  noise: NoiseIkSession
}>()
const sessions = [
  { id: 's1', title: 'Fix OAuth issue', cwd: '~/Projects/foo', running: false, updatedAt: Date.now() },
]

const accessToken = process.env.DSH_REMOTE_TOKEN ?? (await registerDevice()).accessToken
const socket = new WebSocket(server)
let pairingCreated = false

socket.on('open', () => {
  sendControl('hello', {
    role: 'host',
    deviceId,
    accessToken,
    protocols: [PROTOCOL_VERSION],
    clientVersion: '0.1.0',
    capabilities: ['transport.relay'],
  })
})

socket.on('message', raw => {
  void handleControl(raw.toString()).catch(error => {
    console.error(`[mock-host] ${error instanceof Error ? error.message : 'invalid control frame'}`)
    socket.close(1008, 'protocol error')
  })
})

socket.on('close', () => console.log('[mock-host] disconnected'))
socket.on('error', error => console.error(`[mock-host] websocket error: ${error.message}`))

async function handleControl(raw: string): Promise<void> {
  const frame = parseControlFrame(JSON.parse(raw))
  if (frame.type === 'hello.ack') {
    if (pairingCreated) return
    pairingCreated = true
    console.log(`[mock-host] connected to ${server}`)
    await createPairing()
    return
  }
  if (frame.type === 'connect.incoming') {
    acceptConnection(frame.payload)
    return
  }
  if (frame.type === 'secure.handshake') {
    handleHandshake(frame.payload)
    return
  }
  if (frame.type === 'relay') {
    await handleRelay(frame.payload)
    return
  }
  if (frame.type === 'ping') sendControl('pong', frame.payload)
  if (frame.type === 'error') {
    const payload = asRecord(frame.payload)
    throw new Error(typeof payload.message === 'string' ? payload.message : 'Server returned a control error')
  }
}

async function confirmPairing(value: unknown): Promise<void> {
  const payload = asRecord(value)
  const pairingId = stringField(payload, 'pairingId')
  const client = asRecord(payload.client)
  const clientDeviceId = stringField(client, 'deviceId')
  const identityKey = stringField(client, 'identityKey')
  const clientFingerprint = typeof payload.clientFingerprint === 'string'
    ? payload.clientFingerprint
    : typeof client.fingerprint === 'string' ? client.fingerprint : identityFingerprint(identityKey)
  if (normalizeFingerprint(clientFingerprint) !== identityFingerprint(identityKey)) {
    throw new Error('Pairing claim fingerprint does not match the client identity key')
  }
  console.log(`[mock-host] pairing claim from ${clientDeviceId} (${clientFingerprint})`)
  if (process.env.DSH_REMOTE_AUTO_CONFIRM === 'false') {
    console.log('[mock-host] auto-confirm is disabled; the pairing remains pending')
    return
  }
  trustedPeers.set(clientDeviceId, identityKey)
  try {
    await apiRequest('/api/v1/pairings/confirm', {
      method: 'POST',
      body: JSON.stringify({
        v: PROTOCOL_VERSION,
        pairingId,
        decision: 'approve',
        clientDeviceId,
        clientFingerprint,
      }),
    })
  } catch (error) {
    trustedPeers.delete(clientDeviceId)
    throw error
  }
  console.log(`[mock-host] approved client ${clientDeviceId}`)
}

function acceptConnection(value: unknown): void {
  const payload = value as Partial<ConnectIncomingPayload>
  if (typeof payload.connectionId !== 'string' || typeof payload.clientDeviceId !== 'string' || typeof payload.clientIdentityKey !== 'string') {
    throw new Error('Invalid connect.incoming payload')
  }
  if (!payload.preferredTransports?.includes('relay')) {
    sendControl('connect.rejected', {
      connectionId: payload.connectionId,
      targetDeviceId: payload.clientDeviceId,
      code: 'NO_COMMON_TRANSPORT',
      message: 'Mock Host supports Relay only.',
    })
    return
  }
  const trustedKey = trustedPeers.get(payload.clientDeviceId)
  if (trustedKey !== payload.clientIdentityKey) {
    sendControl('connect.rejected', {
      connectionId: payload.connectionId,
      code: 'PEER_IDENTITY_MISMATCH',
      message: 'Client identity does not match the locally trusted peer.',
    })
    return
  }
  connections.set(payload.connectionId, {
    clientDeviceId: payload.clientDeviceId,
    noise: new NoiseIkSession({
      role: 'responder',
      localPrivateKey: keyPair.privateKey,
      localPublicKey: keyPair.publicKey,
      remotePublicKey: trustedKey,
      prologue: createNoisePrologue(payload.connectionId, deviceId, payload.clientDeviceId),
    }),
  })
  sendControl('connect.accepted', { connectionId: payload.connectionId })
}

function handleHandshake(value: unknown): void {
  const payload = value as Partial<SecureHandshakePayload>
  const connectionId = payload.connectionId
  const connection = typeof connectionId === 'string' ? connections.get(connectionId) : undefined
  if (typeof connectionId !== 'string'
    || connection === undefined
    || payload.targetDeviceId !== deviceId
    || payload.step !== 1
    || typeof payload.data !== 'string'
    || connection.noise.complete) {
    throw new Error('Invalid Noise IK handshake frame')
  }
  connection.noise.readHandshake(fromBase64Url(payload.data))
  const reply = connection.noise.writeHandshake()
  if (!connection.noise.complete) throw new Error('Noise IK handshake did not complete')
  sendControl('secure.handshake', {
    connectionId,
    targetDeviceId: connection.clientDeviceId,
    step: 2,
    data: toBase64Url(reply),
  } satisfies SecureHandshakePayload)
}

async function handleRelay(value: unknown): Promise<void> {
  const relay = value as Partial<RelayPayload>
  if (typeof relay.connectionId !== 'string' || relay.targetDeviceId !== deviceId || typeof relay.ciphertext !== 'string') {
    throw new Error('Invalid relay payload')
  }
  const connection = connections.get(relay.connectionId)
  if (connection === undefined || !connection.noise.complete) throw new Error('Relay frame belongs to an unauthorized connection')
  if (!Number.isSafeInteger(relay.counter) || relay.counter !== Number(connection.noise.receivingCounter())) {
    throw new Error('Rejected replayed or out-of-order Relay frame')
  }
  const payload = connection.noise.decrypt(fromBase64Url(relay.ciphertext))
  const message = decodeMessage(payload)
  if (message.type !== 'rpc.request') return
  const request = message as LegacyRpcRequest
  try {
    await handleRpc(request, relay.connectionId)
  } catch (error) {
    sendMessage(createRpcError(request.id, 'MOCK_HOST_ERROR', error instanceof Error ? error.message : 'Mock Host failure'), relay.connectionId)
  }
}

type LegacyRpcRequest = RemoteMessage<{ method: string; params: unknown }>

async function handleRpc(request: LegacyRpcRequest, connectionId: string): Promise<void> {
  const { method, params } = request.payload
  if (method === 'system.info') return send(request.id, {
    deviceId,
    deviceName: 'Mock Harness Host',
    os: process.platform,
    hostname: 'mock-host',
    harnessVersion: 'dev-preview',
    pluginVersion: '0.1.0',
    online: true,
    connectionMode: 'Relay',
    capabilities: ['sessions.list', 'session.send', 'session.streaming', 'permission.allow-once', 'permission.deny'],
  }, connectionId)
  if (method === 'workspace.get') return send(request.id, { cwd: '~/Projects/foo', name: 'foo' }, connectionId)
  if (method === 'sessions.list') return send(request.id, sessions, connectionId)
  if (method === 'sessions.get') return send(request.id, { ...sessions[0], messages: [] }, connectionId)
  if (method === 'sessions.create') {
    const session = { id: `s${sessions.length + 1}`, title: 'New remote session', cwd: '~/Projects/foo', running: false, updatedAt: Date.now() }
    sessions.push(session)
    sendMessage(createMessage('event', { event: 'session.created', data: session }), connectionId)
    return send(request.id, session, connectionId)
  }
  if (method === 'session.send') {
    const { sessionId, text } = params as { sessionId: string; text: string }
    send(request.id, { accepted: true }, connectionId)
    sendMessage(createMessage('event', { event: 'message.created', data: { sessionId, role: 'user', text } }), connectionId)
    for (const delta of ['我先检查相关上下文。', '这是 mock host 的 streaming 输出。']) {
      await new Promise(resolve => setTimeout(resolve, 350))
      sendMessage(createMessage('event', { event: 'message.delta', data: { sessionId, messageId: 'm-assistant', delta } }), connectionId)
    }
    sendMessage(createMessage('event', {
      event: 'permission.requested',
      data: {
        requestId: 'perm-1',
        sessionId,
        permission: { kind: 'command', command: 'npm test', cwd: '~/Projects/foo' },
      },
    }), connectionId)
    return
  }
  if (method === 'permissions.respond') return send(request.id, { accepted: true, requestId: (params as { requestId?: unknown }).requestId }, connectionId)
  if (method === 'connection.ping') return send(request.id, { pong: true, now: Date.now() }, connectionId)
  sendMessage(createRpcError(request.id, 'METHOD_NOT_FOUND', `Unknown method ${method}`), connectionId)
}

function send(requestId: string, result: unknown, connectionId: string): void {
  sendMessage(createRpcResponse(requestId, result), connectionId)
}

function sendMessage(message: RemoteMessage, connectionId: string): void {
  const connection = connections.get(connectionId)
  if (connection === undefined || !connection.noise.complete) throw new Error('Cannot send on an unauthorized connection')
  const ciphertext = connection.noise.encrypt(encodeMessage(message))
  const counter = Number(connection.noise.sendingCounter() - 1n)
  if (!Number.isSafeInteger(counter) || counter < 0) throw new Error('Noise transport counter overflowed')
  sendControl('relay', {
    connectionId,
    targetDeviceId: connection.clientDeviceId,
    counter,
    ciphertext: toBase64Url(ciphertext),
  } satisfies RelayPayload)
}

async function registerDevice(): Promise<{ accessToken: string }> {
  const device: DeviceDescriptor = {
    deviceId,
    name: 'Mock Harness Host',
    role: 'host',
    platform: process.platform,
    identityKey: keyPair.publicKey,
    clientVersion: '0.1.0',
    harnessVersion: 'dev-preview',
  }
  return apiRequest('/api/v1/devices/register', {
    method: 'POST',
    body: JSON.stringify({ v: PROTOCOL_VERSION, device }),
  }, false)
}

async function createPairing(): Promise<void> {
  const pairing = await apiRequest<{ code: string }>('/api/v1/pairings', {
    method: 'POST',
    body: JSON.stringify({ v: PROTOCOL_VERSION, hostDeviceId: deviceId }),
  })
  console.log(`[mock-host] pairing code: ${pairing.code}`)
}

async function apiRequest<TResult>(path: string, init: RequestInit, authenticated = true): Promise<TResult> {
  const response = await fetch(`${httpBaseUrl()}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(authenticated ? { authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) throw new Error(`${path} failed (${response.status}): ${await response.text()}`)
  return response.json() as Promise<TResult>
}

function sendControl(type: Parameters<typeof createControlFrame>[0], payload: unknown): void {
  if (socket.readyState !== WebSocket.OPEN) throw new Error('Control socket is not open')
  socket.send(JSON.stringify(createControlFrame(type, payload)))
}

function httpBaseUrl(): string {
  const url = new URL(server)
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
  url.pathname = ''
  url.search = ''
  return url.toString().replace(/\/$/, '')
}

function normalizeFingerprint(value: string): string {
  return value.replace(/[^A-Fa-f0-9]/g, '').toUpperCase()
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function stringField(value: Record<string, unknown>, field: string): string {
  const result = value[field]
  if (typeof result !== 'string' || result.length === 0) throw new Error(`Missing ${field}`)
  return result
}
