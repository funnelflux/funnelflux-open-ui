import type { ApiError } from '@/types/api'
import { ApiHttpError, AuthExpiredError, NetworkError } from '@/api/errors'

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
    if (res.status === 401) {
      throw new AuthExpiredError()
    }
    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({
        code: res.status,
        message: res.statusText,
      }))
      throw new ApiHttpError(error.message || res.statusText, res.status, error)
    }
    return res.blob()
  }

  private async handleResponse<T>(
    res: Response,
    parseMode: ResponseParseMode = 'default',
  ): Promise<T> {
    if (res.status === 401) {
      const error: ApiError = await res.json().catch(() => ({
        code: 401,
        message: res.statusText,
      }))
      throw new AuthExpiredError(error.message || 'Session expired', error)
    }
    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({
        code: res.status,
        message: res.statusText,
      }))
      throw new ApiHttpError(error.message || res.statusText, res.status, error)
    }
    const text = await res.text()
    if (!text) return {} as T
    return (parseMode === 'statsRawBigInt' ? parseStatsJsonPreserveLargeIntRaw(text) : JSON.parse(text)) as T
  }
}

export const api = new ApiClient()
