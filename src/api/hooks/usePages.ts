import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Page, PageType } from '@/types/entities'
import {
  applyPageArchiveToEntityGridCaches,
  refreshPagesListQueries,
  removePageFromEntityGridCaches,
  upsertClonedPageInEntityGridCaches,
  upsertPageInEntityGridCaches,
  type PageCloneWireResponse,
} from '@/lib/entityGridQueryCache'
import { pageForEntityGridCache } from '@/lib/entityGridSaveMerge'

export type SavePageInput = {
  page: Partial<Page>
  isCreate: boolean
}

export type ClonePageVariables = {
  idPage: string
  pageType: PageType
  /** Source row category so the grid cache matches server clone behavior (FluxPage __clone keeps idCategory). */
  categoryId?: string
}

export function usePages(pageType?: PageType, status?: string) {
  const params: Record<string, string> = {}
  if (pageType) params.pageType = pageType
  if (status && status !== 'all') params.status = status
  return useQuery({
    queryKey: queryKeys.pages.list(params),
    queryFn: () => {
      if (status === 'archived') {
        return api.get<Page[]>('/data/page/find/byStatus/', { ...params, status: 'archived' })
      }
      return api.get<Page[]>('/data/page/list/', pageType ? { pageType } : undefined)
    },
  })
}

export function usePage(
  id: string,
  options?: {
    /** When false, the query does not run (e.g. modal closed). */
    enabled?: boolean
    /** Override global staleTime — use `0` when the UI must refetch whenever the query becomes active. */
    staleTime?: number
    refetchOnMount?: boolean | 'always'
  },
) {
  const hasId = !!id
  const enabled = options?.enabled !== undefined ? options.enabled && hasId : hasId

  return useQuery({
    queryKey: queryKeys.pages.detail(id),
    queryFn: () => api.get<Page>('/data/page/find/byId/', { idPage: id }),
    enabled,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
  })
}

export function useSavePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ page, isCreate }: SavePageInput) =>
      isCreate
        ? api.post<Page>('/data/page/save/', page)
        : api.put<Page>('/data/page/save/', page),
    onSuccess: (saveResponse, variables) => {
      const mergedPage = pageForEntityGridCache(saveResponse, variables.page)
      if (mergedPage) {
        upsertPageInEntityGridCaches(qc, mergedPage)
        void qc.invalidateQueries({ queryKey: queryKeys.pages.detail(mergedPage.idPage) })
      }
      refreshPagesListQueries(qc)
    },
  })
}

export function useDeletePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/page/delete/', { idPage: id }),
    onSuccess: (_, idPage) => {
      removePageFromEntityGridCaches(qc, idPage)
      refreshPagesListQueries(qc)
      qc.removeQueries({ queryKey: queryKeys.pages.detail(idPage) })
    },
  })
}

export function useClonePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idPage }: ClonePageVariables) =>
      api.post<PageCloneWireResponse>('/data/page/clone/', undefined, { idPage }),
    onSuccess: (data, variables) => {
      upsertClonedPageInEntityGridCaches(qc, {
        ...data,
        pageType: variables.pageType,
        categoryId: variables.categoryId,
      })
      refreshPagesListQueries(qc)
      void qc.invalidateQueries({ queryKey: queryKeys.pages.detail(data.idPage) })
    },
  })
}

export function useArchivePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      api.put('/data/page/archive/', { ids: [id], archive }),
    onSuccess: (_, { id, archive }) => {
      applyPageArchiveToEntityGridCaches(qc, id, archive)
      refreshPagesListQueries(qc)
      void qc.invalidateQueries({ queryKey: queryKeys.pages.detail(id) })
    },
  })
}
