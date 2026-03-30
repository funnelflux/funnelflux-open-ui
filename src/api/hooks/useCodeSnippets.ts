import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { CodeSnippet } from '@/types/funnel'

export function useCodeSnippets(type?: 'javascript' | 'php') {
  return useQuery({
    queryKey: queryKeys.codeSnippets.list(type),
    queryFn: () =>
      api.get<CodeSnippet[]>(
        '/data/code-snippet/list/',
        type ? { type } : undefined,
      ),
  })
}

export function useCodeSnippet(id: string) {
  return useQuery({
    queryKey: queryKeys.codeSnippets.detail(id),
    queryFn: () => api.get<CodeSnippet>('/data/code-snippet/find/byId/', { id }),
    enabled: !!id,
  })
}

export function useSaveCodeSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snippet: Partial<CodeSnippet>) => {
      const isNew = !snippet.idSnippet || snippet.idSnippet === '0'
      return isNew
        ? api.post<CodeSnippet>('/data/code-snippet/save/', snippet)
        : api.put<CodeSnippet>('/data/code-snippet/save/', snippet)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.codeSnippets.all })
    },
  })
}

export function useDeleteCodeSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/data/code-snippet/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.codeSnippets.all })
    },
  })
}
