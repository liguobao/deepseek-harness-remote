import { describe, expect, it } from 'vitest'
import {
  PROTOCOL_VERSION,
  SECURE_FRAGMENT_CHUNK_BYTES,
  MAX_SECURE_MESSAGE_BYTES,
  SecureMessageCodec,
} from '../src/index.js'

const MAX_IN_FLIGHT_SECURE_MESSAGES = 8

describe('protocol limit constants', () => {
  it('PROTOCOL_VERSION is 1', () => {
    expect(PROTOCOL_VERSION).toBe(1)
  })

  it('SECURE_FRAGMENT_CHUNK_BYTES is 48 KiB', () => {
    expect(SECURE_FRAGMENT_CHUNK_BYTES).toBe(48 * 1024)
  })

  it('MAX_SECURE_MESSAGE_BYTES is 4 MiB', () => {
    expect(MAX_SECURE_MESSAGE_BYTES).toBe(4 * 1024 * 1024)
  })
})

describe('SecureMessageCodec message size limit', () => {
  it('accepts message at exactly MAX_SECURE_MESSAGE_BYTES', () => {
    const codec = new SecureMessageCodec()
    const message = new Uint8Array(MAX_SECURE_MESSAGE_BYTES)
    const frames = codec.encode(message)
    expect(frames.length).toBeGreaterThan(0)
  })

  it('rejects message exceeding MAX_SECURE_MESSAGE_BYTES', () => {
    const codec = new SecureMessageCodec()
    const message = new Uint8Array(MAX_SECURE_MESSAGE_BYTES + 1)
    expect(() => codec.encode(message)).toThrow('Secure message exceeds the reassembly limit.')
  })

  it('rejects message far exceeding limit', () => {
    const codec = new SecureMessageCodec()
    const message = new Uint8Array(MAX_SECURE_MESSAGE_BYTES * 2)
    expect(() => codec.encode(message)).toThrow('Secure message exceeds the reassembly limit.')
  })

  it('accepts small messages without fragmentation', () => {
    const codec = new SecureMessageCodec()
    const message = new Uint8Array(100)
    const frames = codec.encode(message)
    expect(frames).toHaveLength(1)
    expect(frames[0]).toEqual(message)
  })

  it('fragments messages larger than SECURE_FRAGMENT_CHUNK_BYTES', () => {
    const codec = new SecureMessageCodec()
    const message = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES + 1)
    const frames = codec.encode(message)
    expect(frames.length).toBeGreaterThan(1)
  })
})

describe('SecureMessageCodec fragment reassembly limits', () => {
  it('rejects more than MAX_IN_FLIGHT_SECURE_MESSAGES concurrent assemblies', () => {
    const decoder = new SecureMessageCodec()
    const encoder = new SecureMessageCodec()

    const messages = Array.from({ length: 9 }, (_, i) =>
      new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES * 2 + i))

    const allFrames = messages.map(msg => encoder.encode(msg))

    for (let i = 0; i < 8; i++) {
      decoder.decode(allFrames[i]![0]!)
    }

    expect(() => decoder.decode(allFrames[8]![0]!)).toThrow('Secure fragment sequence is invalid.')
  })

  it('rejects out-of-order fragments', () => {
    const encoder = new SecureMessageCodec()
    const decoder = new SecureMessageCodec()

    const message = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES * 3)
    const frames = encoder.encode(message)
    expect(frames).toHaveLength(3)

    decoder.decode(frames[0]!)
    expect(() => decoder.decode(frames[2]!)).toThrow('Secure fragment sequence is invalid.')
  })

  it('rejects duplicate fragment index', () => {
    const encoder = new SecureMessageCodec()
    const decoder = new SecureMessageCodec()

    const message = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES * 2)
    const frames = encoder.encode(message)
    expect(frames).toHaveLength(2)

    decoder.decode(frames[0]!)
    expect(() => decoder.decode(frames[0]!)).toThrow('Secure fragment sequence is invalid.')
  })

  it('rejects fragment with wrong chunk size', () => {
    const encoder = new SecureMessageCodec()
    const decoder = new SecureMessageCodec()

    const message = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES * 2)
    const frames = encoder.encode(message)

    const corrupted = new Uint8Array(frames[0]!.byteLength + 10)
    corrupted.set(frames[0]!)

    expect(() => decoder.decode(corrupted)).toThrow('Secure fragment length is invalid.')
  })
})

describe('SecureMessageCodec fragment header validation', () => {
  it('rejects fragment with invalid version', () => {
    const codec = new SecureMessageCodec()

    const message = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES + 1)
    const frames = new SecureMessageCodec().encode(message)
    const corrupted = new Uint8Array(frames[0]!)
    corrupted[4] = 99

    expect(() => codec.decode(corrupted)).toThrow('Secure fragment header is invalid.')
  })

  // KNOWN BUG: Same magic-prefix collision issue as above
  it.fails('treats message smaller than header size as non-fragment', () => {
    const codec = new SecureMessageCodec()

    const tiny = new Uint8Array([0x44, 0x53, 0x48, 0x46])
    // Messages smaller than SECURE_FRAGMENT_HEADER_BYTES (17) should not be fragments
    // even if they start with DSHF magic
    expect(codec.decode(tiny)).toEqual(tiny)
  })

  it('rejects fragment with messageId = 0', () => {
    const codec = new SecureMessageCodec()

    const fragment = new Uint8Array(17 + 100)
    fragment.set([0x44, 0x53, 0x48, 0x46])
    fragment[4] = 1
    const view = new DataView(fragment.buffer)
    view.setUint32(5, 0)
    view.setUint16(9, 0)
    view.setUint16(11, 2)
    view.setUint32(13, SECURE_FRAGMENT_CHUNK_BYTES + 100)

    expect(() => codec.decode(fragment)).toThrow('Secure fragment metadata is invalid.')
  })

  it('rejects fragment with total < 2', () => {
    const codec = new SecureMessageCodec()

    const fragment = new Uint8Array(17 + 100)
    fragment.set([0x44, 0x53, 0x48, 0x46])
    fragment[4] = 1
    const view = new DataView(fragment.buffer)
    view.setUint32(5, 1)
    view.setUint16(9, 0)
    view.setUint16(11, 1)
    view.setUint32(13, SECURE_FRAGMENT_CHUNK_BYTES + 100)

    expect(() => codec.decode(fragment)).toThrow('Secure fragment metadata is invalid.')
  })

  it('rejects fragment with index >= total', () => {
    const codec = new SecureMessageCodec()

    const fragment = new Uint8Array(17 + 100)
    fragment.set([0x44, 0x53, 0x48, 0x46])
    fragment[4] = 1
    const view = new DataView(fragment.buffer)
    view.setUint32(5, 1)
    view.setUint16(9, 2)
    view.setUint16(11, 2)
    view.setUint32(13, SECURE_FRAGMENT_CHUNK_BYTES + 100)

    expect(() => codec.decode(fragment)).toThrow('Secure fragment metadata is invalid.')
  })

  it('rejects fragment with totalBytes <= SECURE_FRAGMENT_CHUNK_BYTES', () => {
    const codec = new SecureMessageCodec()

    const fragment = new Uint8Array(17 + 100)
    fragment.set([0x44, 0x53, 0x48, 0x46])
    fragment[4] = 1
    const view = new DataView(fragment.buffer)
    view.setUint32(5, 1)
    view.setUint16(9, 0)
    view.setUint16(11, 2)
    view.setUint32(13, SECURE_FRAGMENT_CHUNK_BYTES)

    expect(() => codec.decode(fragment)).toThrow('Secure fragment metadata is invalid.')
  })

  it('rejects fragment with totalBytes > MAX_SECURE_MESSAGE_BYTES', () => {
    const codec = new SecureMessageCodec()

    const totalBytes = MAX_SECURE_MESSAGE_BYTES + 1
    const total = Math.ceil(totalBytes / SECURE_FRAGMENT_CHUNK_BYTES)

    const fragment = new Uint8Array(17 + SECURE_FRAGMENT_CHUNK_BYTES)
    fragment.set([0x44, 0x53, 0x48, 0x46])
    fragment[4] = 1
    const view = new DataView(fragment.buffer)
    view.setUint32(5, 1)
    view.setUint16(9, 0)
    view.setUint16(11, total)
    view.setUint32(13, totalBytes)

    expect(() => codec.decode(fragment)).toThrow('Secure fragment metadata is invalid.')
  })
})

describe('SecureMessageCodec round-trip integrity', () => {
  // KNOWN BUG: isSecureFragment() uses magic prefix detection, causing
  // unfragmented messages starting with DSHF (0x44534846) to be incorrectly
  // treated as fragments. This affects any message 4+ bytes starting with
  // those magic bytes.
  it.fails('round-trips an unfragmented message starting with fragment magic (8 bytes)', () => {
    const encoder = new SecureMessageCodec()
    const decoder = new SecureMessageCodec()

    const message = new Uint8Array([
      0x44, 0x53, 0x48, 0x46, // DSHF magic
      1, 2, 3, 4,
    ])

    const frames = encoder.encode(message)

    expect(frames).toHaveLength(1)
    expect(decoder.decode(frames[0]!)).toEqual(message)
  })

  it.fails('round-trips an unfragmented message starting with fragment magic (17 bytes)', () => {
    const encoder = new SecureMessageCodec()
    const decoder = new SecureMessageCodec()

    const message = new Uint8Array(17)
    message.set([0x44, 0x53, 0x48, 0x46, 1])

    const frames = encoder.encode(message)

    expect(frames).toHaveLength(1)
    expect(decoder.decode(frames[0]!)).toEqual(message)
  })

  it('round-trips various message sizes', () => {
    const sizes = [
      1,
      100,
      SECURE_FRAGMENT_CHUNK_BYTES - 1,
      SECURE_FRAGMENT_CHUNK_BYTES,
      SECURE_FRAGMENT_CHUNK_BYTES + 1,
      SECURE_FRAGMENT_CHUNK_BYTES * 2,
      SECURE_FRAGMENT_CHUNK_BYTES * 2 + 37,
    ]

    for (const size of sizes) {
      const encoder = new SecureMessageCodec()
      const decoder = new SecureMessageCodec()

      const message = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        message[i] = i % 251
      }

      const frames = encoder.encode(message)

      if (size <= SECURE_FRAGMENT_CHUNK_BYTES) {
        expect(frames).toHaveLength(1)
      }

      let result: Uint8Array | undefined
      for (const frame of frames) {
        result = decoder.decode(frame)
      }

      expect(result).toBeDefined()
      expect(result!.byteLength).toBe(size)
      expect(result).toEqual(message)
    }
  })

  it('resets state correctly', () => {
    const encoder = new SecureMessageCodec()
    const decoder = new SecureMessageCodec()

    const message1 = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES * 2)
    const frames1 = encoder.encode(message1)

    for (const frame of frames1) {
      decoder.decode(frame)
    }

    decoder.reset()

    const message2 = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES * 2 + 50)
    const frames2 = encoder.encode(message2)

    let result: Uint8Array | undefined
    for (const frame of frames2) {
      result = decoder.decode(frame)
    }

    expect(result).toBeDefined()
    expect(result!.byteLength).toBe(message2.byteLength)
  })

  it('handles fragment chunk boundary exactly', () => {
    const encoder = new SecureMessageCodec()
    const decoder = new SecureMessageCodec()

    const message = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES)
    const frames = encoder.encode(message)

    expect(frames).toHaveLength(1)

    const result = decoder.decode(frames[0]!)
    expect(result).toEqual(message)
  })

  it('handles fragment chunk boundary + 1', () => {
    const encoder = new SecureMessageCodec()
    const decoder = new SecureMessageCodec()

    const message = new Uint8Array(SECURE_FRAGMENT_CHUNK_BYTES + 1)
    const frames = encoder.encode(message)

    expect(frames).toHaveLength(2)

    decoder.decode(frames[0]!)
    const result = decoder.decode(frames[1]!)

    expect(result).toBeDefined()
    expect(result!.byteLength).toBe(message.byteLength)
  })
})