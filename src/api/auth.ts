import { api } from '@/api/client'
import { AuthExpiredError, NetworkError } from '@/api/errors'
import { parseUserProfile } from '@/schemas/apiBoundaries'
import type { SessionResponse, UserProfile } from '@/types/api'

export async function bootstrapAuth(): Promise<UserProfile> {
  try {
    const session = await api.get<SessionResponse>('/auth/session/')
    if (!session.authenticated) {
      throw new Error('AUTH_REQUIRED')
    }
    const profile = await api.get<unknown>('/ui/userprofile/loggedin/load/')
    return parseUserProfile(profile)
  } catch (err) {
    if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
      throw err
    }
    if (err instanceof AuthExpiredError) {
      throw new Error('AUTH_REQUIRED')
    }
    if (err instanceof NetworkError) {
      throw new Error(err.message)
    }
    const message = err instanceof Error ? err.message : 'Failed to verify session'
    throw new Error(message)
  }
}
