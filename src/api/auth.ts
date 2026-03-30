import type { SessionResponse, UserProfile } from '@/types/api'

const API_PATH = '/admin/api/v2'

export async function bootstrapAuth(): Promise<UserProfile> {
  const sessionRes = await fetch(`${API_PATH}/auth/session/`, {
    credentials: 'same-origin',
  })

  if (sessionRes.status === 401) {
    throw new Error('AUTH_REQUIRED')
  }
  if (!sessionRes.ok) {
    throw new Error('Failed to verify session')
  }

  const session: SessionResponse = await sessionRes.json()
  if (!session.authenticated) {
    throw new Error('AUTH_REQUIRED')
  }

  return fetchUserProfile()
}

async function fetchUserProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_PATH}/ui/userprofile/loggedin/load/`, {
    credentials: 'same-origin',
  })
  if (!res.ok) throw new Error('Failed to load user profile')
  return res.json()
}
