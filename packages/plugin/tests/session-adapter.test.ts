import type { AgentRegistry } from '@deepseek-ai/dsh-agent'
import type { Session, SessionEvent, SessionStore } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'
import { SessionAdapter } from '../src/adapters/session-adapter.js'
import { WorkspaceAdapter } from '../src/adapters/workspace-adapter.js'
import { EventSequencer } from '../src/event-sequencer.js'
import { PendingApprovals } from '../src/pending-approvals.js'

describe('SessionAdapter', () => {
  it('maps Harness assistant chunks to one ordered remote stream', () => {
    const session = fakeSession([])
    const adapter = createAdapter(session)
    const first = adapter.mapEvent(session, event('assistant/chunk', 0, {
      turn: 1, step: 2, chunk: { type: 'text-delta', index: 0, text: 'Hello ' },
    }))
    const second = adapter.mapEvent(session, event('assistant/chunk', 1, {
      turn: 1, step: 2, chunk: { type: 'text-delta', index: 0, text: 'remote' },
    }))
    const final = adapter.mapEvent(session, event('assistant/message', 2, {
      turn: 1, step: 2, message: { id: 'provider-message', role: 'assistant', content: [{ type: 'text', text: 'Hello remote' }] },
    }))

    expect(first).toHaveLength(2)
    expect(first[0]).toMatchObject({ event: 'message.created', data: { messageId: 'assistant:s1:1:2', status: 'streaming' } })
    expect(first[1]).toMatchObject({ event: 'message.delta', data: { deltaIndex: 0, delta: 'Hello ', final: false } })
    expect(second[0]).toMatchObject({ data: { deltaIndex: 1, delta: 'remote' } })
    expect(final[0]).toMatchObject({ data: { deltaIndex: 2, delta: '', final: true } })
  })

  it('builds a stable snapshot from Harness message and tool events', () => {
    const events = [
      event('user/message', 0, { id: 'u1', role: 'user', content: [{ type: 'text', text: 'Run tests' }] }),
      event('tool/call', 1, { turn: 1, step: 1, callId: 'c1', name: 'bash', arguments: '{"command":"pnpm test"}' }),
      event('tool/result', 2, {
        turn: 1,
        step: 1,
        message: { source: { callId: 'c1' }, content: [{ type: 'tool-result', toolCallId: 'c1', content: [{ type: 'text', text: 'ok' }], isError: false }] },
      }),
      event('assistant/message', 3, {
        turn: 1, step: 1, message: { id: 'a1', role: 'assistant', content: [{ type: 'text', text: 'Passed' }] },
      }),
    ]
    const session = fakeSession(events)
    const snapshot = createAdapter(session).get('s1')
    expect(snapshot.messages).toMatchObject([
      { id: 'u1', text: 'Run tests', role: 'user' },
      { id: 'assistant:s1:1:1', text: 'Passed', role: 'assistant' },
    ])
    expect(snapshot.tools).toMatchObject([{
      callId: 'c1', toolName: 'bash', status: 'success', input: { command: 'pnpm test' }, isError: false,
    }])
    expect(snapshot.session).toMatchObject({ id: 's1', title: 'Run tests', status: 'idle' })
  })
})

function createAdapter(session: Session): SessionAdapter {
  return new SessionAdapter(
    { get: () => session, list: () => [session] } as unknown as SessionStore,
    { get: () => ({ status: 'idle' }) } as unknown as AgentRegistry,
    new WorkspaceAdapter(),
    new PendingApprovals(1_000, () => undefined),
    new EventSequencer(),
  )
}

function fakeSession(events: SessionEvent[]): Session {
  return {
    id: 's1',
    header: { id: 's1', version: 0, createdAt: 1, cwd: '/repo' },
    events,
  } as unknown as Session
}

function event(type: string, seq: number, data: Record<string, unknown>): SessionEvent {
  return { type, seq, time: seq + 10, data } as unknown as SessionEvent
}
