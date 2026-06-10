import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { idNamePairFromCloneWire } from '@/api/cloneResponse'
import { api } from '@/api/client'
import { invalidateCampaignFunnelAuxiliary } from '@/api/invalidations'
import { queryKeys } from '@/api/queryKeys'
import { generateEntityId } from '@/lib/id-generator'
import type { Campaign, IdName } from '@/types/entities'

/** Use `create: true` when saving a new campaign. Missing IDs are generated before POST. */
export type SaveCampaignInput = Partial<Campaign> & { create?: boolean }

/** Body shape accepted by POST/PUT /data/campaign/save/ (FluxAPI Campaign model). */
function campaignToApiBody(input: SaveCampaignInput): Campaign {
  const {
    idCampaign = '',
    campaignName = '',
    acculumatedUrlParams = [],
    customTokens = [],
    isArchived = false,
  } = input
  return {
    idCampaign,
    campaignName,
    acculumatedUrlParams: acculumatedUrlParams.filter((p) => p.key.trim() !== ''),
    customTokens: customTokens.filter((p) => p.key.trim() !== ''),
    isArchived,
  }
}

export function useCampaigns(status: 'active' | 'archived' | 'all' = 'all') {
  const statusParam =
    status === 'archived' ? 'archived' : status === 'active' ? 'active' : 'all'
  return useQuery({
    queryKey: queryKeys.campaigns.list({ status: statusParam }),
    queryFn: () =>
      api.get<Campaign[]>('/data/campaign/find/byStatus/', { status: statusParam }),
  })
}

export function useCampaignsList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.campaigns.list({ simple: 'true' }),
    queryFn: () =>
      api.get<IdName[]>('/data/campaign/list/').then((campaigns) =>
        campaigns.map((campaign) => ({
          ...campaign,
          id: String(campaign.id),
        })),
      ),
    enabled: options?.enabled ?? true,
  })
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: queryKeys.campaigns.detail(id),
    queryFn: () => api.get<Campaign>('/data/campaign/find/byId/', { idCampaign: id }),
    enabled: !!id,
  })
}

export function useSaveCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveCampaignInput) => {
      const { create, ...rest } = input
      const body = campaignToApiBody(rest)
      const isNew =
        create === true || !body.idCampaign || body.idCampaign === '0'
      if (isNew && (!body.idCampaign || body.idCampaign === '0')) {
        body.idCampaign = generateEntityId()
      }
      return isNew
        ? api.post<Campaign>('/data/campaign/save/', body)
        : api.put<Campaign>('/data/campaign/save/', body)
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.campaigns.all }),
        invalidateCampaignFunnelAuxiliary(qc),
      ])
    },
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/campaign/delete/', { idCampaign: id }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.campaigns.all }),
        invalidateCampaignFunnelAuxiliary(qc),
      ])
    },
  })
}

export function useCloneCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const wire = await api.post<Record<string, unknown>>(
        '/data/campaign/clone/',
        undefined,
        { idCampaign: id },
      )
      return idNamePairFromCloneWire(wire, 'idCampaign', 'campaignName')
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.campaigns.all }),
        invalidateCampaignFunnelAuxiliary(qc),
      ])
    },
  })
}
