import { describe, expect, it } from 'vitest'
import { EventSequencer, FullResyncRequiredError } from '../src/event-sequencer.js'

describe('EventSequencer', () => {
  it('assigns host-global sequence numbers and pages replay', () => {
    const sequencer = new EventSequencer(10)
    sequencer.publish('session.created', { id: 's1' }, 's1')
    sequencer.publish('agent.status', { status: 'running' }, 's1')
    sequencer.publish('message.delta', { delta: 'a' }, 's1')
    expect(sequencer.replay(0, 2)).toMatchObject({
      events: [{ payload: { seq: 1 } }, { payload: { seq: 2 } }],
      lastSeq: 3,
      hasMore: true,
    })
    expect(sequencer.replay(2)).toMatchObject({ events: [{ payload: { seq: 3 } }], hasMore: false })
  })

  it('requires full resync after the bounded window is lost', () => {
    const sequencer = new EventSequencer(2)
    sequencer.publish('agent.status', {}, 's1')
    sequencer.publish('agent.status', {}, 's1')
    sequencer.publish('agent.status', {}, 's1')
    expect(() => sequencer.replay(0)).toThrow(FullResyncRequiredError)
    expect(sequencer.replay(1).events).toHaveLength(2)
  })
})
