import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { OfferSourceTemplateLoadResponse } from '@/api/offerSourceTemplateLoad'
import { normalizeTemplateList } from '@/api/normalizeTemplateList'
import { queryKeys } from '@/api/queryKeys'
import type { OfferSource } from '@/types/entities'
import type { OfferSourceFormData } from '@/schemas/offerSource'

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
    queryFn: () => api.get<OfferSource>('/data/offersource/find/byId/', { id }),
    enabled: !!id,
  })
}

export function useSaveOfferSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (offerSource: OfferSourceFormData) => {
      const isNew = !offerSource.idOfferSource || offerSource.idOfferSource === '0'
      return isNew
        ? api.post<OfferSource>('/data/offersource/save/', offerSource)
        : api.put<OfferSource>('/data/offersource/save/', offerSource)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offerSources.all })
    },
  })
}

export function useDeleteOfferSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/offersource/delete/', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.offerSources.all })
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
