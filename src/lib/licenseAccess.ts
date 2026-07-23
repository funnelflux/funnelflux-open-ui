import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { useAuthStore } from '@/store/auth'
import { resetProtectedClientState } from '@/store/protectedState'

const LICENSE_QUERY_SCOPE = queryKeys.license.all[0]

export function isProtectedProductQuery(queryKey: QueryKey): boolean {
  return queryKey[0] !== LICENSE_QUERY_SCOPE
}

/**
 * Remove protected server and editor data without destroying the authenticated PHP session.
 * Only the session/license query is retained so recovery can happen in place; profile data is protected.
 */
export function clearProtectedProductData(queryClient: QueryClient): void {
  void queryClient.cancelQueries({ predicate: (query) => isProtectedProductQuery(query.queryKey) })
  queryClient.removeQueries({ predicate: (query) => isProtectedProductQuery(query.queryKey) })

  for (const mutation of queryClient.getMutationCache().getAll()) {
    if (mutation.options.meta?.licenseScope !== 'bootstrap') {
      queryClient.getMutationCache().remove(mutation)
    }
  }

  resetProtectedClientState()
}

/** Handle a backend 423. Session identity remains intact while product access is locked. */
export function handleLicenseLockedResponse(queryClient: QueryClient): void {
  const auth = useAuthStore.getState()
  const sessionVersion =
    queryClient.getQueryState(queryKeys.license.session())?.dataUpdatedAt ?? Date.now()
  auth.setLicenseLockedByResponse(true, sessionVersion)
  auth.clearProtectedProfile()
  clearProtectedProductData(queryClient)
  void queryClient.refetchQueries({ queryKey: queryKeys.license.session(), exact: true })
}
