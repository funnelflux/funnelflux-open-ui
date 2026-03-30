import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { TrafficFilter } from '@/types/entities'

export function useTrafficFilters(status?: string) {
  const params: Record<string, string> = {}
  if (status && status !== 'all') params.status = status
  return useQuery({
    queryKey: queryKeys.trafficFilters.list(params),
    queryFn: () => {
      if (status === 'enabled') {
        return api.get<TrafficFilter[]>('/data/trafficfilter/find/byStatus/', { status: 'enabled' })
      }
      if (status === 'disabled') {
        return api.get<TrafficFilter[]>('/data/trafficfilter/find/byStatus/', { status: 'disabled' })
      }
      return api.get<TrafficFilter[]>('/ui/trafficfilters/load/')
    },
  })
}

export function useTrafficFilter(id: string) {
  return useQuery({
    queryKey: queryKeys.trafficFilters.detail(id),
    queryFn: () => api.get<TrafficFilter>('/data/trafficfilter/find/byId/', { id }),
    enabled: !!id,
  })
}

export function useSaveTrafficFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filter: Partial<TrafficFilter>) => {
      const isNew = !filter.idTrafficFilter || filter.idTrafficFilter === '0'
      return isNew
        ? api.post<TrafficFilter>('/data/trafficfilter/save/', filter)
        : api.put<TrafficFilter>('/data/trafficfilter/save/', filter)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trafficFilters.all })
    },
  })
}

export function useDeleteTrafficFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/trafficfilter/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trafficFilters.all })
    },
  })
}

export function useApplyTrafficFilterRetroactively() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post('/data/trafficfilter/applyRetroactively/', { id }),
  })
}
