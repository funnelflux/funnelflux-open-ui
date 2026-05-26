import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiClient } from '@/api/client'
import { AuthExpiredError, ApiHttpError, NetworkError } from '@/api/errors'

describe('ApiClient', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('POST stringifies null body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"x":1}',
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const client = new ApiClient()
    await client.post('/test/', null)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBe('null')
  })

  it('POST omits body when undefined', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{}',
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const client = new ApiClient()
    await client.post('/test/')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBeUndefined()
  })

  it('throws AuthExpiredError on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ code: 401, message: 'Expired' }),
      text: async () => '',
    }) as unknown as typeof fetch
    const client = new ApiClient()
    await expect(client.get('/data/x')).rejects.toBeInstanceOf(AuthExpiredError)
  })

  it('throws ApiHttpError on other HTTP errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server error',
      json: async () => ({ code: 500, message: 'fail' }),
      text: async () => '',
    }) as unknown as typeof fetch
    const client = new ApiClient()
    const err = await client.get('/data/x').catch((e) => e)
    expect(err).toBeInstanceOf(ApiHttpError)
    expect((err as ApiHttpError).status).toBe(500)
  })

  it('returns empty object for empty 200 body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    }) as unknown as typeof fetch
    const client = new ApiClient()
    const data = await client.get<Record<string, unknown>>('/data/x')
    expect(data).toEqual({})
  })

  it('preserves large compact drilldown raw values as strings', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        '{"rows":[{"rowId":"r1","cells":[["Traffic",17000000000000001],{"formatted":"Metric","raw":17000000000000002}]}]}',
    }) as unknown as typeof fetch
    const client = new ApiClient()
    const data = await client.postDrilldown<{ rows: Array<{ cells: Array<unknown[] | { raw: unknown }> }> }>()
    expect((data.rows[0].cells[0] as unknown[])[1]).toBe('17000000000000001')
    expect((data.rows[0].cells[1] as { raw: unknown }).raw).toBe('17000000000000002')
  })

  it('throws NetworkError when fetch throws', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('offline')) as unknown as typeof fetch
    const client = new ApiClient()
    await expect(client.get('/data/x')).rejects.toBeInstanceOf(NetworkError)
  })
})
