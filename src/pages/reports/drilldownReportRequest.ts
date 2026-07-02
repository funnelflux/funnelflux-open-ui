import { buildColumnFiltersParam, type ColumnFilterValue } from '@/lib/drilldownColumnFilters'
import type { DrilldownRequest, Report } from '@/types/stats'

export type ReportColumns = Report['columns']

/**
 * Pick the column metadata used to encode header/dimension filters.
 *
 * Header (grouping) filters carry UI ids (`grouping-0`, `name`, metric ids) that only resolve to
 * API column names through {@link buildColumnFiltersParam} once the server has returned a report.
 * During a refetch — or before the very first response that a previously-applied filter is still in
 * state for — `report` can be transiently `undefined`. Falling back to the last-known column shape
 * keeps already-entered filters in the request body instead of silently dropping them on Apply.
 */
export function resolveColumnsForFilters(
  liveColumns: ReportColumns | undefined,
  lastKnownColumns: ReportColumns | undefined | null,
): ReportColumns | undefined {
  if (liveColumns?.length) {
    return liveColumns
  }
  return lastKnownColumns ?? undefined
}

export function withReportColumnFilters(
  request: DrilldownRequest,
  reportColumns: ReportColumns | undefined,
  filters: Record<string, ColumnFilterValue>,
): DrilldownRequest {
  const columnFilters = buildColumnFiltersParam(filters, reportColumns)
  return {
    ...request,
    ...(columnFilters ? { columnFilters } : { columnFilters: undefined }),
  }
}
