import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Campaign, IdName } from '@/types/entities'

export function useCampaigns(status?: 'active' | 'archived' | 'all') {
  const params = status && status !== 'all' ? { status } : undefined
  return useQuery({
    queryKey: queryKeys.campaigns.list(params),
    queryFn: () =>
      api.get<Campaign[]>(
        status === 'archived'
          ? '/data/campaign/find/byStatus/'
          : '/data/campaign/list/',
        status === 'archived' ? { status: 'archived' } : undefined,
      ),
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
    queryFn: () => api.get<Campaign>('/data/campaign/find/byId/', { id }),
    enabled: !!id,
  })
}

export function useSaveCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (campaign: Partial<Campaign>) => {
      const isNew = !campaign.idCampaign || campaign.idCampaign === '0'
      return isNew
        ? api.post<Campaign>('/data/campaign/save/', campaign)
        : api.put<Campaign>('/data/campaign/save/', campaign)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns.all })
    },
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/campaign/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns.all })
    },
  })
}

export function useCloneCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post('/data/campaign/clone/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns.all })
    },
  })
}
