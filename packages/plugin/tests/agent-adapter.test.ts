import type { Agent, AgentRegistry } from '@deepseek-ai/dsh-agent'
import { describe, expect, it, vi } from 'vitest'
import { AgentAdapter } from '../src/adapters/agent-adapter.js'

describe('AgentAdapter', () => {
  it('uses followup while idle and steer while running', () => {
    const idle = fakeAgent('idle')
    const running = fakeAgent('running')
    const registry = {
      get: (id: string) => id === 'idle' ? idle : id === 'running' ? running : undefined,
    } as unknown as AgentRegistry
    const adapter = new AgentAdapter(registry)

    adapter.send({ sessionId: 'idle', clientMessageId: 'm1', text: 'first' })
    adapter.send({ sessionId: 'running', clientMessageId: 'm2', text: 'steer' })
    adapter.send({ sessionId: 'idle', clientMessageId: 'm1', text: 'duplicate' })

    expect(idle.followup).toHaveBeenCalledTimes(1)
    expect(idle.followup).toHaveBeenCalledWith(expect.objectContaining({ role: 'user', content: [{ type: 'text', text: 'first' }] }))
    expect(running.steer).toHaveBeenCalledTimes(1)
  })

  it('cancels with the public user cause while retaining queued input', () => {
    const agent = fakeAgent('running')
    const registry = { get: () => agent } as unknown as AgentRegistry
    expect(new AgentAdapter(registry).stop('s1')).toEqual({ accepted: true })
    expect(agent.cancel).toHaveBeenCalledWith({ kind: 'user' }, { keepInbox: true })
  })
})

function fakeAgent(status: 'idle' | 'running'): Agent {
  return {
    id: status,
    status,
    followup: vi.fn(),
    steer: vi.fn(),
    cancel: vi.fn(),
  } as unknown as Agent
}
