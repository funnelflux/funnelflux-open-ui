import { buildColumnFiltersParam, type ColumnFilterValue } from '@/lib/drilldownColumnFilters'
import type { DrilldownRequest, Report } from '@/types/stats'

export function withReportColumnFilters(
  request: DrilldownRequest,
  reportColumns: Report['columns'] | undefined,
  filters: Record<string, ColumnFilterValue>,
): DrilldownRequest {
  const columnFilters = buildColumnFiltersParam(filters, reportColumns)
  return {
    ...request,
    ...(columnFilters ? { columnFilters } : { columnFilters: undefined }),
  }
}
