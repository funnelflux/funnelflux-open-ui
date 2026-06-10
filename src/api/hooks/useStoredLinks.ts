import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { StoredLink, StoredLinksData } from '@/types/ui'

export function useStoredLinks() {
  return useQuery({
    queryKey: queryKeys.storedLinks.list(),
    queryFn: async () => {
      const data = await api.post<StoredLinksData>('/ui/storedlinks/load/', {
        elements: ['storedLinks'],
      })
      return data.storedLinks ?? []
    },
  })
}

export function useSaveStoredLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (link: Partial<StoredLink>) =>
      api.put<StoredLink>('/ui/storedlinks/save/', link),
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
    mutationFn: (id: string) =>
      api.put('/ui/storedlinks/reset/', undefined, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.storedLinks.all })
    },
  })
}
