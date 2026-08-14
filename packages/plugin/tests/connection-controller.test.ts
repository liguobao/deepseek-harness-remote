import { createRpcRequest, type RemoteMessage } from '@dsh-remote/protocol'
import { describe, expect, it, vi } from 'vitest'
import { ConnectionController, ConnectionRejectedError } from '../src/connection-controller.js'
import type { IdentityStore } from '../src/identity-store.js'
import type { RpcRouter } from '../src/rpc-router.js'
import type { AuthenticatedPeerChannel } from '../src/types.js'

describe('ConnectionController', () => {
  it('rejects an identity that is absent from local trust', async () => {
    const channel = fakeChannel()
    const controller = new ConnectionController(
      { isTrusted: () => false } as unknown as IdentityStore,
      { handle: vi.fn(), closePeerStreams: vi.fn() } as unknown as RpcRouter,
    )
    await expect(controller.accept(channel)).rejects.toBeInstanceOf(ConnectionRejectedError)
    expect(channel.close).toHaveBeenCalledWith('PEER_IDENTITY_MISMATCH')
  })

  it('replaces the old peer and closes its ApiProxy streams', async () => {
    const response = createRpcRequest('harness.api.call', {}) as RemoteMessage
    const router = { handle: vi.fn(async () => response), closePeerStreams: vi.fn(async () => undefined) } as unknown as RpcRouter
    const controller = new ConnectionController(
      { isTrusted: () => true } as unknown as IdentityStore,
      router,
    )
    const first = fakeChannel()
    const second = fakeChannel()
    await controller.accept(first)
    await controller.accept(second)
    expect(first.close).toHaveBeenCalledWith('CONNECTION_REPLACED')
    expect(router.closePeerStreams).toHaveBeenCalledOnce()

    second.push(createRpcRequest('harness.api.call', { method: 'session.list' }))
    await vi.waitFor(() => expect(second.send).toHaveBeenCalled())
  })
})

function fakeChannel(): AuthenticatedPeerChannel & { push(message: RemoteMessage): void } {
  let handler: (message: RemoteMessage) => void = () => undefined
  return {
    security: { protocol: 'Noise_IK_25519_ChaChaPoly_SHA256', connectionId: 'connection-1', membershipId: 'membership-1' },
    peerDeviceId: 'client-1',
    peerIdentityKey: 'key-1',
    send: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    onMessage: vi.fn(next => { handler = next; return () => { handler = () => undefined } }),
    push: message => handler(message),
  }
}
