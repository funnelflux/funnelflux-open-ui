import { useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { DashboardData } from '@/types/ui'

export function useLoadDashboard() {
  return useMutation({
    mutationFn: (elements: string[]) =>
      api.post<DashboardData>('/ui/dashboard/load/', { elements }),
  })
}
