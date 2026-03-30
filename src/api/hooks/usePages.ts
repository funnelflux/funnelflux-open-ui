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

export function usePage(id: string) {
  return useQuery({
    queryKey: queryKeys.pages.detail(id),
    queryFn: () => api.get<Page>('/data/page/find/byId/', { id }),
    enabled: !!id,
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
    mutationFn: (id: string) => api.delete('/data/page/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all })
    },
  })
}

export function useClonePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post('/data/page/clone/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all })
    },
  })
}

export function useArchivePage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      api.post('/data/page/archive/', { id, archive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages.all })
    },
  })
}
