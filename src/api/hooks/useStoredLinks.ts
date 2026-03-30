import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { StoredLink } from '@/types/ui'

export function useStoredLinks() {
  return useQuery({
    queryKey: queryKeys.storedLinks.list(),
    queryFn: () => api.get<StoredLink[]>('/ui/storedlinks/load/'),
  })
}

export function useSaveStoredLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (link: Partial<StoredLink>) =>
      api.post<StoredLink>('/ui/storedlinks/save/', link),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.storedLinks.all })
    },
  })
}

export function useDeleteStoredLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/ui/storedlinks/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.storedLinks.all })
    },
  })
}

export function useResetStoredLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post('/ui/storedlinks/reset/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.storedLinks.all })
    },
  })
}
