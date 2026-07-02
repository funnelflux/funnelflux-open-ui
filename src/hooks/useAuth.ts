import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { bootstrapAuth, fetchSession, sessionMatchesUser } from '@/api/auth'

export function useAuth() {
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading, user, error, setAuth, setError, setLoading } = useAuthStore()

  useEffect(() => {
    let cancelled = false
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

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

    // Already authenticated: confirm the live PHP session still belongs to the
    // cached user. On a session swap (logout/login in the same browser, bfcache
    // restore, shared machine) clearAuth() flips isAuthenticated back to false,
    // which re-runs this effect through the bootstrap path and reloads the
    // correct profile instead of leaving the previous user's data on screen.
    const reconcileSession = async () => {
      try {
        const session = await fetchSession()
        if (cancelled) return
        if (!sessionMatchesUser(session, useAuthStore.getState().user)) {
          // Mirror every other auth-exit path (401 handler in App.tsx, navbar
          // logout): drop the previous user's cached query data alongside the
          // auth store. With staleTime: Infinity and non-user-scoped query keys,
          // clearAuth() alone would leave user A's lists/reports on screen under
          // user B until each query happened to refetch.
          useAuthStore.getState().clearAuth()
          queryClient.clear()
        }
      } catch {
        // Transient/network error: leave state untouched. A genuine 401 on any
        // API call is already handled by the query/mutation cache in App.tsx.
      }
    }

    const onWake = () => {
      if (useAuthStore.getState().isAuthenticated) {
        void reconcileSession()
        return
      }
      if (debounceTimer != null) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void revalidate()
      }, 250)
    }

    if (!isAuthenticated) {
      void revalidate()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') onWake()
    }

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) onWake()
    }

    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
      if (debounceTimer != null) clearTimeout(debounceTimer)
    }
  }, [isAuthenticated, setAuth, setError, setLoading, queryClient])

  return { isAuthenticated, isLoading, user, error }
}
