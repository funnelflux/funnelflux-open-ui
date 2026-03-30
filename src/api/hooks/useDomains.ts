import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Domain } from '@/types/ui'

export function useDomains() {
  return useQuery({
    queryKey: queryKeys.domains.list(),
    queryFn: () => api.get<Domain[]>('/system/domain/list/'),
  })
}

export function useSaveDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domain: Partial<Domain>) =>
      api.post<Domain>('/system/domain/save/', domain),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.domains.all })
    },
  })
}

export function useDeleteDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/system/domain/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.domains.all })
    },
  })
}

export function useSetDefaultDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post('/system/domain/default/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.domains.all })
    },
  })
}
