import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { normalizeTemplateList } from '@/api/normalizeTemplateList'
import type { TrafficSourceTemplateLoadResponse } from '@/api/trafficSourceTemplateLoad'
import { queryKeys } from '@/api/queryKeys'
import {
  applyTrafficSourceArchiveToEntityGridCaches,
  refreshTrafficSourcesListQueries,
  removeTrafficSourceFromEntityGridCaches,
  upsertClonedTrafficSourceInEntityGridCaches,
  upsertTrafficSourceInEntityGridCaches,
  type TrafficSourceCloneWireResponse,
} from '@/lib/entityGridQueryCache'
import type { TrafficSource } from '@/types/entities'

export type SaveTrafficSourceInput = {
  trafficSource: Partial<TrafficSource>
  isCreate: boolean
}

export type CloneTrafficSourceVariables =
  | string
  | { idTrafficSource: string; categoryId?: string }

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
    mutationFn: ({ trafficSource, isCreate }: SaveTrafficSourceInput) => {
      const id = trafficSource.idTrafficSource
      if (!id) {
        throw new Error('idTrafficSource is required')
      }
      let body: Partial<TrafficSource> = { ...trafficSource }
      if (body.postback) {
        body = {
          ...body,
          postback: { ...body.postback, idTrafficSource: id },
        }
      }
      return isCreate
        ? api.post<TrafficSource>('/data/trafficsource/save/', body)
        : api.put<TrafficSource>('/data/trafficsource/save/', body)
    },
    onSuccess: (saved) => {
      upsertTrafficSourceInEntityGridCaches(qc, saved)
      refreshTrafficSourcesListQueries(qc)
      void qc.invalidateQueries({ queryKey: queryKeys.trafficSources.detail(saved.idTrafficSource) })
    },
  })
}

export function useDeleteTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/trafficsource/delete/', { idTrafficSource: id }),
    onSuccess: (_, id) => {
      removeTrafficSourceFromEntityGridCaches(qc, id)
      refreshTrafficSourcesListQueries(qc)
      qc.removeQueries({ queryKey: queryKeys.trafficSources.detail(id) })
    },
  })
}

export function useCloneTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CloneTrafficSourceVariables) => {
      const idTrafficSource = typeof input === 'string' ? input : input.idTrafficSource
      const categoryId = typeof input === 'object' ? input.categoryId : undefined
      const data = await api.post<TrafficSourceCloneWireResponse>(
        '/data/trafficsource/clone/',
        undefined,
        { idTrafficSource },
      )
      return { ...data, categoryId }
    },
    onSuccess: (data) => {
      upsertClonedTrafficSourceInEntityGridCaches(qc, {
        idTrafficSource: data.idTrafficSource,
        trafficSourceName: data.trafficSourceName,
        categoryId: data.categoryId,
      })
      refreshTrafficSourcesListQueries(qc)
      void qc.invalidateQueries({ queryKey: queryKeys.trafficSources.detail(data.idTrafficSource) })
    },
  })
}

export function useArchiveTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      api.put('/data/trafficsource/archive/', { ids: [id], archive }),
    onSuccess: (_, { id, archive }) => {
      applyTrafficSourceArchiveToEntityGridCaches(qc, id, archive)
      refreshTrafficSourcesListQueries(qc)
      void qc.invalidateQueries({ queryKey: queryKeys.trafficSources.detail(id) })
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
