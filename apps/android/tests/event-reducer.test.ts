import { describe, expect, it } from 'vitest'
import type { ChatItem, MuxStreamFrame, NativeSessionEvent } from '../src/types'
import { applyMuxFrame, applyMuxFrameToMessages, foldHistory } from '../src/state/event-reducer'

function sessionEvent(event: Partial<NativeSessionEvent> & { type: string; data: Record<string, unknown> }): NativeSessionEvent {
  return {
    seq: 0,
    time: 1786000000000,
    ...event,
  } as NativeSessionEvent
}

function frame(rpcId: string, payload: { type: string } & Record<string, unknown>): MuxStreamFrame {
  return { rpcId, payload: payload as MuxStreamFrame['payload'] }
}

describe('remote mux frame reducer', () => {
  it('assembles streaming assistant chunks into a finalized message', () => {
    const chunk: MuxStreamFrame = frame('', {
      type: 'session/event',
      sessionId: 's1',
      event: sessionEvent({
        type: 'assistant/chunk',
        data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'Hello ' } },
      }),
    })
    const chunkTwo: MuxStreamFrame = frame('', {
      type: 'session/event',
      sessionId: 's1',
      event: sessionEvent({
        type: 'assistant/chunk',
        data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'Android' } },
      }),
    })
    const finalized: MuxStreamFrame = frame('', {
      type: 'session/event',
      sessionId: 's1',
      event: sessionEvent({
        type: 'assistant/message',
        data: {
          turn: 1, step: 1,
          message: { id: 'm1', role: 'assistant', content: [{ type: 'text', text: 'Hello Android' }] },
        },
      }),
    })
    let items = applyMuxFrame([], chunk)
    items = applyMuxFrame(items, chunkTwo)
    expect(items).toMatchObject([{ kind: 'message', role: 'assistant', text: 'Hello Android', streaming: true }])
    items = applyMuxFrame(items, finalized)
    expect(items).toEqual([expect.objectContaining({ kind: 'message', id: 'm1', role: 'assistant', text: 'Hello Android' })])
    expect(items[0]).not.toHaveProperty('streaming')
  })

  it('adds user messages and tool activities from history events', () => {
    const events = [
      sessionEvent({
        type: 'user/message',
        data: { message: { id: 'u1', role: 'user', content: [{ type: 'text', text: 'Check the repo' }] } },
      }),
      sessionEvent({ type: 'tool/call', data: { callId: 'c1', name: 'bash', arguments: '{"command":"git status"}' } }),
    ]
    const items = foldHistory(events.map(event => ({ event })), 's1')
    expect(items).toMatchObject([
      { kind: 'message', id: 'u1', role: 'user', text: 'Check the repo' },
      { kind: 'tool', id: 'c1', toolName: 'bash', state: 'running' },
    ])
  })

  it('reconciles an optimistic user message through the native prompt rpcId', () => {
    const optimistic: ChatItem = {
      kind: 'message',
      id: 'local-1',
      sessionId: 's1',
      role: 'user',
      text: 'Check the repo',
      requestRpcId: 'prompt-rpc-1',
      createdAt: 1,
    }
    const echoed = frame('push-1', {
      type: 'session/event',
      sessionId: 's1',
      event: sessionEvent({
        type: 'user/message',
        data: {
          message: {
            id: 'user-message-1',
            role: 'user',
            content: [{ type: 'text', text: 'Check the repo' }],
            source: { kind: 'user', rpcId: 'prompt-rpc-1' },
          },
        },
      }),
    })
    expect(applyMuxFrame([optimistic], echoed)).toEqual([
      expect.objectContaining({ id: 'user-message-1', text: 'Check the repo' }),
    ])
  })

  it('routes aggregated mux frames to their owning session', () => {
    const s2Approval = frame('rpc-approval-s2', {
      type: 'approval/requested',
      sessionId: 's2',
      approvalId: 'approval-s2',
      toolName: 'bash',
    })
    const messages = applyMuxFrameToMessages({ s1: [] }, s2Approval)
    expect(messages.s1).toEqual([])
    expect(messages.s2).toEqual([
      expect.objectContaining({ sessionId: 's2', frameRpcId: 'rpc-approval-s2' }),
    ])
  })

  it('adds and resolves approval requests with the frame rpcId', () => {
    const requested: MuxStreamFrame = frame('rpc-approval-1', {
      type: 'approval/requested',
      sessionId: 's1',
      approvalId: 'a1',
      toolName: 'bash',
      reason: 'Run npm test',
    })
    const resolved: MuxStreamFrame = frame('', {
      type: 'approval/resolved',
      sessionId: 's1',
      approvalId: 'a1',
      outcome: 'allowed-once',
    })
    let items = applyMuxFrame([], requested)
    expect(items).toMatchObject([{
      kind: 'approval', id: 'approval:a1', approvalId: 'a1', frameRpcId: 'rpc-approval-1', toolName: 'bash',
    }])
    items = applyMuxFrame(items, resolved)
    expect(items).toMatchObject([{ kind: 'approval', outcome: 'allowed-once' }])
  })

  it('adds and resolves question requests', () => {
    const requested: MuxStreamFrame = frame('rpc-question-1', {
      type: 'question/requested',
      sessionId: 's1',
      questions: [{ id: 'q1', question: 'Continue?', options: [{ label: 'Yes' }, { label: 'No' }] }],
    })
    const resolved: MuxStreamFrame = frame('', {
      type: 'question/resolved',
      sessionId: 's1',
      questionRpcId: 'rpc-question-1',
      outcome: 'answered',
    })
    let items = applyMuxFrame([], requested)
    expect(items).toMatchObject([{ kind: 'question', frameRpcId: 'rpc-question-1', questions: [{ id: 'q1' }] }])
    items = applyMuxFrame(items, resolved)
    expect(items).toMatchObject([{ kind: 'question', outcome: 'answered' }])
  })
})
