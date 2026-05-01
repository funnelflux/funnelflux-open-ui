import type { ApiError } from '@/types/api'

const API_PATH = import.meta.env.VITE_API_PATH || '/admin/api/v2'
type ResponseParseMode = 'default' | 'statsRawBigInt'

function parseStatsJsonPreserveLargeIntRaw(text: string): unknown {
  const fixed = text.replace(/"raw"\s*:\s*(\d{16,})(\s*)([,}]|])/g, '"raw":"$1"$2$3')
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

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const res = await fetch(this.buildUrl(endpoint, params), {
      credentials: 'same-origin',
    })
    return this.handleResponse<T>(res, endpoint)
  }

  async post<T>(endpoint: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    return this.postWithParseMode<T>(endpoint, body, params)
  }

  async postDrilldown<T>(body?: unknown, params?: Record<string, string>): Promise<T> {
    return this.postWithParseMode<T>('/stats/reporting/drilldown/', body, params, 'statsRawBigInt')
  }

  private async postWithParseMode<T>(
    endpoint: string,
    body?: unknown,
    params?: Record<string, string>,
    parseMode: ResponseParseMode = 'default',
  ): Promise<T> {
    const res = await fetch(this.buildUrl(endpoint, params), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res, endpoint, parseMode)
  }

  async put<T>(endpoint: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    const res = await fetch(this.buildUrl(endpoint, params), {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res, endpoint)
  }

  async delete<T>(
    endpoint: string,
    params?: Record<string, string>,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(this.buildUrl(endpoint, params), {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res, endpoint)
  }

  async postBlob(endpoint: string, body?: unknown): Promise<Blob> {
    const res = await fetch(this.buildUrl(endpoint), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) {
      const basePath = import.meta.env.VITE_BASE_PATH_PREFIX || ''
      window.location.href = `${basePath}/admin/login.php`
      throw new Error('Session expired')
    }
    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({
        code: res.status,
        message: res.statusText,
      }))
      throw error
    }
    return res.blob()
  }

  private async handleResponse<T>(
    res: Response,
    endpoint?: string,
    parseMode: ResponseParseMode = 'default',
  ): Promise<T> {
    if (res.status === 401 && !endpoint?.includes('/auth/session')) {
      const basePath = import.meta.env.VITE_BASE_PATH_PREFIX || ''
      window.location.href = `${basePath}/admin/login.php`
      throw new Error('Session expired')
    }
    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({
        code: res.status,
        message: res.statusText,
      }))
      throw error
    }
    const text = await res.text()
    if (!text) return {} as T
    return (parseMode === 'statsRawBigInt' ? parseStatsJsonPreserveLargeIntRaw(text) : JSON.parse(text)) as T
  }
}

export const api = new ApiClient()
