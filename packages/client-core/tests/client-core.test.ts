import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRpcResponse, encodeMessage } from '@dsh-remote/protocol'
import { BaseTransport } from '@dsh-remote/webrtc'
import { RemoteClientCore, RemoteClientError } from '../src/index.js'

class LoopbackTransport extends BaseTransport {
  sent: Uint8Array[] = []
  sendGate?: Promise<void>
  closeError?: Error

  async connect() {}

  async send(data: Uint8Array) {
    this.sent.push(data)
    await this.sendGate
  }

  async close() {
    if (this.closeError !== undefined) throw this.closeError
  }

  getStats() { return { mode: 'Relay' as const, connected: true } }
  push(data: Uint8Array) { this.emit(data) }
  drop() { this.emitClose() }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('RemoteClientCore', () => {
  it('matches responses to pending RPC calls', async () => {
    const transport = new LoopbackTransport()
    const client = new RemoteClientCore(transport)
    await client.connect()
    const call = client.rpc('harness.api.call', {})
    const request = JSON.parse(new TextDecoder().decode(transport.sent[0]!))
    transport.push(encodeMessage(createRpcResponse(request.id, { ok: true })))
    await expect(call).resolves.toEqual({ ok: true })
  })

  it('uses TRANSPORT_CLOSED when the transport terminates a pending RPC', async () => {
    const transport = new LoopbackTransport()
    const client = new RemoteClientCore(transport)
    await client.connect()
    let closed = false
    client.onClose(() => { closed = true })
    const call = client.rpc('harness.api.call', {})

    transport.drop()

    await expect(call).rejects.toMatchObject({
      name: 'RemoteClientError',
      code: 'TRANSPORT_CLOSED',
    })
    expect(closed).toBe(true)
  })

  it('uses CLIENT_CLOSED when close terminates a pending RPC', async () => {
    const transport = new LoopbackTransport()
    const client = new RemoteClientCore(transport)
    await client.connect()
    const call = client.rpc('harness.api.call', {})

    await client.close()

    await expect(call).rejects.toMatchObject({
      name: 'RemoteClientError',
      code: 'CLIENT_CLOSED',
    })
  })

  it('rejects pending RPCs before a failing transport close completes', async () => {
    const transport = new LoopbackTransport()
    transport.closeError = new Error('transport close failed')
    const client = new RemoteClientCore(transport)
    await client.connect()
    const call = client.rpc('harness.api.call', {})
    const termination = expect(call).rejects.toMatchObject({ code: 'CLIENT_CLOSED' })

    await expect(client.close()).rejects.toThrow('transport close failed')
    await termination
  })

  it('uses RPC_TIMEOUT when a pending RPC reaches its deadline', async () => {
    vi.useFakeTimers()
    const transport = new LoopbackTransport()
    const client = new RemoteClientCore(transport, 1_000)
    await client.connect()
    const call = client.rpc('harness.api.call', {})
    const termination = expect(call).rejects.toMatchObject({
      name: 'RemoteClientError',
      code: 'RPC_TIMEOUT',
    })

    await vi.advanceTimersByTimeAsync(1_000)

    await termination
  })

  it('times out even when transport.send never settles', async () => {
    vi.useFakeTimers()
    const transport = new LoopbackTransport()
    transport.sendGate = new Promise<void>(() => undefined)
    const client = new RemoteClientCore(transport, 1_000)
    await client.connect()
    const call = client.rpc('harness.api.call', {})
    const termination = expect(call).rejects.toMatchObject({ code: 'RPC_TIMEOUT' })

    await vi.advanceTimersByTimeAsync(1_000)

    await termination
  })

  it('uses RPC_ABORTED and preserves the abort reason as the cause', async () => {
    const transport = new LoopbackTransport()
    const client = new RemoteClientCore(transport)
    const controller = new AbortController()
    await client.connect()
    const call = client.rpc('harness.api.call', {}, controller.signal)
    const reason = new Error('cancelled by caller')

    controller.abort(reason)

    await expect(call).rejects.toMatchObject({
      name: 'RemoteClientError',
      code: 'RPC_ABORTED',
      cause: reason,
    })
  })

  it('aborts even when transport.send never settles', async () => {
    const transport = new LoopbackTransport()
    transport.sendGate = new Promise<void>(() => undefined)
    const client = new RemoteClientCore(transport)
    const controller = new AbortController()
    await client.connect()
    const call = client.rpc('harness.api.call', {}, controller.signal)

    controller.abort()

    await expect(call).rejects.toMatchObject({ code: 'RPC_ABORTED' })
  })

  it('uses RPC_ABORTED for an already-aborted signal', async () => {
    const transport = new LoopbackTransport()
    const client = new RemoteClientCore(transport)
    const controller = new AbortController()
    controller.abort('cancelled before dispatch')
    await client.connect()

    await expect(client.rpc('harness.api.call', {}, controller.signal)).rejects.toMatchObject({
      name: 'RemoteClientError',
      code: 'RPC_ABORTED',
      cause: 'cancelled before dispatch',
    })
    expect(transport.sent).toHaveLength(0)
  })

  it('keeps the first termination reason when send fails after transport close', async () => {
    let rejectSend!: (error: Error) => void
    const transport = new LoopbackTransport()
    transport.sendGate = new Promise<void>((_, reject) => { rejectSend = reject })
    const client = new RemoteClientCore(transport)
    await client.connect()
    const call = client.rpc('harness.api.call', {})
    const termination = expect(call).rejects.toMatchObject({ code: 'TRANSPORT_CLOSED' })

    transport.drop()
    rejectSend(new Error('socket write failed'))

    await termination
  })

  it('ignores late responses after a call has already terminated', async () => {
    const transport = new LoopbackTransport()
    const client = new RemoteClientCore(transport)
    const controller = new AbortController()
    await client.connect()
    const call = client.rpc('harness.api.call', {}, controller.signal)
    const request = JSON.parse(new TextDecoder().decode(transport.sent[0]!))
    controller.abort()
    await expect(call).rejects.toBeInstanceOf(RemoteClientError)

    transport.push(encodeMessage(createRpcResponse(request.id, { late: true })))
  })
})
