import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { normalizeTemplateList } from '@/api/normalizeTemplateList'
import type { TrafficSourceTemplateLoadResponse } from '@/api/trafficSourceTemplateLoad'
import { queryKeys } from '@/api/queryKeys'
import {
  invalidateTrafficSourceAuxiliaryAfterGridPatch,
  invalidateTrafficSourceDataAfterCategoryChange,
  emptyBulkResult,
  type BulkResult,
} from '@/api/invalidations'
import { errorToApiError } from '@/api/errors'
import {
  applyTrafficSourceArchiveToEntityGridCaches,
  removeTrafficSourceFromEntityGridCaches,
  upsertClonedTrafficSourceInEntityGridCaches,
  upsertTrafficSourceInEntityGridCaches,
  type TrafficSourceCloneWireResponse,
} from '@/lib/entityGridQueryCache'
import { trafficSourceForEntityGridCache } from '@/lib/entityGridSaveMerge'
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
    onSuccess: async (saveResponse, variables) => {
      const mergedTrafficSource = trafficSourceForEntityGridCache(saveResponse, variables.trafficSource)
      if (mergedTrafficSource) {
        upsertTrafficSourceInEntityGridCaches(qc, mergedTrafficSource)
        void qc.invalidateQueries({
          queryKey: queryKeys.trafficSources.detail(mergedTrafficSource.idTrafficSource),
        })
      }
      await invalidateTrafficSourceAuxiliaryAfterGridPatch(qc)
    },
  })
}

export function useDeleteTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/trafficsource/delete/', { idTrafficSource: id }),
    onSuccess: async (_, id) => {
      removeTrafficSourceFromEntityGridCaches(qc, id)
      qc.removeQueries({ queryKey: queryKeys.trafficSources.detail(id) })
      await invalidateTrafficSourceAuxiliaryAfterGridPatch(qc)
    },
  })
}

export function useBulkDeleteTrafficSources() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkResult<string>> => {
      const out = emptyBulkResult<string>()
      for (const id of ids) {
        if (id === '1') continue
        try {
          await api.delete('/data/trafficsource/delete/', { idTrafficSource: id })
          out.succeeded.push(id)
        } catch (e) {
          out.failed.push({ id, error: errorToApiError(e) })
        }
      }
      return out
    },
    onSuccess: async (result) => {
      for (const id of result.succeeded) {
        removeTrafficSourceFromEntityGridCaches(qc, id)
        qc.removeQueries({ queryKey: queryKeys.trafficSources.detail(id) })
      }
      if (result.succeeded.length > 0) {
        await invalidateTrafficSourceAuxiliaryAfterGridPatch(qc)
      }
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
    onSuccess: async (data) => {
      upsertClonedTrafficSourceInEntityGridCaches(qc, {
        idTrafficSource: data.idTrafficSource,
        trafficSourceName: data.trafficSourceName,
        categoryId: data.categoryId,
      })
      void qc.invalidateQueries({ queryKey: queryKeys.trafficSources.detail(data.idTrafficSource) })
      await invalidateTrafficSourceAuxiliaryAfterGridPatch(qc)
    },
  })
}

export function useArchiveTrafficSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, archive }: { ids: string[]; archive: boolean }) =>
      api.put('/data/trafficsource/archive/', { ids, archive }),
    onSuccess: async (_, { ids, archive }) => {
      for (const id of ids) {
        applyTrafficSourceArchiveToEntityGridCaches(qc, id, archive)
      }
      for (const id of ids) {
        void qc.invalidateQueries({ queryKey: queryKeys.trafficSources.detail(id) })
      }
      await invalidateTrafficSourceAuxiliaryAfterGridPatch(qc)
    },
  })
}

export function useAssignTrafficSourcesToCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      trafficSourceIds,
      idCategory,
    }: {
      trafficSourceIds: string[]
      idCategory: string
    }) =>
      api.put('/data/trafficsource/category/assign/', { trafficSourceIds, idCategory }),
    onSuccess: async () => {
      await invalidateTrafficSourceDataAfterCategoryChange(qc)
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
