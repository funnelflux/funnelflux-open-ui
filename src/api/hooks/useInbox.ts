import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { InboxMessage } from '@/types/ui'

export function useInboxMessages() {
  return useQuery({
    queryKey: queryKeys.inbox.list(),
    queryFn: () => api.get<InboxMessage[]>('/ui/inbox/load/'),
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
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      api.post('/ui/inbox/message/changeReadStatus/', { id, isRead }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inbox.all })
    },
  })
}

export function useDeleteInboxMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete('/ui/inbox/message/delete/', { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inbox.all })
    },
  })
}
