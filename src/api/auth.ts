import { api } from '@/api/client'
import type { ApiError, SessionResponse, UserProfile } from '@/types/api'

export async function bootstrapAuth(): Promise<UserProfile> {
  let session: SessionResponse
  try {
    session = await api.get<SessionResponse>('/auth/session/')
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as ApiError).code === 401) {
      throw new Error('AUTH_REQUIRED')
    }
    const message = err instanceof Error ? err.message : 'Failed to verify session'
    throw new Error(message)
  }

  if (!session.authenticated) {
    throw new Error('AUTH_REQUIRED')
  }

  return api.get<UserProfile>('/ui/userprofile/loggedin/load/')
}
