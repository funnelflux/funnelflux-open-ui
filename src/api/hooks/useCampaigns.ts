import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Campaign, IdName, IdNamePair } from '@/types/entities'

/** Use `create: true` when saving a new campaign that already has a client-generated `idCampaign`. */
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

export function useCampaignsList() {
  return useQuery({
    queryKey: queryKeys.campaigns.list({ simple: 'true' }),
    queryFn: () =>
      api.get<IdName[]>('/data/campaign/list/').then((campaigns) =>
        campaigns.map((campaign) => ({
          ...campaign,
          id: String(campaign.id),
        })),
      ),
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
      return isNew
        ? api.post<Campaign>('/data/campaign/save/', body)
        : api.put<Campaign>('/data/campaign/save/', body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns.all })
    },
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/campaign/delete/', { idCampaign: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns.all })
    },
  })
}

export function useCloneCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<IdNamePair>('/data/campaign/clone/', undefined, { idCampaign: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns.all })
    },
  })
}
