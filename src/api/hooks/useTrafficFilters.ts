import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { TrafficFilter, TrafficFilterApplyRequest } from '@/types/entities'
import type { TrafficFiltersData } from '@/types/ui'

export type SaveTrafficFilterInput = {
  data: Partial<TrafficFilter>
  /** POST create vs PUT update — required because new rows use a client-generated id before save. */
  isCreate: boolean
}

function normalizeTrafficFilter(filter: Partial<TrafficFilter>): TrafficFilter | null {
  if (!filter.idTrafficFilter || !filter.trafficFilterName || !filter.filterType) return null
  return {
    idTrafficFilter: filter.idTrafficFilter,
    trafficFilterName: filter.trafficFilterName,
    filterType: filter.filterType,
    filterEntries: filter.filterEntries ?? [],
    redirectToURL: filter.redirectToURL ?? null,
    isEnabled: filter.isEnabled ?? true,
  }
}

function statusMatchesFilter(status: unknown, filter: TrafficFilter): boolean {
  if (status === 'enabled') return Boolean(filter.isEnabled)
  if (status === 'disabled') return !filter.isEnabled
  return true
}

function upsertFilterInListData(
  previous: TrafficFiltersData | undefined,
  filter: TrafficFilter,
  status: unknown,
): TrafficFiltersData | undefined {
  if (!previous) return previous
  const withoutCurrent = previous.filters.filter((item) => item.idTrafficFilter !== filter.idTrafficFilter)
  const nextFilters = statusMatchesFilter(status, filter) ? [filter, ...withoutCurrent] : withoutCurrent
  return { ...previous, filters: nextFilters }
}

function removeFilterFromListData(
  previous: TrafficFiltersData | undefined,
  idTrafficFilter: string,
): TrafficFiltersData | undefined {
  if (!previous) return previous
  return {
    ...previous,
    filters: previous.filters.filter((item) => item.idTrafficFilter !== idTrafficFilter),
  }
}

type TrafficFilterListStatus = 'enabled' | 'disabled' | undefined

const TRAFFIC_FILTER_LIST_STATUSES: readonly TrafficFilterListStatus[] = [undefined, 'enabled', 'disabled']

function trafficFilterListParams(status: TrafficFilterListStatus): Record<string, string> {
  return status ? { status } : {}
}

export function useTrafficFilters(status?: string) {
  const params: Record<string, string> = {}
  if (status && status !== 'all') params.status = status
  return useQuery({
    queryKey: queryKeys.trafficFilters.list(params),
    queryFn: async () => {
      if (status === 'enabled') {
        const filters = await api.get<TrafficFilter[]>('/data/trafficfilter/find/byStatus/', { status: 'enabled' })
        return { filters, availableCountries: [] }
      }
      if (status === 'disabled') {
        const filters = await api.get<TrafficFilter[]>('/data/trafficfilter/find/byStatus/', { status: 'disabled' })
        return { filters, availableCountries: [] }
      }
      const payload = await api.get<TrafficFiltersData>('/ui/trafficfilters/load/')
      return {
        filters: Array.isArray(payload.filters) ? payload.filters : [],
        availableCountries: Array.isArray(payload.availableCountries) ? payload.availableCountries : [],
      }
    },
  })
}

export function useSaveTrafficFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, isCreate }: SaveTrafficFilterInput) =>
      isCreate
        ? api.post<TrafficFilter>('/data/trafficfilter/save/', data)
        : api.put<TrafficFilter>('/data/trafficfilter/save/', data),
    onSuccess: (_savedResponse, variables) => {
      const optimisticSavedFilter = normalizeTrafficFilter(variables.data)
      if (optimisticSavedFilter) {
        for (const listStatus of TRAFFIC_FILTER_LIST_STATUSES) {
          const params = trafficFilterListParams(listStatus)
          qc.setQueryData<TrafficFiltersData>(
            queryKeys.trafficFilters.list(params),
            (previous) => upsertFilterInListData(previous, optimisticSavedFilter, listStatus),
          )
        }
      }

      // Safety net: the optimistic patch is built from the client payload and skips server-side
      // normalization (and is skipped entirely for incomplete payloads). Mark everything stale so
      // the next mount refetches authoritative data, without disturbing the instant UI above.
      void qc.invalidateQueries({
        queryKey: queryKeys.trafficFilters.all,
        refetchType: 'inactive',
      })
    },
  })
}

export function useDeleteTrafficFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idTrafficFilter: string) =>
      api.delete('/data/trafficfilter/delete/', { idTrafficFilter }),
    onSuccess: (_data, idTrafficFilter) => {
      for (const listStatus of TRAFFIC_FILTER_LIST_STATUSES) {
        const params = trafficFilterListParams(listStatus)
        qc.setQueryData<TrafficFiltersData>(
          queryKeys.trafficFilters.list(params),
          (previous) => removeFilterFromListData(previous, idTrafficFilter),
        )
      }
      // Safety net: keep the optimistic removal for instant UI, refetch on next mount.
      void qc.invalidateQueries({
        queryKey: queryKeys.trafficFilters.all,
        refetchType: 'inactive',
      })
    },
  })
}

export function useApplyTrafficFilterRetroactively() {
  return useMutation({
    mutationFn: ({ idTrafficFilter, apply }: { idTrafficFilter: string; apply: boolean }) => {
      const body: TrafficFilterApplyRequest = { idFilter: idTrafficFilter, apply }
      return api.post('/data/trafficfilter/applyRetroactively/', body)
    },
  })
}
