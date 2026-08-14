import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import type { RemotePermissionRequest } from './types.js'

interface PendingEntry {
  request: RemotePermissionRequest
  resolve: (outcome: ApprovalOutcome) => void
  timer: ReturnType<typeof setTimeout>
  detachAbort?: () => void
}

export class PendingApprovals {
  private readonly pending = new Map<string, PendingEntry>()

  constructor(
    private readonly timeoutMs: number,
    private readonly onResolved: (request: RemotePermissionRequest, outcome: ApprovalOutcome) => void,
  ) {}

  open(request: RemotePermissionRequest, signal?: AbortSignal): Promise<ApprovalOutcome> {
    if (this.pending.has(request.requestId)) throw new Error(`approval ${request.requestId} is already pending`)
    if (signal?.aborted) return Promise.resolve('cancelled')
    return new Promise<ApprovalOutcome>((resolve) => {
      const timer = setTimeout(() => this.settle(request.requestId, 'unavailable'), this.timeoutMs)
      const entry: PendingEntry = { request, resolve, timer }
      if (signal !== undefined) {
        const onAbort = () => this.settle(request.requestId, 'cancelled')
        signal.addEventListener('abort', onAbort, { once: true })
        entry.detachAbort = () => signal.removeEventListener('abort', onAbort)
      }
      this.pending.set(request.requestId, entry)
    })
  }

  respond(sessionId: string, requestId: string, decision: 'allow_once' | 'deny'): boolean {
    const entry = this.pending.get(requestId)
    if (entry === undefined || entry.request.sessionId !== sessionId) return false
    return this.settle(requestId, decision === 'allow_once' ? 'allowed-once' : 'rejected')
  }

  snapshot(sessionId?: string): RemotePermissionRequest[] {
    return [...this.pending.values()]
      .filter(entry => sessionId === undefined || entry.request.sessionId === sessionId)
      .map(entry => structuredClone(entry.request))
  }

  failAll(outcome: Extract<ApprovalOutcome, 'cancelled' | 'unavailable'> = 'unavailable'): void {
    for (const requestId of [...this.pending.keys()]) this.settle(requestId, outcome)
  }

  private settle(requestId: string, outcome: ApprovalOutcome): boolean {
    const entry = this.pending.get(requestId)
    if (entry === undefined) return false
    this.pending.delete(requestId)
    clearTimeout(entry.timer)
    entry.detachAbort?.()
    entry.resolve(outcome)
    this.onResolved(entry.request, outcome)
    return true
  }
}
