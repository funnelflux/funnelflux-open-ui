import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { bootstrapAuth } from '@/api/auth'

export function useAuth() {
  const { isAuthenticated, isLoading, user, error, setAuth, setError, setLoading } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) return

    let cancelled = false

    const revalidate = () => {
      setLoading(true)
      setError(null)
      return bootstrapAuth()
        .then((user) => {
          if (cancelled) return
          setAuth(user)
        })
        .catch((err) => {
          if (cancelled) return
          if (err.message === 'AUTH_REQUIRED') {
            setError('AUTH_REQUIRED')
          } else {
            setError(err.message || 'Authentication failed')
          }
        })
    }

    void revalidate()

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRetry = () => {
      if (useAuthStore.getState().isAuthenticated) return
      if (debounceTimer != null) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void revalidate()
      }, 250)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRetry()
    }

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) scheduleRetry()
    }

    window.addEventListener('focus', scheduleRetry)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)

    return () => {
      cancelled = true
      window.removeEventListener('focus', scheduleRetry)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
      if (debounceTimer != null) clearTimeout(debounceTimer)
    }
  }, [isAuthenticated, setAuth, setError, setLoading])

  return { isAuthenticated, isLoading, user, error }
}
