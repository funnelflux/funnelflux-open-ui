import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { AuthExpiredError, isLicenseLockedError } from '@/api/errors'
import { handleLicenseLockedResponse } from '@/lib/licenseAccess'
import { useAuthStore } from '@/store/auth'

/** How long unused query data stays in memory for instant back-navigation. */
const TABLE_CACHE_GC_TIME_MS = 1000 * 60 * 60

export function createQueryClient() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof AuthExpiredError) {
          useAuthStore.getState().clearAuth()
          queryClient.clear()
        } else if (isLicenseLockedError(error)) {
          handleLicenseLockedResponse(queryClient)
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (error instanceof AuthExpiredError) {
          useAuthStore.getState().clearAuth()
          queryClient.clear()
        } else if (isLicenseLockedError(error)) {
          handleLicenseLockedResponse(queryClient)
        }
      },
    }),
    defaultOptions: {
      queries: {
        /** No automatic product refetch on timer, tab focus, or reconnect. */
        staleTime: Number.POSITIVE_INFINITY,
        /** Keep unused table/list data resident so returning to a page restores instantly. */
        gcTime: TABLE_CACHE_GC_TIME_MS,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  })
  return queryClient
}
