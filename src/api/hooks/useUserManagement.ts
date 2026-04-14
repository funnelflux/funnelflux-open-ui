import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { UserManagementData } from '@/types/ui'

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.userManagement.list(),
    queryFn: async () => {
      const res = await api.get<UserManagementData>('/ui/usermanagement/load/')
      return res.rows ?? []
    },
  })
}

export function useChangeUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userIds, enabled }: { userIds: string[]; enabled: boolean }) =>
      api.put(
        '/ui/usermanagement/changeUsersStatus/',
        { ids: userIds },
        { enabled: enabled ? '1' : '0' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userManagement.all })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete('/ui/usermanagement/delete/', undefined, { ids: [id] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userManagement.all })
    },
  })
}
