import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { parseFunnelWireEnvelope } from '@/schemas/apiBoundaries'
import type { Funnel, IdName } from '@/types/entities'

/** Use `create: true` when saving a new funnel that already has a client-generated `idFunnel`. */
export type SaveFunnelInput = Partial<Funnel> & {
  create?: boolean
  canvasWidth?: number
  canvasHeight?: number
}

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

export function useFunnel(
  id: string,
  options?: { loadDependencies?: boolean },
) {
  const loadDeps = options?.loadDependencies ?? false
  return useQuery({
    queryKey: [...queryKeys.funnels.detail(id), loadDeps] as const,
    queryFn: () => {
      const params: Record<string, string> = { idFunnel: id }
      if (loadDeps) {
        params.loadDependencies = 'true'
      }
      return api
        .get<unknown>('/data/campaign/funnel/find/byId/', params)
        .then((raw) => {
          parseFunnelWireEnvelope(raw)
          return raw as Funnel
        })
    },
    enabled: !!id,
  })
}

export function useSaveFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveFunnelInput) => {
      const { create, ...funnel } = input
      const isNew = create === true || !funnel.idFunnel || funnel.idFunnel === '0'
      return isNew
        ? api.post<Funnel>('/data/campaign/funnel/save/', funnel)
        : api.put<Funnel>('/data/campaign/funnel/save/', funnel, { deleteDependencies: 'true' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.funnels.all })
    },
  })
}

export function useDeleteFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/campaign/funnel/delete/', { idFunnel: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.funnels.all })
    },
  })
}

export function useCloneFunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post('/data/campaign/funnel/clone/', undefined, { idFunnel: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.funnels.all })
    },
  })
}
