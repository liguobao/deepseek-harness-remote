import { describe, expect, it } from 'vitest'
import {
  type ControlFrame,
  type HelloPayload,
  type HelloAckPayload,
  type ConnectRequestPayload,
  type ConnectIncomingPayload,
  type ConnectAcceptedPayload,
  type ConnectRejectedPayload,
  type SecureHandshakePayload,
  type RelayPayload,
  type SignalPayload,
  type SignalIcePayload,
  type TransportSelectedPayload,
  type ControlErrorPayload,
  PROTOCOL_VERSION,
  controlFrameTypes,
  createControlFrame,
  parseControlFrame,
} from '../src/index.js'

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function makeFrame(type: string, payload: unknown, v = PROTOCOL_VERSION): unknown {
  return {
    v,
    id: `frame-${Date.now()}`,
    type,
    timestamp: Date.now(),
    payload,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// §10.2 Control frame envelope
// ────────────────────────────────────────────────────────────────────────────

describe('control frame envelope', () => {
  it('accepts a valid envelope with v=1', () => {
    const frame = makeFrame('ping', { nonce: 'test-nonce' })
    expect(parseControlFrame(frame)).toMatchObject({ v: 1 })
  })

  it('rejects v !== 1', () => {
    expect(() => parseControlFrame(makeFrame('hello', {}, 0))).toThrow()
    expect(() => parseControlFrame(makeFrame('hello', {}, 2))).toThrow()
  })

  it('rejects missing id', () => {
    const frame = { v: 1, type: 'hello', timestamp: Date.now(), payload: {} }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects empty id', () => {
    const frame = { v: 1, id: '', type: 'hello', timestamp: Date.now(), payload: {} }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects missing type', () => {
    const frame = { v: 1, id: 'x', timestamp: Date.now(), payload: {} }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects unknown type', () => {
    expect(() => parseControlFrame(makeFrame('unknown.type', {}))).toThrow()
  })

  it('rejects missing timestamp', () => {
    const frame = { v: 1, id: 'x', type: 'hello', payload: {} }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects non-positive timestamp', () => {
    const frame = { v: 1, id: 'x', type: 'hello', timestamp: 0, payload: {} }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects extra fields in envelope', () => {
    const frame = { v: 1, id: 'x', type: 'hello', timestamp: Date.now(), payload: {}, extra: true }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('round-trips through createControlFrame', () => {
    const original = createControlFrame('ping', { nonce: 'abc' })
    const reparsed = parseControlFrame(original)
    expect(reparsed).toEqual(original)
  })

  it('accepts all defined control frame types with valid payloads', () => {
    const validPayloads: Record<string, unknown> = {
      'hello': { role: 'client', deviceId: 'x', accessToken: 'y', protocols: [1], capabilities: [] },
      'hello.ack': { protocol: 1, serverVersion: '1', connectionSessionId: 'x', heartbeatIntervalMs: 1000, maxControlFrameBytes: 1000, maxRelayFrameBytes: 1000 },
      'connect.request': { hostDeviceId: 'x', preferredTransports: ['relay'] },
      'connect.incoming': { connectionId: 'x', clientDeviceId: 'y', clientIdentityKey: 'z', authorization: 'account', preferredTransports: ['relay'] },
      'connect.accepted': { connectionId: 'x' },
      'connect.rejected': { connectionId: 'x' },
      'secure.handshake': { connectionId: 'x', targetDeviceId: 'y', step: 1, data: 'z' },
      'relay': { connectionId: 'x', targetDeviceId: 'y', counter: 0, ciphertext: 'z' },
      'signal.offer': { connectionId: 'x', targetDeviceId: 'y', sdp: 'z' },
      'signal.answer': { connectionId: 'x', targetDeviceId: 'y', sdp: 'z' },
      'signal.ice': { connectionId: 'x', targetDeviceId: 'y', candidate: {} },
      'transport.selected': { connectionId: 'x', targetDeviceId: 'y', transport: 'relay' },
      'ping': { nonce: 'x' },
      'pong': { nonce: 'x' },
      'error': { code: 'ERROR', message: 'msg' },
    }
    for (const type of controlFrameTypes) {
      const frame = makeFrame(type, validPayloads[type] || {})
      expect(parseControlFrame(frame)).toMatchObject({ type })
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────
// §10.3 Hello - payload accepted (envelope only validation in current impl)
// ────────────────────────────────────────────────────────────────────────────

describe('hello frame', () => {
  const validHello: HelloPayload = {
    role: 'client',
    deviceId: '01KCLIENT000000000000000000',
    accessToken: 'eyJhbGciOiJIUzI1NiJ9.test',
    protocols: [1],
    capabilities: ['transport.relay'],
    clientVersion: '0.2.24',
  }

  it('accepts a valid hello payload', () => {
    const frame = makeFrame('hello', validHello)
    const result = parseControlFrame(frame)
    expect(result).toMatchObject({ type: 'hello' })
    expect(result.payload).toEqual(validHello)
  })

  it('accepts hello with host role', () => {
    const frame = makeFrame('hello', { ...validHello, role: 'host' })
    expect(parseControlFrame(frame)).toMatchObject({ type: 'hello' })
  })

  it('accepts hello with minimal fields', () => {
    const minimal = { role: 'client', deviceId: 'x', accessToken: 'y', protocols: [1], capabilities: [] }
    const frame = makeFrame('hello', minimal)
    expect(parseControlFrame(frame)).toBeDefined()
  })

  it('accepts hello without clientVersion (optional per spec)', () => {
    const { clientVersion, ...noVersion } = validHello
    expect(parseControlFrame(makeFrame('hello', noVersion))).toBeDefined()
  })

  it('accepts transport capabilities', () => {
    const frame = makeFrame('hello', {
      ...validHello,
      capabilities: ['transport.relay', 'transport.p2p', 'transport.turn'],
    })
    expect(parseControlFrame(frame)).toBeDefined()
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §10.3:
  //   - role must be 'host' | 'client'
  //   - deviceId must be non-empty
  //   - accessToken must be non-empty
  //   - protocols must be non-empty array
  //   - capabilities must be array
})

// ────────────────────────────────────────────────────────────────────────────
// §10.3 Hello Ack - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('hello.ack frame', () => {
  const validHelloAck: HelloAckPayload = {
    protocol: 1,
    serverVersion: '0.1.0',
    connectionSessionId: '01KWS00000000000000000000',
    heartbeatIntervalMs: 25000,
    maxControlFrameBytes: 65536,
    maxRelayFrameBytes: 1048576,
  }

  it('accepts a valid hello.ack payload', () => {
    const frame = makeFrame('hello.ack', validHelloAck)
    const result = parseControlFrame(frame)
    expect(result).toMatchObject({ type: 'hello.ack' })
    expect(result.payload).toEqual(validHelloAck)
  })

  it('accepts hello.ack with optional webrtc fields', () => {
    const withWebrtc = { ...validHelloAck, webrtcEnabled: true, webrtcFallbackTimeoutMs: 5000 }
    expect(parseControlFrame(makeFrame('hello.ack', withWebrtc))).toBeDefined()
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §10.3:
  //   - protocol must be 1
  //   - serverVersion must be non-empty
  //   - connectionSessionId must be non-empty
  //   - heartbeatIntervalMs must be positive
  //   - maxControlFrameBytes must be positive
  //   - maxRelayFrameBytes must be positive
})

// ────────────────────────────────────────────────────────────────────────────
// §11 connect.request - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('connect.request frame', () => {
  const validConnectRequest: ConnectRequestPayload = {
    hostDeviceId: '01KHOST0000000000000000000',
    preferredTransports: ['lan', 'p2p', 'turn', 'relay'],
  }

  it('accepts a valid connect.request', () => {
    const frame = makeFrame('connect.request', validConnectRequest)
    const result = parseControlFrame(frame)
    expect(result).toMatchObject({ type: 'connect.request' })
    expect(result.payload).toEqual(validConnectRequest)
  })

  it('accepts connect.request with single transport', () => {
    const frame = makeFrame('connect.request', { ...validConnectRequest, preferredTransports: ['relay'] })
    expect(parseControlFrame(frame)).toBeDefined()
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §11:
  //   - hostDeviceId must be non-empty
  //   - preferredTransports must be non-empty array with valid values
})

// ────────────────────────────────────────────────────────────────────────────
// §11 connect.incoming - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('connect.incoming frame', () => {
  const validConnectIncoming: ConnectIncomingPayload = {
    connectionId: '01KCONN0000000000000000000',
    clientDeviceId: '01KCLIENT000000000000000000',
    clientIdentityKey: 'base64url-x25519-public-key-data-here',
    authorization: 'account',
    preferredTransports: ['lan', 'p2p', 'turn', 'relay'],
  }

  it('accepts a valid connect.incoming', () => {
    const frame = makeFrame('connect.incoming', validConnectIncoming)
    const result = parseControlFrame(frame)
    expect(result).toMatchObject({ type: 'connect.incoming' })
    expect(result.payload).toEqual(validConnectIncoming)
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §11:
  //   - connectionId must be non-empty
  //   - clientDeviceId must be non-empty
  //   - clientIdentityKey must be non-empty
  //   - authorization MUST be 'account' (security critical!)
  //   - preferredTransports must be non-empty array
})

// ────────────────────────────────────────────────────────────────────────────
// §11 connect.accepted - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('connect.accepted frame', () => {
  const validAccepted: ConnectAcceptedPayload = {
    connectionId: '01KCONN0000000000000000000',
  }

  it('accepts a valid connect.accepted', () => {
    const frame = makeFrame('connect.accepted', validAccepted)
    expect(parseControlFrame(frame)).toMatchObject({ type: 'connect.accepted' })
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation:
  //   - connectionId must be non-empty
})

// ────────────────────────────────────────────────────────────────────────────
// §11 connect.rejected - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('connect.rejected frame', () => {
  const validRejected: ConnectRejectedPayload = {
    connectionId: '01KCONN0000000000000000000',
    code: 'MEMBERSHIP_REQUIRED',
    message: 'Client is not authorized to connect to this host.',
  }

  it('accepts a valid connect.rejected', () => {
    const frame = makeFrame('connect.rejected', validRejected)
    expect(parseControlFrame(frame)).toMatchObject({ type: 'connect.rejected' })
  })

  it('accepts connect.rejected without optional code and message', () => {
    const frame = makeFrame('connect.rejected', { connectionId: '01KCONN0000000000000000000' })
    expect(parseControlFrame(frame)).toBeDefined()
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation:
  //   - connectionId must be non-empty
})

// ────────────────────────────────────────────────────────────────────────────
// §12.2 secure.handshake - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('secure.handshake frame', () => {
  const validHandshake: SecureHandshakePayload = {
    connectionId: '01KCONN0000000000000000000',
    targetDeviceId: '01KHOST0000000000000000000',
    step: 1,
    data: 'base64url-noise-handshake-data',
  }

  it('accepts a valid secure.handshake', () => {
    const frame = makeFrame('secure.handshake', validHandshake)
    expect(parseControlFrame(frame)).toMatchObject({ type: 'secure.handshake' })
  })

  it('accepts multiple handshake steps', () => {
    for (let step = 1; step <= 3; step++) {
      const frame = makeFrame('secure.handshake', { ...validHandshake, step })
      expect(parseControlFrame(frame)).toBeDefined()
    }
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §12.2:
  //   - connectionId must be non-empty
  //   - targetDeviceId must be non-empty
  //   - step must be positive integer
  //   - data must be non-empty
})

// ────────────────────────────────────────────────────────────────────────────
// §13 relay - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('relay frame', () => {
  const validRelay: RelayPayload = {
    connectionId: '01KCONN0000000000000000000',
    targetDeviceId: '01KHOST0000000000000000000',
    counter: 42,
    ciphertext: 'base64url-noise-transport-ciphertext',
  }

  it('accepts a valid relay', () => {
    const frame = makeFrame('relay', validRelay)
    expect(parseControlFrame(frame)).toMatchObject({ type: 'relay' })
  })

  it('accepts relay with counter = 0', () => {
    const frame = makeFrame('relay', { ...validRelay, counter: 0 })
    expect(parseControlFrame(frame)).toBeDefined()
  })

  it('accepts relay with large counter values', () => {
    const frame = makeFrame('relay', { ...validRelay, counter: 4294967295 }) // uint32 max
    expect(parseControlFrame(frame)).toBeDefined()
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §13:
  //   - connectionId must be non-empty
  //   - targetDeviceId must be non-empty
  //   - counter must be non-negative integer
  //   - ciphertext must be non-empty
})

// ────────────────────────────────────────────────────────────────────────────
// §14 signal.offer - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('signal.offer frame', () => {
  const validOffer: SignalPayload = {
    connectionId: '01KCONN0000000000000000000',
    targetDeviceId: '01KHOST0000000000000000000',
    sdp: 'v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\n...',
  }

  it('accepts a valid signal.offer', () => {
    const frame = makeFrame('signal.offer', validOffer)
    expect(parseControlFrame(frame)).toMatchObject({ type: 'signal.offer' })
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §14:
  //   - connectionId must be non-empty
  //   - targetDeviceId must be non-empty
  //   - sdp must be non-empty
})

// ────────────────────────────────────────────────────────────────────────────
// §14 signal.answer - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('signal.answer frame', () => {
  const validAnswer: SignalPayload = {
    connectionId: '01KCONN0000000000000000000',
    targetDeviceId: '01KHOST0000000000000000000',
    sdp: 'v=0\r\no=- 1234567890 2 IN IP4 127.0.0.1\r\n...',
  }

  it('accepts a valid signal.answer', () => {
    const frame = makeFrame('signal.answer', validAnswer)
    expect(parseControlFrame(frame)).toMatchObject({ type: 'signal.answer' })
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §14:
  //   - connectionId must be non-empty
  //   - targetDeviceId must be non-empty
  //   - sdp must be non-empty
})

// ────────────────────────────────────────────────────────────────────────────
// §14 signal.ice - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('signal.ice frame', () => {
  const validIce: SignalIcePayload = {
    connectionId: '01KCONN0000000000000000000',
    targetDeviceId: '01KHOST0000000000000000000',
    candidate: {
      candidate: 'candidate:1 1 UDP 2122252543 192.168.1.100 50000 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    },
  }

  it('accepts a valid signal.ice', () => {
    const frame = makeFrame('signal.ice', validIce)
    expect(parseControlFrame(frame)).toMatchObject({ type: 'signal.ice' })
  })

  it('accepts candidate with optional fields', () => {
    const minimalCandidate = {
      ...validIce,
      candidate: {
        candidate: 'candidate:1 1 UDP 2122252543 192.168.1.100 50000 typ host',
      },
    }
    expect(parseControlFrame(makeFrame('signal.ice', minimalCandidate))).toBeDefined()
  })

  it('accepts candidate with null sdpMid', () => {
    const withNullSdpMid = {
      ...validIce,
      candidate: { ...validIce.candidate, sdpMid: null },
    }
    expect(parseControlFrame(makeFrame('signal.ice', withNullSdpMid))).toBeDefined()
  })

  it('accepts candidate with null sdpMLineIndex', () => {
    const withNullIndex = {
      ...validIce,
      candidate: { ...validIce.candidate, sdpMLineIndex: null },
    }
    expect(parseControlFrame(makeFrame('signal.ice', withNullIndex))).toBeDefined()
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §14:
  //   - connectionId must be non-empty
  //   - targetDeviceId must be non-empty
  //   - candidate must be non-empty object with candidate field
})

// ────────────────────────────────────────────────────────────────────────────
// transport.selected - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('transport.selected frame', () => {
  const validSelected: TransportSelectedPayload = {
    connectionId: '01KCONN0000000000000000000',
    targetDeviceId: '01KHOST0000000000000000000',
    transport: 'relay',
  }

  it('accepts a valid transport.selected', () => {
    const frame = makeFrame('transport.selected', validSelected)
    expect(parseControlFrame(frame)).toMatchObject({ type: 'transport.selected' })
  })

  it('accepts valid transport values', () => {
    const validTransports = ['p2p', 'turn', 'relay'] as const
    for (const transport of validTransports) {
      const frame = makeFrame('transport.selected', { ...validSelected, transport })
      expect(parseControlFrame(frame)).toBeDefined()
    }
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation:
  //   - connectionId must be non-empty
  //   - targetDeviceId must be non-empty
  //   - transport must be one of 'p2p' | 'turn' | 'relay'
})

// ────────────────────────────────────────────────────────────────────────────
// §22 ping - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('ping frame', () => {
  it('accepts a valid ping with nonce', () => {
    const frame = makeFrame('ping', { nonce: '01KNONCE0000000000000000000' })
    expect(parseControlFrame(frame)).toMatchObject({ type: 'ping' })
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §22:
  //   - nonce must be non-empty string
})

// ────────────────────────────────────────────────────────────────────────────
// §22 pong - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('pong frame', () => {
  it('accepts a valid pong with nonce', () => {
    const frame = makeFrame('pong', { nonce: '01KNONCE0000000000000000000' })
    expect(parseControlFrame(frame)).toMatchObject({ type: 'pong' })
  })

  it('pong echoes ping nonce', () => {
    const nonce = '01KNONCE0000000000000000000'
    const ping = makeFrame('ping', { nonce })
    const pong = makeFrame('pong', { nonce })
    expect(parseControlFrame(ping)).toBeDefined()
    expect(parseControlFrame(pong)).toBeDefined()
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §22:
  //   - nonce must be non-empty string
})

// ────────────────────────────────────────────────────────────────────────────
// §23 error - payload accepted
// ────────────────────────────────────────────────────────────────────────────

describe('error frame', () => {
  const validError: ControlErrorPayload = {
    code: 'HOST_OFFLINE',
    message: 'The host is not currently connected.',
    retryable: true,
  }

  it('accepts a valid error', () => {
    const frame = makeFrame('error', validError)
    expect(parseControlFrame(frame)).toMatchObject({ type: 'error' })
  })

  it('accepts error without retryable (optional)', () => {
    const frame = makeFrame('error', { code: 'ERROR', message: 'Something failed.' })
    expect(parseControlFrame(frame)).toBeDefined()
  })

  it('accepts error with optional connectionId', () => {
    const frame = makeFrame('error', { ...validError, connectionId: '01KCONN0000000000000000000' })
    expect(parseControlFrame(frame)).toBeDefined()
  })

  it('accepts all defined protocol error codes', () => {
    const errorCodes = [
      // Protocol / Version
      'INVALID_MESSAGE', 'UNSUPPORTED_VERSION', 'CAPABILITY_NOT_SUPPORTED',
      'METHOD_NOT_FOUND', 'METHOD_NOT_ALLOWED', 'REQUEST_CONFLICT',
      'FRAME_TOO_LARGE', 'RATE_LIMITED',
      // Auth / Device
      'AUTH_REQUIRED', 'AUTH_INVALID', 'ACCOUNT_AUTH_REQUIRED', 'TOKEN_EXPIRED',
      'DEVICE_NOT_FOUND', 'DEVICE_REVOKED', 'DEVICE_OWNERSHIP_REQUIRED',
      'MEMBERSHIP_REQUIRED', 'PEER_IDENTITY_MISMATCH',
      'HOST_REGISTRATION_CODE_NOT_FOUND', 'HOST_REGISTRATION_CODE_EXPIRED',
      'HOST_REGISTRATION_CODE_CONSUMED',
      // Connection / Transport
      'HOST_OFFLINE', 'CONNECTION_NOT_FOUND', 'CONNECTION_FAILED',
      'CONNECTION_REPLACED', 'P2P_FAILED', 'TURN_UNAVAILABLE',
      'RELAY_UNAVAILABLE', 'SLOW_CONSUMER', 'SECURE_CHANNEL_FAILED',
      // Harness
      'HARNESS_UNAVAILABLE', 'SESSION_NOT_FOUND', 'SESSION_NOT_READY',
      'AGENT_BUSY', 'PERMISSION_DENIED', 'PERMISSION_NOT_PENDING',
      'RPC_TIMEOUT', 'FULL_RESYNC_REQUIRED', 'INTERNAL_ERROR',
    ]

    for (const code of errorCodes) {
      const frame = makeFrame('error', { code, message: `Error: ${code}` })
      expect(parseControlFrame(frame)).toBeDefined()
    }
  })

  // NOTE: Current implementation does NOT validate payload fields.
  // TODO: Add payload schema validation per protocol.md §23:
  //   - code must be non-empty string
  //   - message must be non-empty string (user-facing, no secrets)
  //   - retryable must be boolean if present
  //   - connectionId must be non-empty string if present
})

// ────────────────────────────────────────────────────────────────────────────
// Golden vectors - complete type enumeration
// ────────────────────────────────────────────────────────────────────────────

describe('golden vectors', () => {
  it('control frame types are complete and ordered', () => {
    const expected = [
      'hello', 'hello.ack', 'connect.request', 'connect.incoming',
      'connect.accepted', 'connect.rejected', 'secure.handshake',
      'relay', 'signal.offer', 'signal.answer', 'signal.ice',
      'transport.selected', 'ping', 'pong', 'error',
    ]
    expect([...expected].sort()).toEqual([...Array.from(controlFrameTypes)].sort())
  })

  it('protocol version is 1', () => {
    expect(PROTOCOL_VERSION).toBe(1)
  })
})