import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { IdName } from '@/types/entities'
import type { SystemLinkRequest, SystemLinksData } from '@/types/ui'
import { normalizeDomainsFromApiList, normalizeDomainValue } from '@/lib/normalizeDomainsFromApi'

/** List row from `/data/trafficsource/list/` (id, name, defaultCostPerEntrance, costType). */
export interface TrafficSourceOption extends IdName {
  defaultCostPerEntrance?: number
  costType?: 'cpe' | 'cpa'
}

export function useSystemLinksData() {
  return useQuery({
    queryKey: queryKeys.systemLinks.all,
    queryFn: async () => {
      const [campaigns, trafficSources, domainsRaw, trackingDefaultRaw, systemLinks] = await Promise.all([
        api.get<IdName[]>('/data/campaign/list/'),
        api.get<TrafficSourceOption[]>('/data/trafficsource/list/'),
        api.get<unknown>('/system/domain/list/'),
        api.get<unknown>('/system/domain/default/'),
        api.post<SystemLinksData>('/ui/systemlinks/load/', {
          elements: [
            'actionURL',
            'postbackURL',
            'conversionIframe',
            'pixelURLAndHTML',
            'clickbankIPN',
          ],
        }),
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
        domains: normalizeDomainsFromApiList(domainsRaw, normalizeDomainValue(trackingDefaultRaw)),
        actionURL: systemLinks.actionURL ?? '',
        postbackURL: systemLinks.postbackURL ?? '',
        conversionIframe: systemLinks.conversionIframe ?? '',
        pixelURL: systemLinks.pixelURL ?? '',
        pixelHTML: systemLinks.pixelHTML ?? '',
        clickbankIPNKey: systemLinks.clickbankIPNKey ?? '',
        clickbankIPNURL: systemLinks.clickbankIPNURL ?? '',
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
