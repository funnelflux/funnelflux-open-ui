import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { DrilldownRequest, Report } from '@/types/stats'

export function useGroupings() {
  return useQuery({
    queryKey: queryKeys.drilldown.groupings,
    queryFn: () => api.get<string[]>('/stats/reporting/groupings/'),
    staleTime: Infinity,
  })
}

export function useDrilldownReport() {
  return useMutation({
    mutationFn: (request: DrilldownRequest) =>
      api.post<Report>('/stats/reporting/drilldown/', request),
  })
}

export function useExportCsv() {
  return useMutation({
    mutationFn: (request: DrilldownRequest) =>
      api.post<Blob>('/stats/reporting/export/csv/', request),
  })
}
