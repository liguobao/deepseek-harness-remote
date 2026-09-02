import { describe, expect, it, vi } from 'vitest'
import type { CodexRemoteClient } from '@dsh-remote/client-core'
import { codexItemsToChat, loadCodexCatalog, readCodexHistoryPage } from '../src/services/codex'

describe('Android CodeX Remote projection', () => {
  it('prefers project/list workspaces and keeps unprojected Threads hidden', async () => {
    const request = vi.fn(async (method: string) => {
      if (method === 'project/list') return {
        data: [{ id: 'project-1', name: 'Project', roots: [{ path: '/workspace/project' }], position: 0 }],
        nextCursor: null,
      }
      if (method === 'thread/list') return {
        data: [
          { id: 'thread-1', projectId: 'project-1', cwd: '/workspace/project', updatedAt: 20 },
          { id: 'thread-2', cwd: '/workspace/project/subdir', updatedAt: 10 },
          { id: 'hidden-thread', cwd: '/workspace/other', updatedAt: 30 },
        ],
        nextCursor: null,
      }
      throw new Error(`unexpected ${method}`)
    })

    const catalog = await loadCodexCatalog({ request } as unknown as CodexRemoteClient)

    expect(catalog.workspaces).toMatchObject([{
      workspaceId: 'codex:project:project-1',
      backend: 'codex',
      sessionIds: ['codex:thread-1', 'codex:thread-2'],
    }])
    expect(catalog.sessions.map(session => session.sessionId)).toEqual(['codex:thread-1', 'codex:thread-2'])
  })

  it.each(['empty', 'unsupported'] as const)(
    'derives exact thread cwd workspaces when project/list is %s',
    async projectListMode => {
      const request = vi.fn(async (method: string) => {
        if (method === 'project/list') {
          if (projectListMode === 'unsupported') {
            throw Object.assign(new Error('The requested Codex method is not available over Remote.'), {
              code: 'METHOD_NOT_ALLOWED',
            })
          }
          return { data: [], nextCursor: null }
        }
        if (method === 'thread/list') return {
          data: [
            { id: 'thread-1', cwd: '/workspace/project', updatedAt: 20 },
            { id: 'thread-2', cwd: '/workspace/other', updatedAt: 10 },
            { id: 'hidden-thread', updatedAt: 30 },
          ],
          nextCursor: null,
        }
        throw new Error(`unexpected ${method}`)
      })

      const catalog = await loadCodexCatalog({ request } as unknown as CodexRemoteClient)

      expect(catalog.workspaces).toEqual([
        expect.objectContaining({ path: '/workspace/project', sessionIds: ['codex:thread-1'] }),
        expect.objectContaining({ path: '/workspace/other', sessionIds: ['codex:thread-2'] }),
      ])
      expect(catalog.sessions.map(session => session.sessionId)).toEqual(['codex:thread-1', 'codex:thread-2'])
    },
  )

  it('accepts only the bounded native History page shape', async () => {
    const client = {
      request: vi.fn(async () => ({
        header: { id: 'codex:thread-1' },
        records: [{
          type: 'event',
          event: { type: 'assistant/message', seq: 4, time: 10, data: { message: { id: 'a1' } } },
        }],
        hasMore: true,
      })),
    } as unknown as CodexRemoteClient

    await expect(readCodexHistoryPage(client, 'thread-1', 5, 20)).resolves.toMatchObject({
      hasMore: true,
      events: [{ event: { type: 'assistant/message', seq: 4 } }],
    })
    expect(client.request).toHaveBeenCalledWith('dsh/sessionHistory', {
      threadId: 'thread-1', beforeSeq: 5, maxMessages: 20,
    })
  })

  it('renders image-bearing Codex display messages as chat images', () => {
    expect(codexItemsToChat([{
      id: 'codex:thread-1:turn-1:user-1',
      sessionId: 'codex:thread-1',
      backend: 'codex',
      kind: 'message',
      role: 'user',
      text: 'Describe this',
      images: [{ uri: 'data:image/png;base64,aW1hZ2U=', name: 'screen.png' }],
      nativeRef: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'user-1' },
    }])).toEqual([expect.objectContaining({
      kind: 'message',
      role: 'user',
      text: 'Describe this',
      images: [{ uri: 'data:image/png;base64,aW1hZ2U=', name: 'screen.png' }],
    })])
  })
})
