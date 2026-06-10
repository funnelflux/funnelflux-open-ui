import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import {
  invalidatePageAuxiliaryAfterGridPatch,
  invalidatePageDataAfterCategoryChange,
  invalidatePageDataAfterCsvImport,
  emptyBulkResult,
  type BulkResult,
} from '@/api/invalidations'
import { errorToApiError } from '@/api/errors'
import type { Page, PageType } from '@/types/entities'
import {
  applyPageArchiveToEntityGridCaches,
  removePageFromEntityGridCaches,
  upsertClonedPageInEntityGridCaches,
  upsertPageInEntityGridCaches,
  type PageCloneWireResponse,
} from '@/lib/entity-table/data/queryCache'
import { pageForEntityGridCache } from '@/lib/entity-table/data/saveMerge'

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
    onSuccess: async (saveResponse, variables) => {
      const mergedPage = pageForEntityGridCache(saveResponse, variables.page)
      if (mergedPage) {
        upsertPageInEntityGridCaches(qc, mergedPage)
        qc.setQueryData(queryKeys.pages.detail(mergedPage.idPage), mergedPage)
      }
      await invalidatePageAuxiliaryAfterGridPatch(qc)
    },
  })
}

export function useDeletePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/page/delete/', { idPage: id }),
    onSuccess: async (_, idPage) => {
      removePageFromEntityGridCaches(qc, idPage)
      qc.removeQueries({ queryKey: queryKeys.pages.detail(idPage) })
      await invalidatePageAuxiliaryAfterGridPatch(qc)
    },
  })
}

export function useBulkDeletePages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkResult<string>> => {
      const out = emptyBulkResult<string>()
      for (const id of ids) {
        try {
          await api.delete('/data/page/delete/', { idPage: id })
          out.succeeded.push(id)
        } catch (e) {
          out.failed.push({ id, error: errorToApiError(e) })
        }
      }
      return out
    },
    onSuccess: async (result) => {
      for (const id of result.succeeded) {
        removePageFromEntityGridCaches(qc, id)
        qc.removeQueries({ queryKey: queryKeys.pages.detail(id) })
      }
      if (result.succeeded.length > 0) {
        await invalidatePageAuxiliaryAfterGridPatch(qc)
      }
    },
  })
}

export function useClonePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idPage }: ClonePageVariables) =>
      api.post<PageCloneWireResponse>('/data/page/clone/', undefined, { idPage }),
    onSuccess: async (data, variables) => {
      upsertClonedPageInEntityGridCaches(qc, {
        ...data,
        pageType: variables.pageType,
        categoryId: variables.categoryId,
      })
      await invalidatePageAuxiliaryAfterGridPatch(qc)
    },
  })
}

export function useArchivePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, archive }: { ids: string[]; archive: boolean }) =>
      api.put('/data/page/archive/', { ids, archive }),
    onSuccess: async (_, { ids, archive }) => {
      for (const id of ids) {
        applyPageArchiveToEntityGridCaches(qc, id, archive)
      }
      await invalidatePageAuxiliaryAfterGridPatch(qc)
    },
  })
}

export type CsvPageImportVariables = {
  file: File
  pageType: 'offer' | 'lander'
}

export function useImportPagesFromCsv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, pageType }: CsvPageImportVariables) => {
      const formData = new FormData()
      formData.append('csvFile', file)
      formData.append('type', pageType === 'offer' ? '2' : '1')
      return api.postFormData<{ success: boolean; imported: number; skipped: number }>(
        '/data/page/import/csv/',
        formData,
      )
    },
    onSuccess: async (result) => {
      if (result.imported > 0) {
        await invalidatePageDataAfterCsvImport(qc)
      }
    },
  })
}

export function useAssignPagesToCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pageIds,
      idCategory,
    }: {
      pageIds: string[]
      idCategory: string
    }) => api.put('/data/page/category/assign/', { pageIds, idCategory }),
    onSuccess: async () => {
      await invalidatePageDataAfterCategoryChange(qc)
    },
  })
}
