import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Page, PageType } from '@/types/entities'

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
    mutationFn: (page: Partial<Page>) => {
      const isNew = !page.idPage || page.idPage === '0'
      return isNew
        ? api.post<Page>('/data/page/save/', page)
        : api.put<Page>('/data/page/save/', page)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all })
    },
  })
}

export function useDeletePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/page/delete/', { idPage: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all })
    },
  })
}

export function useClonePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post('/data/page/clone/', undefined, { idPage: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all })
    },
  })
}

export function useArchivePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      api.put('/data/page/archive/', { ids: [id], archive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all })
    },
  })
}
