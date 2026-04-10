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
      // Backend Postback model requires idTrafficSource in the nested object.
      // For updates, inject it; for creates, omit postback so the backend uses its default.
      if (isNew) {
        const { postback: _, ...rest } = ts
        return api.post<TrafficSource>('/data/trafficsource/save/', rest)
      }
      if (ts.postback) {
        ts = { ...ts, postback: { ...ts.postback, idTrafficSource: ts.idTrafficSource! } }
      }
      return api.put<TrafficSource>('/data/trafficsource/save/', ts)
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
