import { describe, expect, it } from 'vitest'
import {
  type ControlFrame,
  type HelloPayload,
  type HelloAckPayload,
  type ConnectRequestPayload,
  type ConnectIncomingPayload,
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

// Valid payloads for each frame type (used in negative tests)
const validPayloads: Record<string, unknown> = {
  'hello': { role: 'client', deviceId: 'dev-1', accessToken: 'token-1', protocols: [1], capabilities: [] },
  'hello.ack': { protocol: 1, serverVersion: '1.0.0', connectionSessionId: 'sess-1', heartbeatIntervalMs: 25000, maxControlFrameBytes: 65536, maxRelayFrameBytes: 1048576 },
  'connect.request': { hostDeviceId: 'host-1', preferredTransports: ['relay'] },
  'connect.incoming': { connectionId: 'conn-1', clientDeviceId: 'client-1', clientIdentityKey: 'key-1', authorization: 'account', preferredTransports: ['relay'] },
  'connect.accepted': { connectionId: 'conn-1' },
  'connect.rejected': { connectionId: 'conn-1' },
  'secure.handshake': { connectionId: 'conn-1', targetDeviceId: 'host-1', step: 1, data: 'handshake-data' },
  'relay': { connectionId: 'conn-1', targetDeviceId: 'host-1', counter: 0, ciphertext: 'encrypted-data' },
  'signal.offer': { connectionId: 'conn-1', targetDeviceId: 'host-1', sdp: 'v=0...' },
  'signal.answer': { connectionId: 'conn-1', targetDeviceId: 'host-1', sdp: 'v=0...' },
  'signal.ice': { connectionId: 'conn-1', targetDeviceId: 'host-1', candidate: { candidate: 'candidate:1' } },
  'transport.selected': { connectionId: 'conn-1', targetDeviceId: 'host-1', transport: 'relay' },
  'ping': { nonce: 'nonce-1' },
  'pong': { nonce: 'nonce-1' },
  'error': { code: 'ERROR', message: 'Something failed' },
}

// ────────────────────────────────────────────────────────────────────────────
// §10.2 Control frame envelope
// ────────────────────────────────────────────────────────────────────────────

describe('control frame envelope', () => {
  it('accepts a valid envelope with v=1', () => {
    const frame = makeFrame('ping', { nonce: 'test' })
    expect(parseControlFrame(frame)).toMatchObject({ v: 1 })
  })

  it('rejects v !== 1', () => {
    expect(() => parseControlFrame(makeFrame('ping', { nonce: 'test' }, 0))).toThrow()
    expect(() => parseControlFrame(makeFrame('ping', { nonce: 'test' }, 2))).toThrow()
  })

  it('rejects missing id', () => {
    const frame = { v: 1, type: 'ping', timestamp: Date.now(), payload: { nonce: 'test' } }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects empty id', () => {
    const frame = { v: 1, id: '', type: 'ping', timestamp: Date.now(), payload: { nonce: 'test' } }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects missing type', () => {
    const frame = { v: 1, id: 'x', timestamp: Date.now(), payload: { nonce: 'test' } }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects unknown type', () => {
    expect(() => parseControlFrame(makeFrame('unknown.type', {}))).toThrow()
  })

  it('rejects missing timestamp', () => {
    const frame = { v: 1, id: 'x', type: 'ping', payload: { nonce: 'test' } }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects non-positive timestamp', () => {
    const frame = { v: 1, id: 'x', type: 'ping', timestamp: 0, payload: { nonce: 'test' } }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('rejects extra fields in envelope', () => {
    const frame = { v: 1, id: 'x', type: 'ping', timestamp: Date.now(), payload: { nonce: 'test' }, extra: true }
    expect(() => parseControlFrame(frame)).toThrow()
  })

  it('round-trips through createControlFrame', () => {
    const original = createControlFrame('ping', { nonce: 'abc' })
    const reparsed = parseControlFrame(original)
    expect(reparsed).toEqual(original)
  })

  it('accepts all defined control frame types with valid payloads', () => {
    for (const type of controlFrameTypes) {
      const frame = makeFrame(type, validPayloads[type])
      expect(parseControlFrame(frame)).toMatchObject({ type })
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Payload schema validation - positive tests
// ────────────────────────────────────────────────────────────────────────────

describe('hello payload validation', () => {
  const valid: HelloPayload = {
    role: 'client',
    deviceId: 'dev-1',
    accessToken: 'token-1',
    protocols: [1],
    capabilities: ['transport.relay'],
  }

  it('accepts valid hello payload', () => {
    expect(parseControlFrame(makeFrame('hello', valid))).toBeDefined()
  })

  it('accepts hello with host role', () => {
    expect(parseControlFrame(makeFrame('hello', { ...valid, role: 'host' }))).toBeDefined()
  })

  it('accepts hello without clientVersion (optional per spec)', () => {
    expect(parseControlFrame(makeFrame('hello', valid))).toBeDefined()
  })

  it('accepts hello with clientVersion', () => {
    expect(parseControlFrame(makeFrame('hello', { ...valid, clientVersion: '0.2.24' }))).toBeDefined()
  })

  it('accepts Host hello with harnessVersion', () => {
    const frame = parseControlFrame(makeFrame('hello', {
      ...valid,
      role: 'host',
      harnessVersion: '0.1.0-rc.8',
    }))
    expect(frame.payload).toMatchObject({ harnessVersion: '0.1.0-rc.8' })
  })

  it('accepts protocol versions at both safe integer boundaries', () => {
    expect(parseControlFrame(makeFrame('hello', { ...valid, protocols: [0] }))).toBeDefined()
    expect(parseControlFrame(makeFrame('hello', {
      ...valid,
      protocols: [Number.MAX_SAFE_INTEGER],
    }))).toBeDefined()
  })

  it('accepts unknown capabilities for additive negotiation', () => {
    expect(parseControlFrame(makeFrame('hello', {
      ...valid,
      capabilities: ['transport.relay', 'example.future.v1'],
    }))).toBeDefined()
  })

  it('returns parsed payload with stripped unknown fields', () => {
    const withExtra = { ...valid, unknownField: 'should-be-stripped' }
    const result = parseControlFrame(makeFrame('hello', withExtra))
    expect(result.payload).not.toHaveProperty('unknownField')
  })
})

describe('hello.ack payload validation', () => {
  const valid: HelloAckPayload = {
    protocol: 1,
    serverVersion: '1.0.0',
    connectionSessionId: 'sess-1',
    heartbeatIntervalMs: 25000,
    maxControlFrameBytes: 65536,
    maxRelayFrameBytes: 1048576,
  }

  it('accepts valid hello.ack payload', () => {
    expect(parseControlFrame(makeFrame('hello.ack', valid))).toBeDefined()
  })

  it('accepts hello.ack with optional webrtc fields', () => {
    const withWebrtc = { ...valid, webrtcEnabled: true, webrtcFallbackTimeoutMs: 5000 }
    expect(parseControlFrame(makeFrame('hello.ack', withWebrtc))).toBeDefined()
  })
})

describe('connect.incoming payload validation', () => {
  const valid: ConnectIncomingPayload = {
    connectionId: 'conn-1',
    clientDeviceId: 'client-1',
    clientIdentityKey: 'key-1',
    authorization: 'account',
    preferredTransports: ['relay'],
  }

  it('accepts valid connect.incoming', () => {
    expect(parseControlFrame(makeFrame('connect.incoming', valid))).toBeDefined()
  })
})

describe('relay payload validation', () => {
  const valid: RelayPayload = {
    connectionId: 'conn-1',
    targetDeviceId: 'host-1',
    counter: 42,
    ciphertext: 'encrypted',
  }

  it('accepts valid relay', () => {
    expect(parseControlFrame(makeFrame('relay', valid))).toBeDefined()
  })

  it('accepts relay with counter = 0', () => {
    expect(parseControlFrame(makeFrame('relay', { ...valid, counter: 0 }))).toBeDefined()
  })

  it('accepts relay with counter = Number.MAX_SAFE_INTEGER', () => {
    expect(parseControlFrame(makeFrame('relay', {
      ...valid,
      counter: Number.MAX_SAFE_INTEGER,
    }))).toBeDefined()
  })
})

describe('signal.ice payload validation', () => {
  const valid: SignalIcePayload = {
    connectionId: 'conn-1',
    targetDeviceId: 'host-1',
    candidate: {
      candidate: 'candidate:1 1 UDP 2122252543 192.168.1.100 50000 typ host',
      sdpMid: '0',
      sdpMLineIndex: 0,
    },
  }

  it('accepts valid signal.ice', () => {
    expect(parseControlFrame(makeFrame('signal.ice', valid))).toBeDefined()
  })

  it('accepts candidate with null sdpMid', () => {
    const withNull = { ...valid, candidate: { ...valid.candidate, sdpMid: null } }
    expect(parseControlFrame(makeFrame('signal.ice', withNull))).toBeDefined()
  })

  it('normalizes invalid native sdpMLineIndex values to null', () => {
    const parsed = parseControlFrame(makeFrame('signal.ice', {
      ...valid,
      candidate: { ...valid.candidate, sdpMLineIndex: 1.167066568144e-312 },
    }))
    expect(parsed.payload.candidate.sdpMLineIndex).toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// Payload schema validation - NEGATIVE tests
// ────────────────────────────────────────────────────────────────────────────

describe('hello payload rejection', () => {
  it('rejects invalid role', () => {
    expect(() => parseControlFrame(makeFrame('hello', {
      ...validPayloads['hello'] as HelloPayload,
      role: 'admin',
    }))).toThrow()
  })

  it('rejects missing role', () => {
    const { role, ...noRole } = validPayloads['hello'] as HelloPayload
    expect(() => parseControlFrame(makeFrame('hello', noRole))).toThrow()
  })

  it('rejects empty deviceId', () => {
    expect(() => parseControlFrame(makeFrame('hello', {
      ...validPayloads['hello'] as HelloPayload,
      deviceId: '',
    }))).toThrow()
  })

  it('rejects missing deviceId', () => {
    const { deviceId, ...noDeviceId } = validPayloads['hello'] as HelloPayload
    expect(() => parseControlFrame(makeFrame('hello', noDeviceId))).toThrow()
  })

  it('rejects empty accessToken', () => {
    expect(() => parseControlFrame(makeFrame('hello', {
      ...validPayloads['hello'] as HelloPayload,
      accessToken: '',
    }))).toThrow()
  })

  it('rejects missing accessToken', () => {
    const { accessToken, ...noToken } = validPayloads['hello'] as HelloPayload
    expect(() => parseControlFrame(makeFrame('hello', noToken))).toThrow()
  })

  it('rejects empty protocols', () => {
    expect(() => parseControlFrame(makeFrame('hello', {
      ...validPayloads['hello'] as HelloPayload,
      protocols: [],
    }))).toThrow()
  })

  it('rejects protocol versions outside the safe integer range', () => {
    expect(() => parseControlFrame(makeFrame('hello', {
      ...validPayloads['hello'] as HelloPayload,
      protocols: [-1],
    }))).toThrow()
    expect(() => parseControlFrame(makeFrame('hello', {
      ...validPayloads['hello'] as HelloPayload,
      protocols: [Number.MAX_SAFE_INTEGER + 1],
    }))).toThrow()
  })

  it('rejects duplicate protocol versions', () => {
    expect(() => parseControlFrame(makeFrame('hello', {
      ...validPayloads['hello'] as HelloPayload,
      protocols: [1, 1],
    }))).toThrow()
  })

  it('rejects empty and duplicate capabilities', () => {
    expect(() => parseControlFrame(makeFrame('hello', {
      ...validPayloads['hello'] as HelloPayload,
      capabilities: [''],
    }))).toThrow()
    expect(() => parseControlFrame(makeFrame('hello', {
      ...validPayloads['hello'] as HelloPayload,
      capabilities: ['transport.relay', 'transport.relay'],
    }))).toThrow()
  })

  it('rejects missing protocols', () => {
    const { protocols, ...noProtocols } = validPayloads['hello'] as HelloPayload
    expect(() => parseControlFrame(makeFrame('hello', noProtocols))).toThrow()
  })
})

describe('hello.ack payload rejection', () => {
  it('rejects protocol !== 1', () => {
    expect(() => parseControlFrame(makeFrame('hello.ack', {
      ...validPayloads['hello.ack'] as HelloAckPayload,
      protocol: 2,
    }))).toThrow()
  })

  it('rejects empty serverVersion', () => {
    expect(() => parseControlFrame(makeFrame('hello.ack', {
      ...validPayloads['hello.ack'] as HelloAckPayload,
      serverVersion: '',
    }))).toThrow()
  })

  it('rejects zero heartbeatIntervalMs', () => {
    expect(() => parseControlFrame(makeFrame('hello.ack', {
      ...validPayloads['hello.ack'] as HelloAckPayload,
      heartbeatIntervalMs: 0,
    }))).toThrow()
  })

  it('rejects negative maxControlFrameBytes', () => {
    expect(() => parseControlFrame(makeFrame('hello.ack', {
      ...validPayloads['hello.ack'] as HelloAckPayload,
      maxControlFrameBytes: -1,
    }))).toThrow()
  })
})

describe('connect.request payload rejection', () => {
  it('rejects empty hostDeviceId', () => {
    expect(() => parseControlFrame(makeFrame('connect.request', {
      ...validPayloads['connect.request'] as ConnectRequestPayload,
      hostDeviceId: '',
    }))).toThrow()
  })

  it('rejects empty preferredTransports', () => {
    expect(() => parseControlFrame(makeFrame('connect.request', {
      ...validPayloads['connect.request'] as ConnectRequestPayload,
      preferredTransports: [],
    }))).toThrow()
  })

  it('rejects invalid transport value', () => {
    expect(() => parseControlFrame(makeFrame('connect.request', {
      ...validPayloads['connect.request'] as ConnectRequestPayload,
      preferredTransports: ['udp'],
    }))).toThrow()
  })
})

describe('connect.incoming payload rejection', () => {
  const valid = validPayloads['connect.incoming'] as ConnectIncomingPayload

  it('rejects authorization !== "account"', () => {
    expect(() => parseControlFrame(makeFrame('connect.incoming', {
      ...valid,
      authorization: 'device',
    }))).toThrow()
  })

  it('rejects empty authorization', () => {
    expect(() => parseControlFrame(makeFrame('connect.incoming', {
      ...valid,
      authorization: '',
    }))).toThrow()
  })

  it('rejects missing authorization', () => {
    const { authorization, ...noAuth } = valid
    expect(() => parseControlFrame(makeFrame('connect.incoming', noAuth))).toThrow()
  })

  it('rejects empty connectionId', () => {
    expect(() => parseControlFrame(makeFrame('connect.incoming', {
      ...valid,
      connectionId: '',
    }))).toThrow()
  })

  it('rejects empty clientDeviceId', () => {
    expect(() => parseControlFrame(makeFrame('connect.incoming', {
      ...valid,
      clientDeviceId: '',
    }))).toThrow()
  })

  it('rejects empty clientIdentityKey', () => {
    expect(() => parseControlFrame(makeFrame('connect.incoming', {
      ...valid,
      clientIdentityKey: '',
    }))).toThrow()
  })

  it('rejects empty preferredTransports', () => {
    expect(() => parseControlFrame(makeFrame('connect.incoming', {
      ...valid,
      preferredTransports: [],
    }))).toThrow()
  })
})

describe('relay payload rejection', () => {
  const valid = validPayloads['relay'] as RelayPayload

  it('rejects empty connectionId', () => {
    expect(() => parseControlFrame(makeFrame('relay', {
      ...valid,
      connectionId: '',
    }))).toThrow()
  })

  it('rejects empty targetDeviceId', () => {
    expect(() => parseControlFrame(makeFrame('relay', {
      ...valid,
      targetDeviceId: '',
    }))).toThrow()
  })

  it('rejects negative counter', () => {
    expect(() => parseControlFrame(makeFrame('relay', {
      ...valid,
      counter: -1,
    }))).toThrow()
  })

  it('rejects counters outside the safe integer range', () => {
    expect(() => parseControlFrame(makeFrame('relay', {
      ...valid,
      counter: Number.MAX_SAFE_INTEGER + 1,
    }))).toThrow()
  })

  it('rejects empty ciphertext', () => {
    expect(() => parseControlFrame(makeFrame('relay', {
      ...valid,
      ciphertext: '',
    }))).toThrow()
  })
})

describe('signal payload rejection', () => {
  const valid = validPayloads['signal.offer'] as SignalPayload

  it('rejects empty connectionId', () => {
    expect(() => parseControlFrame(makeFrame('signal.offer', {
      ...valid,
      connectionId: '',
    }))).toThrow()
  })

  it('rejects empty targetDeviceId', () => {
    expect(() => parseControlFrame(makeFrame('signal.offer', {
      ...valid,
      targetDeviceId: '',
    }))).toThrow()
  })

  it('rejects empty sdp', () => {
    expect(() => parseControlFrame(makeFrame('signal.offer', {
      ...valid,
      sdp: '',
    }))).toThrow()
  })
})

describe('transport.selected payload rejection', () => {
  const valid = validPayloads['transport.selected'] as TransportSelectedPayload

  it('rejects empty connectionId', () => {
    expect(() => parseControlFrame(makeFrame('transport.selected', {
      ...valid,
      connectionId: '',
    }))).toThrow()
  })

  it('rejects empty targetDeviceId', () => {
    expect(() => parseControlFrame(makeFrame('transport.selected', {
      ...valid,
      targetDeviceId: '',
    }))).toThrow()
  })

  it('rejects invalid transport', () => {
    expect(() => parseControlFrame(makeFrame('transport.selected', {
      ...valid,
      transport: 'lan',
    }))).toThrow()
  })

  it('rejects missing transport', () => {
    const { transport, ...noTransport } = valid
    expect(() => parseControlFrame(makeFrame('transport.selected', noTransport))).toThrow()
  })
})

describe('ping/pong payload rejection', () => {
  it('rejects empty nonce in ping', () => {
    expect(() => parseControlFrame(makeFrame('ping', { nonce: '' }))).toThrow()
  })

  it('rejects missing nonce in ping', () => {
    expect(() => parseControlFrame(makeFrame('ping', {}))).toThrow()
  })

  it('rejects empty nonce in pong', () => {
    expect(() => parseControlFrame(makeFrame('pong', { nonce: '' }))).toThrow()
  })

  it('rejects missing nonce in pong', () => {
    expect(() => parseControlFrame(makeFrame('pong', {}))).toThrow()
  })
})

describe('error payload rejection', () => {
  const valid = validPayloads['error'] as ControlErrorPayload

  it('rejects empty code', () => {
    expect(() => parseControlFrame(makeFrame('error', {
      ...valid,
      code: '',
    }))).toThrow()
  })

  it('rejects missing code', () => {
    const { code, ...noCode } = valid
    expect(() => parseControlFrame(makeFrame('error', noCode))).toThrow()
  })

  it('rejects empty message', () => {
    expect(() => parseControlFrame(makeFrame('error', {
      ...valid,
      message: '',
    }))).toThrow()
  })

  it('rejects missing message', () => {
    const { message, ...noMessage } = valid
    expect(() => parseControlFrame(makeFrame('error', noMessage))).toThrow()
  })
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
