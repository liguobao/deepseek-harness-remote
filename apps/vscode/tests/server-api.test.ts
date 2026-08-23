import { afterEach, describe, expect, it, vi } from 'vitest'
import { ServerApi } from '../src/server-api.js'

describe('ServerApi device revocation', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('removes the authenticated device', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await new ServerApi('https://server.example.com/', 'access-token').removeSelf()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://server.example.com/api/v1/devices/self')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'DELETE',
      headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
    })
  })
})
