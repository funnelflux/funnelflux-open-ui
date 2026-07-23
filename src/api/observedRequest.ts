import type { QueryClient } from '@tanstack/react-query'

/**
 * Execute an imperative protected request through the existing MutationCache.
 * This keeps legacy click/load handlers on the same global 401/423 transition path as useMutation.
 */
export function executeObservedRequest<T>(
  queryClient: QueryClient,
  request: () => Promise<T>,
): Promise<T> {
  const mutation = queryClient.getMutationCache().build<T, unknown, void, unknown>(queryClient, {
    mutationFn: request,
  })
  return mutation.execute(undefined)
}
