import { describe, expect, it } from 'vitest'
import { RemoteClientError, type RemoteClientCore, type RemoteClientErrorCode } from '@dsh-remote/client-core'
import { RemoteHarnessApiProxy } from '../src/remote-api-proxy.js'

function clientThatFailsWith(error: Error): RemoteClientCore {
  return {
    rpc: async () => { throw error },
    onEvent: () => () => undefined,
    onClose: () => () => undefined,
  } as unknown as RemoteClientCore
}

function clientThatReturns(response: unknown): RemoteClientCore {
  return {
    rpc: async () => response,
    onEvent: () => () => undefined,
    onClose: () => () => undefined,
  } as unknown as RemoteClientCore
}

describe('RemoteHarnessApiProxy', () => {
  it('backfills the RC8 home field for an RC7 host.describe response', async () => {
    const proxy = new RemoteHarnessApiProxy(clientThatReturns({
      rpcId: 'describe-1',
      result: {
        ok: true,
        value: {
          version: '0.0.1',
          cwd: '/home/tester',
          attachedSessions: 0,
          canOpenPath: true,
        },
      },
    }))

    await expect(proxy.api.host.describe({ rpcId: 'describe-1' as never, payload: {} }))
      .resolves.toMatchObject({ result: { ok: true, value: { cwd: '/home/tester', home: '/home/tester' } } })
  })

  it.each([
    'TRANSPORT_CLOSED',
    'CLIENT_CLOSED',
  ] satisfies RemoteClientErrorCode[])('ends an event stream cleanly on %s', async code => {
    const proxy = new RemoteHarnessApiProxy(clientThatFailsWith(new RemoteClientError(code, 'remote disconnected')))
    const frames = []

    for await (const frame of proxy.api.events.mux({ rpcId: 'mux-1' as never, payload: {} }, new AbortController().signal)) {
      frames.push(frame)
    }

    expect(frames).toEqual([])
  })

  it('does not classify legacy disconnect text without a structured error code', async () => {
    const proxy = new RemoteHarnessApiProxy(clientThatFailsWith(new Error('remote client closed')))
    const consume = async () => {
      for await (const _frame of proxy.api.events.mux({ rpcId: 'mux-1' as never, payload: {} }, new AbortController().signal)) {
        // no-op
      }
    }

    await expect(consume()).rejects.toThrow('remote client closed')
  })

  it('preserves unexpected event stream failures', async () => {
    const proxy = new RemoteHarnessApiProxy(clientThatFailsWith(new Error('invalid remote response')))
    const consume = async () => {
      for await (const _frame of proxy.api.events.mux({ rpcId: 'mux-1' as never, payload: {} }, new AbortController().signal)) {
        // no-op
      }
    }

    await expect(consume()).rejects.toThrow('invalid remote response')
  })
})
