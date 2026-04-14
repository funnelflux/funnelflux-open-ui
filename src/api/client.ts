import type { ApiError } from '@/types/api'

const API_PATH = '/admin/api/v2'

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
    return this.handleResponse<T>(res)
  }

  async post<T>(endpoint: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    const res = await fetch(this.buildUrl(endpoint, params), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res)
  }

  async put<T>(endpoint: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    const res = await fetch(this.buildUrl(endpoint, params), {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res)
  }

  async delete<T>(
    endpoint: string,
    params?: Record<string, string>,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(this.buildUrl(endpoint, params), {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(res)
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({
        code: res.status,
        message: res.statusText,
      }))
      throw error
    }
    const text = await res.text()
    if (!text) return {} as T
    return JSON.parse(text)
  }
}

export const api = new ApiClient()
