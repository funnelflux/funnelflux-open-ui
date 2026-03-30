import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { TrafficSource } from '@/types/entities'
import type { Template } from '@/types/ui'

export function useTrafficSources(status?: string) {
  const params: Record<string, string> = {}
  if (status && status !== 'all') params.status = status
  return useQuery({
    queryKey: queryKeys.trafficSources.list(params),
    queryFn: () => {
      if (status === 'archived') {
        return api.get<TrafficSource[]>('/data/trafficsource/find/byStatus/', { status: 'archived' })
      }
      return api.get<TrafficSource[]>('/data/trafficsource/list/')
    },
  })
}

export function useTrafficSource(id: string) {
  return useQuery({
    queryKey: queryKeys.trafficSources.detail(id),
    queryFn: () => api.get<TrafficSource>('/data/trafficsource/find/byId/', { id }),
    enabled: !!id,
  })
}

export function useSaveTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ts: Partial<TrafficSource>) => {
      const isNew = !ts.idTrafficSource || ts.idTrafficSource === '0'
      return isNew
        ? api.post<TrafficSource>('/data/trafficsource/save/', ts)
        : api.put<TrafficSource>('/data/trafficsource/save/', ts)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trafficSources.all })
    },
  })
}

export function useDeleteTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/trafficsource/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trafficSources.all })
    },
  })
}

export function useCloneTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post('/data/trafficsource/clone/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trafficSources.all })
    },
  })
}

export function useArchiveTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      api.post('/data/trafficsource/archive/', { id, archive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trafficSources.all })
    },
  })
}

export function useTrafficSourceTemplates(enabled = true) {
  return useQuery({
    queryKey: queryKeys.trafficSources.templates,
    queryFn: () => api.get<Template[]>('/data/trafficsource/template/list/'),
    enabled,
  })
}

export function useLoadTrafficSourceTemplate() {
  return useMutation({
    mutationFn: (id: string) =>
      api.get<TrafficSource>('/data/trafficsource/template/load/', { id }),
  })
}
