import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Funnel, IdName } from '@/types/entities'

export function useFunnels(campaignId?: string) {
  return useQuery({
    queryKey: queryKeys.funnels.list(campaignId),
    queryFn: () =>
      api
        .get<IdName[]>('/data/campaign/funnel/list/', campaignId ? { idCampaign: campaignId } : undefined)
        .then((funnels) =>
          funnels.map((funnel) => ({
            ...funnel,
            id: String(funnel.id),
          })),
        ),
    enabled: !!campaignId,
  })
}

export function useFunnel(id: string, options?: { loadDependencies?: boolean }) {
  const loadDeps = options?.loadDependencies ?? false
  return useQuery({
    queryKey: [...queryKeys.funnels.detail(id), loadDeps] as const,
    queryFn: () => {
      const params: Record<string, string> = { idFunnel: id }
      if (loadDeps) {
        params.loadDependencies = 'true'
      }
      return api.get<Funnel>('/data/campaign/funnel/find/byId/', params)
    },
    enabled: !!id,
  })
}

export function useSaveFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (funnel: Partial<Funnel>) => {
      const isNew = !funnel.idFunnel || funnel.idFunnel === '0'
      return isNew
        ? api.post<Funnel>('/data/campaign/funnel/save/', funnel)
        : api.put<Funnel>('/data/campaign/funnel/save/', funnel)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.funnels.all })
    },
  })
}

export function useDeleteFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/campaign/funnel/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.funnels.all })
    },
  })
}

export function useCloneFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post('/data/campaign/funnel/clone/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.funnels.all })
    },
  })
}
