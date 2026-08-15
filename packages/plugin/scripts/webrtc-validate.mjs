// Node Host RTC technical validation (webrtc-implementation-plan.md §6.2).
//
// Loopback proof that the pure-TypeScript werift backend:
//   1. installs and starts without native toolchains,
//   2. establishes an `ordered` `dsh` DataChannel between two peers,
//   3. performs offer/answer + trickle ICE,
//   4. reports a selected candidate pair,
//   5. releases resources on close.
//
// Chromium interop and TURN UDP/TCP/TLS are covered by the integration suite;
// this script verifies the Node backend itself.
//
// Run: node scripts/webrtc-validate.mjs

import { RTCPeerConnection } from 'werift'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const race = (promise, ms, label) => Promise.race([
  promise,
  sleep(ms).then(() => { throw new Error(`${label} timed out after ${ms}ms`) }),
])

async function main() {
  const a = new RTCPeerConnection()
  const b = new RTCPeerConnection()

  a.onicecandidate = (event) => {
    if (event.candidate) void b.addIceCandidate(event.candidate.toJSON())
  }
  b.onicecandidate = (event) => {
    if (event.candidate) void a.addIceCandidate(event.candidate.toJSON())
  }

  const local = a.createDataChannel('dsh', { ordered: true })
  const received = []
  b.ondatachannel = (event) => {
    const remote = event.channel
    remote.onmessage = (message) => {
      const text = message.data.toString()
      received.push(text)
      remote.send(Buffer.from(`echo:${text}`))
    }
  }

  await a.setLocalDescription(await a.createOffer())
  await b.setRemoteDescription({ type: 'offer', sdp: a.localDescription.sdp })
  await b.setLocalDescription(await b.createAnswer())
  await a.setRemoteDescription({ type: 'answer', sdp: b.localDescription.sdp })

  await race(new Promise((resolve) => { local.onopen = resolve }), 8_000, 'DataChannel open')

  const echo = []
  local.onmessage = (message) => { echo.push(message.data.toString()) }
  local.send(Buffer.from('hello'))

  const deadline = Date.now() + 5_000
  while (received.length < 1 || echo.length < 1) {
    if (Date.now() > deadline) throw new Error('DataChannel round-trip timeout')
    await sleep(20)
  }

  const stats = await a.getStats()
  let candidateType = 'unknown'
  for (const entry of stats.values()) {
    if (entry.type !== 'candidate-pair' || !(entry.nominated || entry.selected)) continue
    const localCandidate = stats.get(entry.localCandidateId)
    const remoteCandidate = stats.get(entry.remoteCandidateId)
    candidateType = localCandidate?.candidateType === 'relay' || remoteCandidate?.candidateType === 'relay'
      ? 'turn'
      : 'p2p'
  }

  console.log(JSON.stringify({
    ok: true,
    roundTrip: { sent: 'hello', received: received[0], echo: echo[0] },
    candidateType,
    dataChannel: { label: local.label, ordered: local.ordered, readyState: local.readyState },
  }, null, 2))

  await a.close()
  await b.close()
}

main().catch((error) => {
  console.error('webrtc validation failed:', error.message)
  process.exitCode = 1
})
