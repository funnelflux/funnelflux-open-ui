import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSession, fetchUserProfile, sessionMatchesUser } from '@/api/auth'
import { isAuthExpiredError, isLicenseLockedError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import {
  getLicenseRefreshDelay,
  isLicenseAllowed,
} from '@/lib/licenseState'
import { clearProtectedProductData } from '@/lib/licenseAccess'
import { useAuthStore } from '@/store/auth'

function authErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (isAuthExpiredError(error)) return 'AUTH_REQUIRED'
  if (isLicenseLockedError(error)) return null
  return error instanceof Error ? error.message : 'Authentication failed'
}

export function useAuth() {
  const queryClient = useQueryClient()
  const sessionInStore = useAuthStore((state) => state.session)
  const user = useAuthStore((state) => state.user)
  const licenseLockedByResponse = useAuthStore((state) => state.licenseLockedByResponse)
  const licenseLockSessionVersion = useAuthStore((state) => state.licenseLockSessionVersion)
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sessionQuery = useQuery({
    queryKey: queryKeys.license.session(),
    queryFn: fetchSession,
    staleTime: 0,
    gcTime: Number.POSITIVE_INFINITY,
    retry: (failureCount, error) =>
      !isAuthExpiredError(error) && !isLicenseLockedError(error) && failureCount < 1,
    refetchInterval: (query) => getLicenseRefreshDelay(query.state.data?.license),
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    meta: { licenseScope: 'bootstrap' },
  })
  const refetchSession = sessionQuery.refetch

  const session = sessionQuery.data
  const backendAllowsProductAccess = Boolean(
    session?.authenticated && isLicenseAllowed(session.license),
  )
  const sessionConfirmedAfterResponseLock =
    !licenseLockedByResponse || sessionQuery.dataUpdatedAt > licenseLockSessionVersion

  const profileQuery = useQuery({
    queryKey: queryKeys.auth.profile(session?.userId ?? 'anonymous'),
    queryFn: fetchUserProfile,
    enabled: backendAllowsProductAccess && sessionConfirmedAfterResponseLock,
    staleTime: 0,
    retry: (failureCount, error) =>
      !isAuthExpiredError(error) && !isLicenseLockedError(error) && failureCount < 1,
  })

  useEffect(() => {
    if (!session) return

    const previousSession = useAuthStore.getState().session
    const identityChanged = Boolean(
      previousSession?.authenticated &&
      (!session.authenticated || previousSession.userId !== session.userId),
    )

    if (identityChanged) {
      useAuthStore.getState().clearProtectedProfile()
      clearProtectedProductData(queryClient)
    }

    useAuthStore.getState().setSession(session)

    if (!session.authenticated) {
      useAuthStore.getState().setLicenseLockedByResponse(false)
      clearProtectedProductData(queryClient)
      return
    }

    if (!isLicenseAllowed(session.license)) {
      useAuthStore.getState().setLicenseLockedByResponse(true)
      useAuthStore.getState().clearProtectedProfile()
      clearProtectedProductData(queryClient)
    }
  }, [queryClient, session])

  useEffect(() => {
    if (!session || !profileQuery.data || !sessionMatchesUser(session, profileQuery.data)) return

    if (licenseLockedByResponse) {
      clearProtectedProductData(queryClient)
    }
    useAuthStore.getState().setAuth(profileQuery.data)
    useAuthStore.getState().setLicenseLockedByResponse(false)
  }, [licenseLockedByResponse, profileQuery.data, queryClient, session])

  useEffect(() => {
    const refetchOnWake = () => {
      if (wakeTimerRef.current != null) clearTimeout(wakeTimerRef.current)
      wakeTimerRef.current = setTimeout(() => {
        wakeTimerRef.current = null
        void refetchSession()
      }, 250)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetchOnWake()
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refetchOnWake()
    }

    window.addEventListener('focus', refetchOnWake)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('focus', refetchOnWake)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (wakeTimerRef.current != null) clearTimeout(wakeTimerRef.current)
    }
  }, [refetchSession])

  const error = authErrorMessage(sessionQuery.error ?? profileQuery.error)
  const isAuthenticated = session?.authenticated ?? sessionInStore?.authenticated ?? false
  const isLicenseLocked = Boolean(
    isAuthenticated &&
    (licenseLockedByResponse || (session && !isLicenseAllowed(session.license))),
  )
  const isLoading =
    sessionQuery.isPending ||
    Boolean(
      backendAllowsProductAccess &&
      !licenseLockedByResponse &&
      (profileQuery.isPending || !user),
    )

  return {
    isAuthenticated,
    isLoading,
    isLicenseLocked,
    user,
    error,
    license: session?.license ?? sessionInStore?.license ?? null,
  }
}
