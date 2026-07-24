import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiClient } from '@/api/client'
import { AuthExpiredError, ApiHttpError, LicenseLockedError, NetworkError } from '@/api/errors'

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

  it('revalidates through the cookie-session endpoint without a body or custom token header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"revalidated":true}',
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const controller = new AbortController()

    await new ApiClient().revalidateLicense(controller.signal)

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/admin/api/v2/license/revalidate/')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('same-origin')
    expect(init.body).toBeUndefined()
    expect(init.headers).toEqual({ Accept: 'application/json' })
    expect(init.signal).toBe(controller.signal)
  })

  it('preserves abort cancellation during license revalidation', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    globalThis.fetch = vi.fn().mockRejectedValue(abortError) as unknown as typeof fetch

    await expect(
      new ApiClient().revalidateLicense(new AbortController().signal),
    ).rejects.toBe(abortError)
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

  it.each([
    ['GET', (client: ApiClient) => client.get('/data/x')],
    ['POST', (client: ApiClient) => client.post('/data/x', { value: 1 })],
    ['drilldown POST', (client: ApiClient) => client.postDrilldown({ value: 1 })],
    ['PUT', (client: ApiClient) => client.put('/data/x', { value: 1 })],
    ['DELETE', (client: ApiClient) => client.delete('/data/x')],
    ['multipart upload', (client: ApiClient) => client.postFormData('/data/x', new FormData())],
    ['POST blob', (client: ApiClient) => client.postBlob('/data/x', { value: 1 })],
    ['download', (client: ApiClient) => client.download('/protected-export.csv')],
  ])('throws LicenseLockedError for HTTP 423 from %s', async (_name, request) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 423,
      statusText: 'Locked',
      json: async () => ({
        code: 423,
        errorCode: 'LICENSE_LOCKED',
        message: 'Backend detail must not become UI policy',
      }),
    }) as unknown as typeof fetch

    const error = await request(new ApiClient()).catch((caught) => caught)

    expect(error).toBeInstanceOf(LicenseLockedError)
    expect((error as LicenseLockedError).status).toBe(423)
    expect((error as LicenseLockedError).body?.errorCode).toBe('LICENSE_LOCKED')
  })

  it.each([
    ['non-JSON', async () => { throw new SyntaxError('not json') }],
    ['JSON null', async () => null],
    ['JSON array', async () => [{ message: 'not an API error object' }]],
  ])('still recognizes %s HTTP 423 responses as a license lock', async (_name, json) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 423,
      statusText: 'Locked',
      json,
    }) as unknown as typeof fetch

    await expect(new ApiClient().get('/data/x')).rejects.toBeInstanceOf(LicenseLockedError)
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
