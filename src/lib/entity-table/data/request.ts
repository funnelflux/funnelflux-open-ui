import type { DrilldownRequest } from '@/types/stats'
import { resolveReportingTimezone } from '@/lib/reportingTimezone'
import { toApiDateTimeRangeForReporting } from '@/lib/statsDateRange'
import type { EntityGridDrilldownParams } from '@/lib/entity-table/types'

/**
 * Flat drilldown body for standard entity grids (list + stats merged by entity id).
 * No paging — {@link fetchAllFlatDrilldownRows} may page internally.
 */
export function buildFlatAssetDrilldownRequest(params: EntityGridDrilldownParams): DrilldownRequest {
  const { dateFrom, dateTo, timezone, groupBy, groupings, metrics, includeMissingAssets, assetStatus } = params
  const requestGroupings = (groupings?.length ? groupings : [groupBy]).map((grouping) => ({
    groupBy: grouping,
    whitelistFilters: [],
    blacklistFilters: [],
  }))
  const reportingTimezone = resolveReportingTimezone(timezone)
  return {
    timeRange: toApiDateTimeRangeForReporting(dateFrom, dateTo, reportingTimezone),
    timeZone: { name: reportingTimezone },
    groupings: requestGroupings,
    options: {
      viewType: 'flat',
      ...(includeMissingAssets ? { includeMissingAssets: true, assetStatus: assetStatus ?? 'active' } : {}),
    },
    responseFormat: 'compact-v1',
    ...(metrics?.length ? { metrics } : {}),
  }
}
