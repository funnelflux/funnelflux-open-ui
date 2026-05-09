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

export function useTrafficFilters(status?: string) {
  const params: Record<string, string> = {}
  if (status && status !== 'all') params.status = status
  return useQuery({
    queryKey: queryKeys.trafficFilters.list(params),
    queryFn: async () => {
      if (status === 'enabled') {
        return api.get<TrafficFilter[]>('/data/trafficfilter/find/byStatus/', { status: 'enabled' })
      }
      if (status === 'disabled') {
        return api.get<TrafficFilter[]>('/data/trafficfilter/find/byStatus/', { status: 'disabled' })
      }
      const payload = await api.get<TrafficFiltersData>('/ui/trafficfilters/load/')
      return Array.isArray(payload.filters) ? payload.filters : []
    },
  })
}

export function useTrafficFilter(id: string) {
  return useQuery({
    queryKey: queryKeys.trafficFilters.detail(id),
    queryFn: () =>
      api.get<TrafficFilter>('/data/trafficfilter/find/byId/', { idTrafficFilter: id }),
    enabled: !!id,
  })
}

export function useSaveTrafficFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, isCreate }: SaveTrafficFilterInput) =>
      isCreate
        ? api.post<TrafficFilter>('/data/trafficfilter/save/', data)
        : api.put<TrafficFilter>('/data/trafficfilter/save/', data),
    onSuccess: (saved: TrafficFilter) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.trafficFilters.all,
        predicate: (q) => (q.queryKey as unknown[])[1] === 'list',
      })
      const id = saved.idTrafficFilter
      if (id) {
        void qc.invalidateQueries({ queryKey: queryKeys.trafficFilters.detail(id) })
      }
    },
  })
}

export function useDeleteTrafficFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idTrafficFilter: string) =>
      api.delete('/data/trafficfilter/delete/', { idTrafficFilter }),
    onSuccess: (_data, idTrafficFilter) => {
      qc.removeQueries({ queryKey: queryKeys.trafficFilters.detail(idTrafficFilter) })
      void qc.invalidateQueries({
        queryKey: queryKeys.trafficFilters.all,
        predicate: (q) => (q.queryKey as unknown[])[1] === 'list',
      })
    },
  })
}

export function useApplyTrafficFilterRetroactively() {
  return useMutation({
    mutationFn: (idTrafficFilter: string) => {
      const body: TrafficFilterApplyRequest = { idFilter: idTrafficFilter }
      return api.post('/data/trafficfilter/applyRetroactively/', body)
    },
  })
}
