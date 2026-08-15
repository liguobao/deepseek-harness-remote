import { RtcDataChannelTransport } from '@dsh-remote/webrtc'
import { describe, expect, it } from 'vitest'
import { loadWeriftFactory } from '../src/werift-rtc.js'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

async function waitFor(condition: () => boolean, label: string, timeoutMs = 8_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`${label} timed out after ${timeoutMs}ms`)
    await sleep(20)
  }
}

describe('werift RTC backend', () => {
  it('loads and establishes an ordered DataChannel through the adapter', async () => {
    const factory = await loadWeriftFactory()
    expect(factory).toBeDefined()

    const initiatorReceived: Uint8Array[] = []
    const responderReceived: Uint8Array[] = []

    const initiator = new RtcDataChannelTransport({
      role: 'initiator',
      factory: factory!,
      onSignal: signal => responder.handleSignal(signal),
      negotiateTimeoutMs: 8_000,
    })
    const responder = new RtcDataChannelTransport({
      role: 'responder',
      factory: factory!,
      onSignal: signal => initiator.handleSignal(signal),
      negotiateTimeoutMs: 8_000,
    })
    initiator.onMessage(data => initiatorReceived.push(data))
    responder.onMessage(data => responderReceived.push(data))

    await Promise.all([initiator.connect(), responder.connect()])
    await initiator.send(new TextEncoder().encode('hello-from-adapter'))
    await waitFor(() => responderReceived.length === 1, 'responder receive')
    await responder.send(new TextEncoder().encode('reply'))
    await waitFor(() => initiatorReceived.length === 1, 'initiator receive')

    expect(new TextDecoder().decode(responderReceived[0]!)).toBe('hello-from-adapter')
    expect(new TextDecoder().decode(initiatorReceived[0]!)).toBe('reply')
    expect(initiator.selectedTransport() ?? responder.selectedTransport()).toBe('p2p')

    await initiator.close()
    await responder.close()
    expect(initiator.getStats().connected).toBe(false)
    expect(responder.getStats().connected).toBe(false)
  }, 20_000)

  it('delivers many concurrent ordered frames without loss or reordering', async () => {
    const factory = await loadWeriftFactory()
    expect(factory).toBeDefined()

    const received: string[] = []
    const initiator = new RtcDataChannelTransport({
      role: 'initiator',
      factory: factory!,
      onSignal: signal => responder.handleSignal(signal),
      negotiateTimeoutMs: 8_000,
    })
    const responder = new RtcDataChannelTransport({
      role: 'responder',
      factory: factory!,
      onSignal: signal => initiator.handleSignal(signal),
      negotiateTimeoutMs: 8_000,
    })
    responder.onMessage(data => received.push(new TextDecoder().decode(data)))

    await Promise.all([initiator.connect(), responder.connect()])
    // Fire many sends without awaiting each, exercising the send-chain path.
    const pending = Array.from({ length: 60 }, (_, index) =>
      initiator.send(new TextEncoder().encode(`frame-${index}`)))
    await Promise.all(pending)
    await waitFor(() => received.length === 60, 'all frames received', 15_000)

    expect(received).toEqual(Array.from({ length: 60 }, (_, index) => `frame-${index}`))
    await initiator.close()
    await responder.close()
  }, 30_000)
})
