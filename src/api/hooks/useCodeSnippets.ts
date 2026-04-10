import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { CodeSnippet } from '@/types/funnel'

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

export function useCodeSnippet(id: string) {
  return useQuery({
    queryKey: queryKeys.codeSnippets.detail(id),
    queryFn: () =>
      api.get<CodeSnippet>('/data/campaign/funnel/codesnippet/find/byId/', { idCode: id }),
    enabled: !!id,
  })
}

export function useSaveCodeSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snippet: Partial<CodeSnippet>) => {
      const isNew = !snippet.idSnippet || snippet.idSnippet === '0'
      return isNew
        ? api.post<CodeSnippet>('/data/campaign/funnel/codesnippet/save/', snippet)
        : api.put<CodeSnippet>('/data/campaign/funnel/codesnippet/save/', snippet)
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
