import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId, type Session } from '@deepseek-ai/dsh-session'
import type { AgentRegistry } from '@deepseek-ai/dsh-agent'
import { uuidV7 } from '../ids.js'

interface SessionTitleService {
  rename(session: Session, title: string): unknown
}

export class AgentAdapter {
  private readonly created = new Map<string, string>()
  private readonly delivered = new Set<string>()

  constructor(private readonly agents: AgentRegistry, private readonly titles?: SessionTitleService) {}

  async create(params: { clientRequestId: string; cwd?: string; title?: string | null }): Promise<Session> {
    const existingId = this.created.get(params.clientRequestId)
    if (existingId !== undefined) {
      const existing = this.agents.get(SessionId(existingId))
      if (existing !== undefined) return existing.session
      this.created.delete(params.clientRequestId)
    }
    const sessionId = SessionId(`session-${uuidV7()}`)
    const handle = await this.agents.create({
      sessionId,
      ...(params.cwd === undefined ? {} : { meta: { cwd: params.cwd } }),
    })
    if (params.title !== undefined && params.title !== null) this.titles?.rename(handle.agent.session, params.title)
    this.created.set(params.clientRequestId, String(sessionId))
    this.pruneCreated()
    return handle.agent.session
  }

  send(params: { sessionId: string; clientMessageId: string; text: string }): { accepted: true; clientMessageId: string } {
    const key = `${params.sessionId}\0${params.clientMessageId}`
    if (this.delivered.has(key)) return { accepted: true, clientMessageId: params.clientMessageId }
    const agent = this.agents.get(SessionId(params.sessionId))
    if (agent === undefined) throw new AgentAdapterError('SESSION_NOT_FOUND', 'The session is no longer available.')
    const message = createUserMessage({
      content: [{ type: 'text', text: params.text }],
      source: { kind: 'user' },
    })
    try {
      if (agent.status === 'idle') agent.followup(message)
      else if (agent.status === 'running') agent.steer(message)
      else throw new AgentAdapterError('SESSION_NOT_READY', 'The session is not ready for input.')
    } catch (error: unknown) {
      if (error instanceof AgentAdapterError) throw error
      throw new AgentAdapterError('AGENT_BUSY', 'The agent could not accept the message.')
    }
    this.delivered.add(key)
    if (this.delivered.size > 10_000) this.delivered.delete(this.delivered.values().next().value!)
    return { accepted: true, clientMessageId: params.clientMessageId }
  }

  stop(sessionId: string): { accepted: true } {
    const agent = this.agents.get(SessionId(sessionId))
    if (agent === undefined) throw new AgentAdapterError('SESSION_NOT_FOUND', 'The session is no longer available.')
    agent.cancel({ kind: 'user' }, { keepInbox: true })
    return { accepted: true }
  }

  private pruneCreated(): void {
    while (this.created.size > 1_024) this.created.delete(this.created.keys().next().value!)
  }
}

export class AgentAdapterError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}
