import { describe, expect, it } from 'vitest'
import type { EventPayload } from '@dsh-remote/protocol'
import { applyRemoteEvent } from '../src/state/event-reducer'

describe('remote event reducer', () => {
  it('assembles streaming assistant deltas', () => {
    const first: EventPayload = { event: 'message.delta', data: { sessionId: 's1', messageId: 'm1', delta: 'Hello ' } }
    const second: EventPayload = { event: 'message.delta', data: { sessionId: 's1', messageId: 'm1', delta: 'Android' } }
    const items = applyRemoteEvent(applyRemoteEvent([], first), second)
    expect(items).toMatchObject([{ kind: 'message', id: 'm1', role: 'assistant', text: 'Hello Android', streaming: true }])
  })

  it('adds and resolves permission requests', () => {
    const requested: EventPayload = {
      event: 'permission.requested',
      data: { requestId: 'p1', sessionId: 's1', permission: { kind: 'command', command: 'pnpm test', cwd: '/repo' } },
    }
    const resolved: EventPayload = { event: 'permission.resolved', data: { requestId: 'p1', sessionId: 's1', decision: 'allow_once' } }
    const items = applyRemoteEvent(applyRemoteEvent([], requested), resolved)
    expect(items[0]).toMatchObject({
      kind: 'permission',
      request: { requestId: 'p1', permission: { kind: 'command', command: 'pnpm test' } },
      decision: 'allow_once',
    })
  })
})
