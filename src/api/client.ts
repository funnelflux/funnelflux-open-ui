import type { ApiError } from '@/types/api'
import { ApiHttpError, AuthExpiredError, LicenseLockedError, NetworkError } from '@/api/errors'

const API_PATH = import.meta.env.VITE_API_PATH || '/admin/api/v2'
type ResponseParseMode = 'default' | 'statsRawBigInt'

const JSON_REQUEST_HEADERS = {
  Accept: 'application/json',
} as const

/**
 * Cookie session uses `credentials: 'same-origin'`.
 *
 * CSRF: if the backend requires a CSRF token for mutating requests, add `setCsrfToken`
 * and inject `X-CSRF-Token` here. Today the PHP admin relies on same-origin cookie
 * semantics and SameSite as the primary boundary; document any server-side CSRF contract
 * changes alongside V2 API updates.
 */
function parseStatsJsonPreserveLargeIntRaw(text: string): unknown {
  const fixed = text
    .replace(/"raw"\s*:\s*(\d{16,})(\s*)([,}]|])/g, '"raw":"$1"$2$3')
    .replace(/(\[\s*"(?:(?:\\.)|[^"\\])*"\s*,\s*)(\d{16,})(\s*\])/g, '$1"$2"$3')
  return JSON.parse(fixed)
}

export class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_PATH
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    }
    return url.toString()
  }

  async get<T>(endpoint: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      res = await fetch(this.buildUrl(endpoint, params), {
        credentials: 'same-origin',
        headers: JSON_REQUEST_HEADERS,
        signal,
      })
    } catch (cause) {
      throw new NetworkError('Network request failed', { cause })
    }
    return this.handleResponse<T>(res)
  }

  async post<T>(endpoint: string, body?: unknown, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
    return this.postWithParseMode<T>(endpoint, body, params, 'default', signal)
  }

  async revalidateLicense<T>(signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      res = await fetch(this.buildUrl('/license/revalidate/'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: JSON_REQUEST_HEADERS,
        signal,
      })
    } catch (cause) {
      throw new NetworkError('Network request failed', { cause })
    }
    return this.handleResponse<T>(res)
  }

  async postDrilldown<T>(body?: unknown, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
    return this.postWithParseMode<T>('/stats/reporting/drilldown/', body, params, 'statsRawBigInt', signal)
  }

  private async postWithParseMode<T>(
    endpoint: string,
    body?: unknown,
    params?: Record<string, string>,
    parseMode: ResponseParseMode = 'default',
    signal?: AbortSignal,
  ): Promise<T> {
    let res: Response
    try {
      res = await fetch(this.buildUrl(endpoint, params), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...JSON_REQUEST_HEADERS, 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      })
    } catch (cause) {
      throw new NetworkError('Network request failed', { cause })
    }
    return this.handleResponse<T>(res, parseMode)
  }

  async put<T>(endpoint: string, body?: unknown, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      res = await fetch(this.buildUrl(endpoint, params), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { ...JSON_REQUEST_HEADERS, 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      })
    } catch (cause) {
      throw new NetworkError('Network request failed', { cause })
    }
    return this.handleResponse<T>(res)
  }

  async delete<T>(
    endpoint: string,
    params?: Record<string, string>,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    let res: Response
    try {
      res = await fetch(this.buildUrl(endpoint, params), {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: body
          ? { ...JSON_REQUEST_HEADERS, 'Content-Type': 'application/json' }
          : { ...JSON_REQUEST_HEADERS },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      })
    } catch (cause) {
      throw new NetworkError('Network request failed', { cause })
    }
    return this.handleResponse<T>(res)
  }

  /** Multipart form upload (e.g. CSV import). Do not set Content-Type — the browser adds the boundary. */
  async postFormData<T>(endpoint: string, formData: FormData, signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      res = await fetch(this.buildUrl(endpoint), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        body: formData,
        signal,
      })
    } catch (cause) {
      throw new NetworkError('Network request failed', { cause })
    }
    return this.handleResponse<T>(res)
  }

  async postBlob(endpoint: string, body?: unknown, signal?: AbortSignal): Promise<Blob> {
    let res: Response
    try {
      res = await fetch(this.buildUrl(endpoint), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...JSON_REQUEST_HEADERS, 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      })
    } catch (cause) {
      throw new NetworkError('Network request failed', { cause })
    }
    await this.throwForErrorResponse(res)
    return res.blob()
  }

  /** Download a same-origin file so protected 401/423 responses remain observable by the SPA. */
  async download(url: string, signal?: AbortSignal): Promise<Blob> {
    const resolvedUrl = new URL(url, window.location.origin)
    if (resolvedUrl.origin !== window.location.origin) {
      throw new ApiHttpError('Cross-origin downloads are not supported', 400)
    }

    let res: Response
    try {
      res = await fetch(resolvedUrl.toString(), {
        credentials: 'same-origin',
        headers: JSON_REQUEST_HEADERS,
        signal,
      })
    } catch (cause) {
      throw new NetworkError('Network request failed', { cause })
    }
    await this.throwForErrorResponse(res)
    return res.blob()
  }

  private async throwForErrorResponse(res: Response): Promise<void> {
    if (res.ok) return

    const parsed: unknown = await res.json().catch(() => null)
    const error: ApiError = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? {
          code: typeof Reflect.get(parsed, 'code') === 'number' ? Reflect.get(parsed, 'code') as number : res.status,
          message: typeof Reflect.get(parsed, 'message') === 'string'
            ? Reflect.get(parsed, 'message') as string
            : res.statusText,
          ...(typeof Reflect.get(parsed, 'errorCode') === 'string'
            ? { errorCode: Reflect.get(parsed, 'errorCode') as string }
            : {}),
        }
      : {
      code: res.status,
      message: res.statusText,
        }

    if (res.status === 401) {
      throw new AuthExpiredError(error.message || 'Session expired', error)
    }
    if (res.status === 423) {
      throw new LicenseLockedError('License locked', error)
    }
    throw new ApiHttpError(error.message || res.statusText, res.status, error)
  }

  private async handleResponse<T>(
    res: Response,
    parseMode: ResponseParseMode = 'default',
  ): Promise<T> {
    await this.throwForErrorResponse(res)
    const text = await res.text()
    if (!text) return {} as T
    return (parseMode === 'statsRawBigInt' ? parseStatsJsonPreserveLargeIntRaw(text) : JSON.parse(text)) as T
  }
}

export const api = new ApiClient()
