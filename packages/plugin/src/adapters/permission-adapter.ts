import type { ApprovalOutcome, ApprovalRequest } from '@deepseek-ai/dsh-user-approval'
import { uuidV7 } from '../ids.js'
import type { EventSequencer } from '../event-sequencer.js'
import type { PendingApprovals } from '../pending-approvals.js'
import type { RemotePermissionRequest } from '../types.js'

export class PermissionAdapter {
  constructor(
    private readonly pending: PendingApprovals,
    private readonly events: EventSequencer,
    private readonly isRemoteAvailable: (sessionId: string) => boolean,
    private readonly emit: (event: ReturnType<EventSequencer['publish']>) => void,
    private readonly timeoutMs: number,
  ) {}

  async answer(req: ApprovalRequest, next: () => Promise<ApprovalOutcome>): Promise<ApprovalOutcome> {
    const sessionId = String(req.agent.session.id)
    if (!this.isRemoteAvailable(sessionId)) return next()
    if (req.signal?.aborted) return 'cancelled'
    const permission = permissionContext(req)
    const request: RemotePermissionRequest = {
      requestId: uuidV7(),
      sessionId,
      toolName: req.toolName,
      ...(req.callId === undefined ? {} : { callId: String(req.callId) }),
      ...(req.reason === undefined ? {} : { reason: req.reason }),
      permission,
      status: 'pending',
      expiresAt: Date.now() + this.timeoutMs,
    }
    const outcome = this.pending.open(request, req.signal)
    this.emit(this.events.publish('permission.requested', { ...request, sessionId }, sessionId))
    return outcome
  }
}

function permissionContext(req: ApprovalRequest): RemotePermissionRequest['permission'] {
  const rawCall = req.callId === undefined
    ? undefined
    : [...req.agent.session.events].reverse().find(event =>
      event.type === 'tool/call' && String(event.data.callId) === String(req.callId),
    )
  const input = rawCall?.type === 'tool/call' ? parseObject(rawCall.data.arguments) : undefined
  const command = stringField(input, 'command') ?? stringField(input, 'cmd')
  const commandTool = /bash|shell|terminal|pwsh|powershell/i.test(req.toolName)
  return {
    kind: commandTool || command !== undefined ? 'command' : 'tool',
    ...(command === undefined ? {} : { command }),
    ...(req.agent.session.header.cwd === undefined ? {} : { cwd: req.agent.session.header.cwd }),
    toolName: req.toolName,
    ...(req.reason === undefined ? {} : { description: req.reason }),
  }
}

function parseObject(value: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined
  } catch {
    return undefined
  }
}

function stringField(value: Record<string, unknown> | undefined, key: string): string | undefined {
  const field = value?.[key]
  return typeof field === 'string' ? field : undefined
}
