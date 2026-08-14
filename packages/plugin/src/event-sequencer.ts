import { createEvent, type EventPayload, type RemoteEventName, type RemoteMessage } from '@dsh-remote/protocol'

export interface ReplayResult {
  events: RemoteMessage<EventPayload>[]
  lastSeq: number
  hasMore: boolean
}

export class FullResyncRequiredError extends Error {
  readonly code = 'FULL_RESYNC_REQUIRED'
  constructor(readonly currentSeq: number) {
    super('The requested event replay window is no longer available.')
  }
}

export class EventSequencer {
  private seq = 0
  private readonly events: RemoteMessage<EventPayload>[] = []

  constructor(private readonly maxEvents = 10_000, private readonly maxAgeMs = 15 * 60_000) {
    if (!Number.isSafeInteger(maxEvents) || maxEvents < 1) throw new TypeError('maxEvents must be a positive safe integer')
    if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 1) throw new TypeError('maxAgeMs must be a positive safe integer')
  }

  currentSeq(): number { return this.seq }

  publish<TData>(event: RemoteEventName, data: TData, sessionId?: string): RemoteMessage<EventPayload<TData>> {
    const message = createEvent(event, data, {
      seq: ++this.seq,
      ...(sessionId === undefined ? {} : { sessionId }),
    })
    this.events.push(message as RemoteMessage<EventPayload>)
    this.trim(message.timestamp)
    return message
  }

  replay(afterSeq: number, limit = 1_000): ReplayResult {
    if (!Number.isSafeInteger(afterSeq) || afterSeq < 0) throw new TypeError('afterSeq must be a non-negative safe integer')
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) throw new TypeError('limit must be between 1 and 1000')
    this.trim(Date.now())
    if (afterSeq >= this.seq) return { events: [], lastSeq: this.seq, hasMore: false }
    const firstSeq = this.events[0]?.payload.seq
    if (firstSeq === undefined || firstSeq > afterSeq + 1) throw new FullResyncRequiredError(this.seq)
    const events = this.events.filter(event => event.payload.seq! > afterSeq).slice(0, limit)
    const lastReturned = events.at(-1)?.payload.seq ?? afterSeq
    return { events, lastSeq: this.seq, hasMore: lastReturned < this.seq }
  }

  private trim(now: number): void {
    const oldest = now - this.maxAgeMs
    while (this.events.length > this.maxEvents || (this.events[0]?.timestamp ?? now) < oldest) this.events.shift()
  }
}
