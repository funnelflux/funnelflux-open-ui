import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { InboxMessage, InboxData } from '@/types/ui'

export function useInboxMessages() {
  return useQuery({
    queryKey: queryKeys.inbox.list(),
    queryFn: async (): Promise<InboxMessage[]> => {
      const raw = await api.get<InboxMessage[] | InboxData>('/ui/inbox/load/')
      if (Array.isArray(raw)) return raw
      if (raw && typeof raw === 'object' && Array.isArray(raw.rows)) return raw.rows
      return []
    },
  })
}

export function useInboxMessage(id: string) {
  return useQuery({
    queryKey: queryKeys.inbox.detail(id),
    queryFn: () => api.get<InboxMessage>('/ui/inbox/message/load/', { id }),
    enabled: !!id,
  })
}

export function useChangeReadStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, isRead }: { ids: string[]; isRead: boolean }) =>
      api.put(
        '/ui/inbox/message/changeReadStatus/',
        { ids },
        { alreadyRead: isRead ? '1' : '0' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inbox.all })
    },
  })
}

export function useDeleteInboxMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.delete('/ui/inbox/message/delete/', undefined, { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inbox.all })
    },
  })
}
