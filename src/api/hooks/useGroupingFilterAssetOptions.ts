import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { SelectOption } from '@/components/ui-kit'
import { getGroupingFilterAssetKind } from '@/lib/groupingFilterAssets'
import type { IdName, OfferSource } from '@/types/entities'

/**
 * `/data/page/list/` returns lightweight rows `{ id, name }` (see DBTablePages::getAllPageIdsAndNames).
 * Full `Page` entities use `idPage` / `pageName`; accept both shapes.
 */
type PageListRow = {
  id?: string
  name?: string
  idPage?: string
  pageName?: string
}

function mapIdNameToOptions(rows: IdName[]): SelectOption[] {
  return rows.map((r) => ({
    label: r.name,
    value: String(r.id),
    searchId: String(r.id),
  }))
}

function mapPageListRowsToOptions(rows: PageListRow[]): SelectOption[] {
  const out: SelectOption[] = []
  for (const p of rows) {
    const id = p.idPage ?? p.id
    if (id == null || String(id).trim() === '') continue
    const sid = String(id)
    const rawName = p.pageName ?? p.name
    const label =
      rawName != null && String(rawName).trim() !== '' ? String(rawName) : sid
    out.push({ label, value: sid, searchId: sid })
  }
  return out
}

/**
 * `/data/trafficsource/list/` returns list rows with `id` / `name` (see TrafficSourceRepository).
 * Detail-shaped entities use `idTrafficSource` / `trafficSourceName`; accept both.
 */
type TrafficSourceListRow = {
  id?: string
  name?: string
  idTrafficSource?: string
  trafficSourceName?: string
}

function mapTrafficSourceListRowsToOptions(rows: TrafficSourceListRow[]): SelectOption[] {
  const out: SelectOption[] = []
  for (const t of rows) {
    const id = t.idTrafficSource ?? t.id
    if (id == null || String(id).trim() === '') continue
    const sid = String(id)
    const rawName = t.trafficSourceName ?? t.name
    const label =
      rawName != null && String(rawName).trim() !== '' ? String(rawName) : sid
    out.push({ label, value: sid, searchId: sid })
  }
  return out
}

export function useGroupingFilterAssetOptions(groupBy: string, queryEnabled: boolean) {
  const kind = useMemo(() => getGroupingFilterAssetKind(groupBy), [groupBy])
  const enabled = queryEnabled && kind !== null

  const campaigns = useQuery({
    queryKey: queryKeys.campaigns.list({ simple: 'true' }),
    queryFn: () =>
      api.get<IdName[]>('/data/campaign/list/').then((rows) =>
        rows.map((r) => ({ ...r, id: String(r.id) })),
      ),
    enabled: enabled && kind === 'campaign',
    staleTime: 60_000,
  })

  const funnels = useQuery({
    queryKey: [...queryKeys.funnels.all, 'list', 'ALL', 'prefixed'] as const,
    queryFn: () =>
      api
        .get<IdName[]>('/data/campaign/funnel/list/', { prefixWithCampaignNames: 'true' })
        .then((rows) => rows.map((r) => ({ ...r, id: String(r.id) }))),
    enabled: enabled && kind === 'funnel',
    staleTime: 60_000,
  })

  const landers = useQuery({
    queryKey: queryKeys.pages.list({ pageType: 'lander' }),
    queryFn: () => api.get<PageListRow[]>('/data/page/list/', { pageType: 'lander' }),
    enabled: enabled && kind === 'lander',
    staleTime: 60_000,
  })

  const offers = useQuery({
    queryKey: queryKeys.pages.list({ pageType: 'offer' }),
    queryFn: () => api.get<PageListRow[]>('/data/page/list/', { pageType: 'offer' }),
    enabled: enabled && kind === 'offer',
    staleTime: 60_000,
  })

  const pageCategories = useQuery({
    queryKey: queryKeys.categories.list('page'),
    queryFn: () =>
      api
        .get<Array<{ idCategory?: string; id?: string; name?: string }>>('/data/page/category/list/')
        .then((response) =>
          response.map((c) => ({
            idCategory: String(c.idCategory ?? c.id ?? ''),
            name: c.name ?? '',
          })),
        ),
    enabled: enabled && kind === 'pageCategory',
    staleTime: 60_000,
  })

  const trafficSources = useQuery({
    queryKey: queryKeys.trafficSources.list({}),
    queryFn: () => api.get<TrafficSourceListRow[]>('/data/trafficsource/list/'),
    enabled: enabled && kind === 'trafficSource',
    staleTime: 60_000,
  })

  const offerSources = useQuery({
    queryKey: [...queryKeys.offerSources.all, 'list', 'groupingFilter', 'all'] as const,
    queryFn: async () => {
      const [active, archived] = await Promise.all([
        api.get<OfferSource[]>('/data/offersource/find/byStatus/', { status: 'active' }),
        api.get<OfferSource[]>('/data/offersource/find/byStatus/', { status: 'archived' }),
      ])
      const byId = new Map<string, OfferSource>()
      for (const o of [...active, ...archived]) {
        byId.set(String(o.idOfferSource), o)
      }
      return [...byId.values()]
    },
    enabled: enabled && kind === 'offerSource',
    staleTime: 60_000,
  })

  return useMemo(() => {
    if (!kind) {
      return { kind: null, options: [] as SelectOption[], isLoading: false, isAsset: false }
    }

    let options: SelectOption[] = []
    let isLoading = false

    switch (kind) {
      case 'campaign':
        options = mapIdNameToOptions(campaigns.data ?? [])
        isLoading = campaigns.isLoading
        break
      case 'funnel':
        options = mapIdNameToOptions(funnels.data ?? [])
        isLoading = funnels.isLoading
        break
      case 'lander':
        options = mapPageListRowsToOptions(landers.data ?? [])
        isLoading = landers.isLoading
        break
      case 'offer':
        options = mapPageListRowsToOptions(offers.data ?? [])
        isLoading = offers.isLoading
        break
      case 'pageCategory':
        options = (pageCategories.data ?? [])
          .filter((c) => c.idCategory)
          .map((c) => ({
            label: c.name,
            value: c.idCategory,
            searchId: c.idCategory,
          }))
        isLoading = pageCategories.isLoading
        break
      case 'trafficSource':
        options = mapTrafficSourceListRowsToOptions(trafficSources.data ?? [])
        isLoading = trafficSources.isLoading
        break
      case 'offerSource':
        options = (offerSources.data ?? []).map((o) => ({
          label: o.offerSourceName,
          value: String(o.idOfferSource),
          searchId: String(o.idOfferSource),
        }))
        isLoading = offerSources.isLoading
        break
      default:
        break
    }

    return { kind, options, isLoading, isAsset: true as const }
  }, [
    kind,
    campaigns.data,
    campaigns.isLoading,
    funnels.data,
    funnels.isLoading,
    landers.data,
    landers.isLoading,
    offers.data,
    offers.isLoading,
    pageCategories.data,
    pageCategories.isLoading,
    trafficSources.data,
    trafficSources.isLoading,
    offerSources.data,
    offerSources.isLoading,
  ])
}
