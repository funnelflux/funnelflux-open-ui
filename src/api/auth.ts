import { api } from '@/api/client'
import { AuthExpiredError, NetworkError } from '@/api/errors'
import { parseUserProfile } from '@/schemas/apiBoundaries'
import type { SessionResponse, UserProfile } from '@/types/api'

export async function fetchSession(): Promise<SessionResponse> {
  return api.get<SessionResponse>('/auth/session/')
}

/**
 * True when the live PHP session belongs to the currently cached user.
 * Used to detect a session swap (logout/login in the same browser, bfcache
 * restore, shared machine) so the SPA never keeps showing a previous user's
 * profile after the underlying session has changed.
 */
export function sessionMatchesUser(
  session: SessionResponse,
  user: UserProfile | null,
): boolean {
  if (!session.authenticated || !user) return false
  return session.userId === user.id
}

export async function bootstrapAuth(): Promise<UserProfile> {
  try {
    const session = await fetchSession()
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
