import type { SessionResponse, UserProfile } from '@/types/api'

const API_BASE = import.meta.env.VITE_FUNNELFLUX_URL || ''
const API_PATH = '/admin/api/v2'

/**
 * Bootstrap auth by checking PHP session first, then falling back to stored API key.
 */
export async function bootstrapAuth(): Promise<{
  apiKey: string
  user: UserProfile
}> {
  // 1. Try session-based auth (co-located deployment)
  try {
    const sessionRes = await fetch(`${API_BASE}${API_PATH}/auth/session/`)
    if (sessionRes.ok) {
      const session: SessionResponse = await sessionRes.json()
      const user = await fetchUserProfile(session.apiKey)
      return { apiKey: session.apiKey, user }
    }
  } catch {
    // Session endpoint not available — try fallback
  }

  // 2. Try stored API key (remote deployment)
  const storedKey = localStorage.getItem('ff_api_key')
  const storedUrl = localStorage.getItem('ff_instance_url')
  if (storedKey) {
    try {
      const user = await fetchUserProfile(storedKey, storedUrl || undefined)
      return { apiKey: storedKey, user }
    } catch {
      // Stored key is invalid — clear it
      localStorage.removeItem('ff_api_key')
    }
  }

  throw new Error('AUTH_REQUIRED')
}

async function fetchUserProfile(apiKey: string, baseUrl?: string): Promise<UserProfile> {
  const base = baseUrl || API_BASE
  const res = await fetch(
    `${base}${API_PATH}/ui/userprofile/loggedin/load/?apiKey=${encodeURIComponent(apiKey)}`,
  )
  if (!res.ok) throw new Error('Failed to load user profile')
  return res.json()
}

export function saveManualAuth(instanceUrl: string, apiKey: string) {
  localStorage.setItem('ff_instance_url', instanceUrl)
  localStorage.setItem('ff_api_key', apiKey)
}

export function clearManualAuth() {
  localStorage.removeItem('ff_instance_url')
  localStorage.removeItem('ff_api_key')
}
