import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { bootstrapAuth } from '@/api/auth'

export function useAuth() {
  const { isAuthenticated, isLoading, user, error, setAuth, setError, setLoading } =
    useAuthStore()

  useEffect(() => {
    if (isAuthenticated || !isLoading) return

    bootstrapAuth()
      .then(({ apiKey, user }) => setAuth(apiKey, user))
      .catch((err) => {
        if (err.message === 'AUTH_REQUIRED') {
          setError('AUTH_REQUIRED')
        } else {
          setError(err.message || 'Authentication failed')
        }
        setLoading(false)
      })
  }, [isAuthenticated, isLoading, setAuth, setError, setLoading])

  return { isAuthenticated, isLoading, user, error }
}
