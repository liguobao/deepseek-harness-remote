/**
 * WebRTC transport-level chunking (webrtc-implementation-plan workaround).
 *
 * werift's SCTP `send()` blocks until a whole message is handed to the wire
 * through the slow-start congestion window, which stalls for large messages
 * when the peer is Chromium. To keep every DataChannel message small, large
 * Noise ciphertext frames are split here — *below* the DataChannel, *above*
 * Noise — and transparently reassembled on the other side. The Remote Protocol
 * and Noise semantics are untouched; this layer only changes how ciphertext
 * bytes are framed over the DataChannel.
 *
 * Frame layout (only when the payload exceeds the chunk size):
 *
 *   [0..4)  magic  "RTCH"
 *   [4..8)  messageId  uint32
 *   [8..10) index      uint16
 *   [10..12) total     uint16
 *   [12..)  payload    up to RTC_CHUNK_PAYLOAD_BYTES
 */

export const RTC_CHUNK_MAGIC = new Uint8Array([0x52, 0x54, 0x43, 0x48]) // "RTCH"
export const RTC_CHUNK_HEADER_BYTES = 12
export const RTC_CHUNK_PAYLOAD_BYTES = 8 * 1024
export const RTC_CHUNK_MAX_MESSAGE_BYTES = 4 * 1024 * 1024
const RTC_CHUNK_MAX_TOTAL = Math.ceil(RTC_CHUNK_MAX_MESSAGE_BYTES / RTC_CHUNK_PAYLOAD_BYTES)
const MAX_IN_FLIGHT_MESSAGES = 8
const MAX_ASSEMBLY_AGE_MS = 30_000

interface Assembly {
  messageId: number
  total: number
  receivedBytes: number
  chunks: Uint8Array[]
  updatedAt: number
}

export class RtcChunkCodec {
  private nextMessageId = 1
  private readonly assemblies = new Map<number, Assembly>()

  encode(data: Uint8Array): Uint8Array[] {
    if (data.byteLength <= RTC_CHUNK_PAYLOAD_BYTES) return [data]
    if (data.byteLength > RTC_CHUNK_MAX_MESSAGE_BYTES) {
      throw new Error('WebRTC transport message exceeds the reassembly limit.')
    }
    const messageId = this.nextMessageId
    this.nextMessageId = messageId === 0xffff_ffff ? 1 : messageId + 1
    const total = Math.ceil(data.byteLength / RTC_CHUNK_PAYLOAD_BYTES)
    const frames: Uint8Array[] = []
    for (let index = 0; index < total; index += 1) {
      const start = index * RTC_CHUNK_PAYLOAD_BYTES
      const chunk = data.subarray(start, Math.min(data.byteLength, start + RTC_CHUNK_PAYLOAD_BYTES))
      const frame = new Uint8Array(RTC_CHUNK_HEADER_BYTES + chunk.byteLength)
      frame.set(RTC_CHUNK_MAGIC)
      const view = new DataView(frame.buffer)
      view.setUint32(4, messageId)
      view.setUint16(8, index)
      view.setUint16(10, total)
      frame.set(chunk, RTC_CHUNK_HEADER_BYTES)
      frames.push(frame)
    }
    return frames
  }

  decode(frame: Uint8Array): Uint8Array | undefined {
    if (!isChunk(frame)) {
      if (frame.byteLength > RTC_CHUNK_MAX_MESSAGE_BYTES) {
        throw new Error('WebRTC transport message exceeds the reassembly limit.')
      }
      return frame
    }
    if (frame.byteLength < RTC_CHUNK_HEADER_BYTES) throw new Error('WebRTC transport chunk header is invalid.')
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
    const messageId = view.getUint32(4)
    const index = view.getUint16(8)
    const total = view.getUint16(10)
    if (messageId === 0 || total < 2 || total > RTC_CHUNK_MAX_TOTAL || index >= total) {
      throw new Error('WebRTC transport chunk metadata is invalid.')
    }
    const chunk = frame.subarray(RTC_CHUNK_HEADER_BYTES)
    if (chunk.byteLength > RTC_CHUNK_PAYLOAD_BYTES
      || (index < total - 1 && chunk.byteLength !== RTC_CHUNK_PAYLOAD_BYTES)
      || (index === total - 1 && chunk.byteLength === 0)) {
      throw new Error('WebRTC transport chunk length is invalid.')
    }

    this.pruneStale()
    let assembly = this.assemblies.get(messageId)
    if (assembly === undefined) {
      if (index !== 0 || this.assemblies.size >= MAX_IN_FLIGHT_MESSAGES) {
        throw new Error('WebRTC transport chunk sequence is invalid.')
      }
      assembly = { messageId, total, receivedBytes: 0, chunks: [], updatedAt: Date.now() }
      this.assemblies.set(messageId, assembly)
    }
    if (assembly.total !== total || index !== assembly.chunks.length) {
      this.assemblies.delete(messageId)
      throw new Error('WebRTC transport chunk sequence is invalid.')
    }
    const receivedBytes = assembly.receivedBytes + chunk.byteLength
    if (receivedBytes > RTC_CHUNK_MAX_MESSAGE_BYTES) {
      this.assemblies.delete(messageId)
      throw new Error('WebRTC transport message exceeds the reassembly limit.')
    }
    assembly.chunks.push(Uint8Array.from(chunk))
    assembly.receivedBytes = receivedBytes
    assembly.updatedAt = Date.now()
    if (assembly.chunks.length < total) return undefined
    this.assemblies.delete(messageId)
    const message = new Uint8Array(assembly.receivedBytes)
    let offset = 0
    for (const part of assembly.chunks) {
      message.set(part, offset)
      offset += part.byteLength
    }
    return message
  }

  reset(): void {
    this.nextMessageId = 1
    this.assemblies.clear()
  }

  private pruneStale(): void {
    const now = Date.now()
    for (const [messageId, assembly] of this.assemblies) {
      if (now - assembly.updatedAt > MAX_ASSEMBLY_AGE_MS) this.assemblies.delete(messageId)
    }
  }
}

function isChunk(frame: Uint8Array): boolean {
  if (frame.byteLength < RTC_CHUNK_MAGIC.byteLength) return false
  for (let index = 0; index < RTC_CHUNK_MAGIC.byteLength; index += 1) {
    if (frame[index] !== RTC_CHUNK_MAGIC[index]) return false
  }
  return true
}
