import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Tag } from '@/types/entities'

/** Comma-separated input → non-empty trimmed names (matches PHP `TagCreateRequest.tags`). */
export function parseTagNamesInput(input: string): string[] {
  return input
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
}

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: () => api.get<Tag[]>('/data/tag/list/'),
  })
}

export function useSaveTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: string) => {
      const tags = parseTagNamesInput(input)
      if (tags.length === 0) {
        return Promise.reject(new Error('Enter at least one tag name'))
      }
      return api.post('/data/tag/save/', { tags })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idTag, name }: { idTag: string; name: string }) =>
      api.put('/data/tag/update/', { idTag, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
  })
}
