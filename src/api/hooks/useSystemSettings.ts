import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { SystemSettings } from '@/types/ui'

export function useSystemSettings() {
  return useQuery({
    queryKey: queryKeys.systemSettings.all,
    queryFn: () => api.get<SystemSettings>('/ui/systemsettings/load/'),
  })
}

export function useSaveSystemSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: Partial<SystemSettings>) =>
      api.post('/ui/systemsettings/save/', settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.systemSettings.all })
    },
  })
}
