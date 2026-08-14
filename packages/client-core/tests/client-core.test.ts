import { describe, expect, it } from 'vitest'
import { createRpcResponse, encodeMessage } from '@dsh-remote/protocol'
import { BaseTransport } from '@dsh-remote/webrtc'
import { RemoteClientCore } from '../src/index.js'

class LoopbackTransport extends BaseTransport {
  sent: Uint8Array[] = []
  async connect() {}
  async send(data: Uint8Array) { this.sent.push(data) }
  async close() {}
  getStats() { return { mode: 'Relay' as const, connected: true } }
  push(data: Uint8Array) { this.emit(data) }
}

describe('RemoteClientCore', () => {
  it('matches responses to pending RPC calls', async () => {
    const transport = new LoopbackTransport()
    const client = new RemoteClientCore(transport)
    await client.connect()
    const call = client.rpc('connection.ping', {})
    const request = JSON.parse(new TextDecoder().decode(transport.sent[0]!))
    transport.push(encodeMessage(createRpcResponse(request.id, { ok: true })))
    await expect(call).resolves.toEqual({ ok: true })
  })
})
