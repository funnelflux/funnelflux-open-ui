import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { Tag } from '@/types/entities'

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: () => api.get<Tag[]>('/data/tag/list/'),
  })
}

export function useSaveTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (names: string) =>
      api.post('/data/tag/save/', { names }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put('/data/tag/update/', { id, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags.all })
    },
  })
}
