import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { ManagedUser } from '@/types/ui'

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.userManagement.list(),
    queryFn: () => api.get<ManagedUser[]>('/ui/usermanagement/load/'),
  })
}

export function useChangeUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userIds, enabled }: { userIds: number[]; enabled: boolean }) =>
      api.post('/ui/usermanagement/changeUsersStatus/', { userIds, enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userManagement.all })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete('/ui/usermanagement/delete/', { id: String(id) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userManagement.all })
    },
  })
}
