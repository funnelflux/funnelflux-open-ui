import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { FunnelCodeSnippet } from '@/types/entities'

export type SaveCodeSnippetVars = {
  snippet: FunnelCodeSnippet
  mode: 'create' | 'update'
}

/** Row from `GET /data/campaign/funnel/codesnippet/list/` */
export type CodeSnippetListRow = {
  id: string
  name: string
  codeType?: string
}

export function useCodeSnippets(type?: 'javascript' | 'php') {
  return useQuery({
    queryKey: queryKeys.codeSnippets.list(type),
    queryFn: () =>
      api.get<CodeSnippetListRow[]>(
        '/data/campaign/funnel/codesnippet/list/',
        type ? { codeType: type } : undefined,
      ),
  })
}

export function useCodeSnippet(id: string, options?: { enabled?: boolean }) {
  const enabledToggle = options?.enabled ?? true
  return useQuery({
    queryKey: queryKeys.codeSnippets.detail(id),
    queryFn: () =>
      api.get<FunnelCodeSnippet>('/data/campaign/funnel/codesnippet/find/byId/', { idCode: id }),
    enabled: !!id && enabledToggle,
  })
}

export function useSaveCodeSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ snippet, mode }: SaveCodeSnippetVars) => {
      if (mode === 'create') {
        await api.post<unknown>('/data/campaign/funnel/codesnippet/save/', snippet)
      } else {
        await api.put<unknown>('/data/campaign/funnel/codesnippet/save/', snippet)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.codeSnippets.all })
    },
  })
}

export function useDeleteCodeSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete('/data/campaign/funnel/codesnippet/delete/', { idCode: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.codeSnippets.all })
    },
  })
}
