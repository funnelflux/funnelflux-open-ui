import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { fetchAllFlatDrilldownRows } from '@/api/drilldown'
import { queryKeys } from '@/api/queryKeys'
import { filterDrilldownGroupingOptions } from '@/lib/drilldownGroupings'
import type { CsvExportRequest, CsvExportResponse, DrilldownRequest, Report } from '@/types/stats'

export function useGroupings() {
  return useQuery({
    queryKey: queryKeys.drilldown.groupings,
    queryFn: async () => {
      const rows = await api.get<string[]>('/stats/reporting/groupings/')
      return filterDrilldownGroupingOptions(rows)
    },
    staleTime: Infinity,
  })
}

export function useDrilldownReport() {
  return useMutation({
    mutationFn: (request: DrilldownRequest) =>
      api.postDrilldown<Report>(request),
  })
}

export function useAllFlatDrilldownReport() {
  return useMutation({
    mutationFn: (request: DrilldownRequest) => fetchAllFlatDrilldownRows(request),
  })
}

export function useExportCsv() {
  return useMutation({
    mutationFn: (request: CsvExportRequest) =>
      api.post<CsvExportResponse>('/stats/reporting/export/csv/', request),
  })
}
