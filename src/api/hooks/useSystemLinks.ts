import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { IdName } from '@/types/entities'
import type { Domain, SystemLinkRequest } from '@/types/ui'

export function useSystemLinksData() {
  return useQuery({
    queryKey: queryKeys.systemLinks.all,
    queryFn: async () => {
      const [campaigns, trafficSources, domains] = await Promise.all([
        api.get<IdName[]>('/data/campaign/list/'),
        api.get<IdName[]>('/data/trafficsource/list/'),
        api.get<Domain[]>('/system/domain/list/'),
      ])

      return {
        campaigns: campaigns.map((campaign) => ({
          ...campaign,
          id: String(campaign.id),
        })),
        trafficSources: trafficSources.map((trafficSource) => ({
          ...trafficSource,
          id: String(trafficSource.id),
        })),
        domains,
      }
    },
  })
}

export function useGenerateEntranceLink() {
  return useMutation({
    mutationFn: (request: SystemLinkRequest) =>
      api.post<string>('/system/links/entrance/', request),
  })
}

export function useGenerateActionLink() {
  return useMutation({
    mutationFn: (request: SystemLinkRequest) =>
      api.post<string>('/system/links/action/', request),
  })
}

export function useGenerateNoRedirectJS() {
  return useMutation({
    mutationFn: (request: SystemLinkRequest) =>
      api.post<string>('/system/links/no-redirect-js/', request),
  })
}
