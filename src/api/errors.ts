import type { ApiError } from '@/types/api'

/** Non-2xx HTTP response from the V2 API (session re-auth is handled via {@link AuthExpiredError}). */
export class ApiHttpError extends Error {
  readonly status: number
  readonly body?: ApiError

  constructor(message: string, status: number, body?: ApiError) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.body = body
  }
}

/** Session missing or expired for a protected endpoint (401). */
export class AuthExpiredError extends ApiHttpError {
  constructor(message = 'Session expired', body?: ApiError) {
    super(message, 401, body)
    this.name = 'AuthExpiredError'
  }
}

/** `fetch` failed (offline, DNS, CORS, etc.). */
export class NetworkError extends Error {
  constructor(message = 'Network request failed', options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'NetworkError'
  }
}

export function isAuthExpiredError(err: unknown): err is AuthExpiredError {
  return err instanceof AuthExpiredError
}

/** Map thrown values to {@link ApiError} for bulk-operation summaries. */
export function errorToApiError(err: unknown): ApiError {
  if (err instanceof ApiHttpError && err.body) return err.body
  if (err instanceof Error) return { code: -1, message: err.message }
  return { code: -1, message: String(err) }
}
