import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { normalizeDomainsFromApiList } from '@/lib/normalizeDomainsFromApi'

export function useDomains() {
  return useQuery({
    queryKey: queryKeys.domains.list(),
    queryFn: async () => {
      const raw = await api.get<unknown>('/system/domain/list/')
      return normalizeDomainsFromApiList(raw)
    },
  })
}

/** PHP reads `domain` from the query string for POST /system/domain/save/. */
export function useSaveDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainName: string) =>
      api.post<unknown>('/system/domain/save/', undefined, { domain: domainName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.domains.all })
      qc.invalidateQueries({ queryKey: queryKeys.systemLinks.all })
    },
  })
}

/** PHP requires query param `domain` (hostname), not `id`. */
export function useDeleteDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainName: string) =>
      api.delete('/system/domain/delete/', { domain: domainName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.domains.all })
      qc.invalidateQueries({ queryKey: queryKeys.systemLinks.all })
    },
  })
}

/** PHP accepts PUT with query param `domain`. */
export function useSetDefaultDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domainName: string) =>
      api.put('/system/domain/default/', undefined, { domain: domainName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.domains.all })
      qc.invalidateQueries({ queryKey: queryKeys.systemLinks.all })
    },
  })
}
