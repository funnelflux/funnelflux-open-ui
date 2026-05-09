import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { fetchAllFlatDrilldownRows } from '@/api/drilldown'
import { queryKeys } from '@/api/queryKeys'
import { filterDrilldownGroupingOptions } from '@/lib/drilldownGroupings'
import type { CsvExportRequest, CsvExportResponse, DrilldownRequest, Report } from '@/types/stats'

const DRILLDOWN_QUERY_DISABLED = ['drilldown', 'report', 'disabled'] as const

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

/**
 * One page / slice of drilldown data; key includes the full request body so filter/sort changes
 * never display a stale response (React Query cancels in-flight fetches when the key changes).
 */
export function useDrilldownReportQuery(request: DrilldownRequest | null, enabled: boolean) {
  return useQuery({
    queryKey: request && enabled ? queryKeys.drilldown.report(request) : DRILLDOWN_QUERY_DISABLED,
    queryFn: ({ signal }) => api.postDrilldown<Report>(request!, undefined, signal),
    enabled: Boolean(request) && enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useAllFlatDrilldownReportQuery(request: DrilldownRequest | null, enabled: boolean) {
  return useQuery({
    queryKey: request && enabled ? queryKeys.drilldown.flatAllReport(request) : DRILLDOWN_QUERY_DISABLED,
    queryFn: ({ signal }) => fetchAllFlatDrilldownRows(request!, { signal }),
    enabled: Boolean(request) && enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useExportCsv() {
  return useMutation({
    mutationFn: (request: CsvExportRequest) =>
      api.post<CsvExportResponse>('/stats/reporting/export/csv/', request),
  })
}
