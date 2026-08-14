import { describe, expect, it, vi } from 'vitest'
import { PendingApprovals } from '../src/pending-approvals.js'
import type { RemotePermissionRequest } from '../src/types.js'

describe('PendingApprovals', () => {
  it('maps remote decisions to Harness outcomes exactly once', async () => {
    const resolved = vi.fn()
    const pending = new PendingApprovals(10_000, resolved)
    const request = permission('p1')
    const outcome = pending.open(request)
    expect(pending.respond('s1', 'p1', 'allow_once')).toBe(true)
    expect(pending.respond('s1', 'p1', 'deny')).toBe(false)
    await expect(outcome).resolves.toBe('allowed-once')
    expect(resolved).toHaveBeenCalledWith(request, 'allowed-once')
  })

  it('fails closed on abort and disconnect', async () => {
    const pending = new PendingApprovals(10_000, () => undefined)
    const controller = new AbortController()
    const aborted = pending.open(permission('p1'), controller.signal)
    controller.abort()
    await expect(aborted).resolves.toBe('cancelled')

    const disconnected = pending.open(permission('p2'))
    pending.failAll()
    await expect(disconnected).resolves.toBe('unavailable')
  })
})

function permission(requestId: string): RemotePermissionRequest {
  return {
    requestId,
    sessionId: 's1',
    toolName: 'bash',
    permission: { kind: 'command', command: 'pnpm test' },
    status: 'pending',
    expiresAt: Date.now() + 10_000,
  }
}
