import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { fetchAllFlatDrilldownRows } from '@/api/drilldown'
import { queryKeys } from '@/api/queryKeys'
import { buildDashboardSummaryRequest } from '@/lib/dashboard/summaryReport'
import { resolveReportingTimezone } from '@/lib/reportingTimezone'
import { drilldownSortParamFromReport } from '@/lib/drilldownTableSort'
import { metricsForColumnIds } from '@/lib/drilldownMetrics'
import type { DashboardData } from '@/types/ui'
import type { ApiDateTimeRange, DrilldownRequest, Report } from '@/types/stats'
import type { SortingState } from '@tanstack/react-table'

const WIDGET_METRIC_ORDER = [
  'visits',
  'landerClicks',
  'landerClickthroughRate',
  'offerViews',
  'cost',
  'revenue',
  'returnOnInvestment',
  'profitAndLoss',
] as const

const WIDGET_API_METRICS = metricsForColumnIds(WIDGET_METRIC_ORDER) ?? undefined

const DASHBOARD_SLOW_QUERY_MS = 1000

async function timeDashboardQuery<T>(label: string, query: () => Promise<T>): Promise<T> {
  const start = performance.now()
  try {
    return await query()
  } finally {
    const durationMs = Math.round(performance.now() - start)
    if (durationMs >= DASHBOARD_SLOW_QUERY_MS) {
      console.debug(`[dashboard] ${label} query took ${durationMs}ms`)
    }
  }
}

export function useLoadDashboard() {
  return useMutation({
    mutationFn: (elements: string[]) =>
      api.post<DashboardData>('/ui/dashboard/load/', { elements }),
  })
}

export function useDashboardSummaryQuery(
  dateFrom: Date,
  dateTo: Date,
  timezone: string,
  enabled = true,
) {
  const request = useMemo(
    () => buildDashboardSummaryRequest(dateFrom, dateTo, timezone),
    [dateFrom, dateTo, timezone],
  )

  return useQuery({
    queryKey: queryKeys.dashboard.summary(request),
    queryFn: ({ signal }) =>
      timeDashboardQuery('summary', () => fetchAllFlatDrilldownRows(request, { signal })),
    enabled,
    placeholderData: (previousData) => previousData,
  })
}

export function buildDashboardTopTableRequest(options: {
  timeRange: ApiDateTimeRange
  timezone: string
  groupBy: string
  pageIndex: number
  pageSize: number
  sorting: SortingState
  reportColumns: Report['columns'] | null | undefined
}): DrilldownRequest {
  const sortParam = drilldownSortParamFromReport(options.sorting, options.reportColumns ?? null)
  return {
    timeRange: options.timeRange,
    timeZone: { name: resolveReportingTimezone(options.timezone) },
    groupings: [{ groupBy: options.groupBy, whitelistFilters: [], blacklistFilters: [] }],
    paging: {
      start: options.pageIndex * options.pageSize,
      length: options.pageSize,
    },
    sorting:
      sortParam ?? { sortingColumns: [{ columnName: 'Entrances', order: 'desc' }] },
    options: { viewType: 'flat' },
    ...(WIDGET_API_METRICS ? { metrics: WIDGET_API_METRICS } : {}),
  }
}

export function useDashboardTopTableQuery(
  request: DrilldownRequest | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: request && enabled ? queryKeys.dashboard.topTable(request) : ['dashboard', 'topTable', 'disabled'],
    queryFn: ({ signal }) =>
      timeDashboardQuery(
        request?.groupings?.[0]?.groupBy ?? 'top table',
        () => api.postDrilldown<Report>(request!, undefined, signal),
      ),
    enabled: Boolean(request) && enabled,
    placeholderData: (previousData) => previousData,
  })
}
