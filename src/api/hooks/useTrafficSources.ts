import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { normalizeTemplateList } from '@/api/normalizeTemplateList'
import type { TrafficSourceTemplateLoadResponse } from '@/api/trafficSourceTemplateLoad'
import { queryKeys } from '@/api/queryKeys'
import type { TrafficSource } from '@/types/entities'

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
    queryFn: () => api.get<TrafficSource>('/data/trafficsource/find/byId/', { idTrafficSource: id }),
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
        const rest = { ...ts }
        delete rest.postback
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
    mutationFn: (id: string) => api.delete('/data/trafficsource/delete/', { idTrafficSource: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trafficSources.all })
    },
  })
}

export function useCloneTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post('/data/trafficsource/clone/', { idTrafficSource: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trafficSources.all })
    },
  })
}

export function useArchiveTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      api.put('/data/trafficsource/archive/', { ids: [id], archive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.trafficSources.all })
    },
  })
}

export function useTrafficSourceTemplates(enabled = true) {
  return useQuery({
    queryKey: queryKeys.trafficSources.templates,
    queryFn: async () => {
      const raw = await api.get<unknown>('/data/trafficsource/template/list/')
      return normalizeTemplateList(raw)
    },
    enabled,
  })
}

export function useLoadTrafficSourceTemplate() {
  return useMutation({
    mutationFn: (id: string) =>
      api.get<TrafficSourceTemplateLoadResponse>('/data/trafficsource/template/load/', {
        name: id,
      }),
  })
}
