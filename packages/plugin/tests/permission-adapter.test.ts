import type { ApprovalRequest } from '@deepseek-ai/dsh-user-approval'
import { describe, expect, it, vi } from 'vitest'
import { PermissionAdapter } from '../src/adapters/permission-adapter.js'
import { EventSequencer } from '../src/event-sequencer.js'
import { PendingApprovals } from '../src/pending-approvals.js'

describe('PermissionAdapter', () => {
  it('delegates to the local answerer when no subscribed remote is available', async () => {
    const next = vi.fn(async () => 'allowed-once' as const)
    const adapter = new PermissionAdapter(new PendingApprovals(1_000, () => undefined), new EventSequencer(), () => false, () => undefined, 1_000)
    await expect(adapter.answer(request(), next)).resolves.toBe('allowed-once')
    expect(next).toHaveBeenCalledOnce()
  })

  it('claims the waterfall for a subscribed remote and maps command context', async () => {
    const events: any[] = []
    const pending = new PendingApprovals(10_000, () => undefined)
    const adapter = new PermissionAdapter(pending, new EventSequencer(), () => true, event => events.push(event), 10_000)
    const answer = adapter.answer(request(), async () => 'rejected')
    const remote = events[0].payload.data
    expect(remote).toMatchObject({
      sessionId: 's1',
      toolName: 'bash',
      callId: 'c1',
      permission: { kind: 'command', command: 'pnpm test', cwd: '/repo' },
    })
    expect(pending.respond('s1', remote.requestId, 'deny')).toBe(true)
    await expect(answer).resolves.toBe('rejected')
  })
})

function request(): ApprovalRequest {
  return {
    agent: {
      id: 's1',
      session: {
        id: 's1',
        header: { id: 's1', version: 0, createdAt: 1, cwd: '/repo' },
        events: [{ type: 'tool/call', seq: 0, time: 1, data: { callId: 'c1', name: 'bash', arguments: '{"command":"pnpm test"}' } }],
      },
    },
    toolName: 'bash',
    callId: 'c1',
    reason: 'Needs process access',
  } as unknown as ApprovalRequest
}
