import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { OfferSourceTemplateLoadResponse } from '@/api/offerSourceTemplateLoad'
import { normalizeTemplateList } from '@/api/normalizeTemplateList'
import { queryKeys } from '@/api/queryKeys'
import { invalidateOfferSourceAuxiliaryAfterGridPatch } from '@/api/invalidations'
import {
  applyOfferSourceArchiveToEntityGridCaches,
  removeOfferSourceFromEntityGridCaches,
  upsertClonedOfferSourceInEntityGridCaches,
  upsertOfferSourceInEntityGridCaches,
  type OfferSourceCloneWireResponse,
} from '@/lib/entity-table/data/queryCache'
import { offerSourceForEntityGridCache } from '@/lib/entity-table/data/saveMerge'
import type { OfferSource } from '@/types/entities'
import type { OfferSourceFormData } from '@/schemas/offerSource'

export type SaveOfferSourceInput = {
  offerSource: OfferSourceFormData
  isCreate: boolean
}

export function useOfferSources(status?: string) {
  const params: Record<string, string> = {}
  if (status && status !== 'all') params.status = status
  return useQuery({
    queryKey: queryKeys.offerSources.list(params),
    queryFn: () => {
      if (status === 'archived') {
        return api.get<OfferSource[]>('/data/offersource/find/byStatus/', { status: 'archived' })
      }
      return api.get<OfferSource[]>('/data/offersource/find/byStatus/', { status: 'active' })
    },
  })
}

export function useOfferSource(id: string) {
  return useQuery({
    queryKey: queryKeys.offerSources.detail(id),
    queryFn: () => api.get<OfferSource>('/data/offersource/find/byId/', { idOfferSource: id }),
    enabled: !!id,
  })
}

export function useSaveOfferSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ offerSource, isCreate }: SaveOfferSourceInput) =>
      isCreate
        ? api.post<OfferSource>('/data/offersource/save/', offerSource)
        : api.put<OfferSource>('/data/offersource/save/', offerSource),
    onSuccess: (saveResponse, variables) => {
      const mergedOfferSource = offerSourceForEntityGridCache(saveResponse, variables.offerSource)
      if (mergedOfferSource) {
        upsertOfferSourceInEntityGridCaches(queryClient, mergedOfferSource)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.offerSources.detail(mergedOfferSource.idOfferSource),
        })
      }
      void invalidateOfferSourceAuxiliaryAfterGridPatch(queryClient)
    },
  })
}

export function useDeleteOfferSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/offersource/delete/', { idOfferSource: id }),
    onSuccess: async (_, id) => {
      removeOfferSourceFromEntityGridCaches(queryClient, id)
      queryClient.removeQueries({ queryKey: queryKeys.offerSources.detail(id) })
      await invalidateOfferSourceAuxiliaryAfterGridPatch(queryClient)
    },
  })
}

export function useArchiveOfferSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, archive }: { ids: string[]; archive: boolean }) =>
      api.put('/data/offersource/archive/', { ids, archive }),
    onSuccess: async (_, { ids, archive }) => {
      applyOfferSourceArchiveToEntityGridCaches(queryClient, ids, archive)
      for (const id of ids) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.offerSources.detail(id) })
      }
      await invalidateOfferSourceAuxiliaryAfterGridPatch(queryClient)
    },
  })
}

export function useCloneOfferSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<OfferSourceCloneWireResponse>('/data/offersource/clone/', undefined, {
        idOfferSource: id,
      }),
    onSuccess: async (data) => {
      upsertClonedOfferSourceInEntityGridCaches(queryClient, data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.offerSources.detail(data.idOfferSource) })
      await invalidateOfferSourceAuxiliaryAfterGridPatch(queryClient)
    },
  })
}

export function useOfferSourceTemplates(enabled = true) {
  return useQuery({
    queryKey: queryKeys.offerSources.templates,
    queryFn: async () => {
      const raw = await api.get<unknown>('/data/offersource/template/list/')
      return normalizeTemplateList(raw)
    },
    enabled,
  })
}

export function useLoadOfferSourceTemplate() {
  return useMutation({
    mutationFn: (id: string) =>
      api.get<OfferSourceTemplateLoadResponse>('/data/offersource/template/load/', { name: id }),
  })
}
