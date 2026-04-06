import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { IdName } from '@/types/entities'
import type { Domain, SystemLinkRequest } from '@/types/ui'

/** List row from `/data/trafficsource/list/` (id, name, defaultCostPerEntrance, costType). */
export interface TrafficSourceOption extends IdName {
  defaultCostPerEntrance?: number
  costType?: 'cpe' | 'cpa'
}

/** `/system/domain/list/` returns an array of domain name strings (see DBTableDomains::listAllDomains). */
function normalizeDomains(raw: unknown): Domain[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `domain:${index}:${item}`,
        domain: item,
        isDefault: index === 0,
      }
    }
    const o = item as Record<string, unknown>
    const domain = typeof o.domain === 'string' ? o.domain : String(o.domain ?? '')
    const id =
      typeof o.id === 'string' || typeof o.id === 'number' ? String(o.id) : `domain:${index}:${domain}`
    return {
      id,
      domain,
      isDefault: Boolean(o.isDefault),
    }
  })
}

export function useSystemLinksData() {
  return useQuery({
    queryKey: queryKeys.systemLinks.all,
    queryFn: async () => {
      const [campaigns, trafficSources, domainsRaw] = await Promise.all([
        api.get<IdName[]>('/data/campaign/list/'),
        api.get<TrafficSourceOption[]>('/data/trafficsource/list/'),
        api.get<unknown>('/system/domain/list/'),
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
        domains: normalizeDomains(domainsRaw),
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
