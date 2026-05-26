import type { DrilldownRequest } from '@/types/stats'
import { toApiDateTimeRange } from '@/lib/statsDateRange'
import type { CampaignTreeDrilldownParams, EntityGridDrilldownParams } from '@/lib/entity-table/types'
import { clampAssetPageSize } from '@/lib/entity-table/data/pagination'

const FUNNEL_GROUPING = 'Element: Funnel'

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
  return {
    timeRange: toApiDateTimeRange(dateFrom, dateTo),
    timeZone: { name: timezone },
    groupings: requestGroupings,
    options: {
      viewType: 'flat',
      ...(includeMissingAssets ? { includeMissingAssets: true, assetStatus: assetStatus ?? 'active' } : {}),
    },
    responseFormat: 'compact-v1',
    ...(metrics?.length ? { metrics } : {}),
  }
}

/**
 * Paged funnel drilldown for the Campaigns tree (grouping per-funnel stats).
 */
export function buildCampaignTreeDrilldownRequest(params: CampaignTreeDrilldownParams): DrilldownRequest {
  const { dateFrom, dateTo, timezone, metrics, pageIndex, pageSize, sorting } = params
  const length = clampAssetPageSize(pageSize)
  return {
    timeRange: toApiDateTimeRange(dateFrom, dateTo),
    timeZone: { name: timezone },
    groupings: [{ groupBy: FUNNEL_GROUPING, whitelistFilters: [], blacklistFilters: [] }],
    options: { viewType: 'flat' },
    responseFormat: 'compact-v1',
    paging: {
      start: pageIndex * length,
      length,
    },
    ...(sorting ? { sorting } : {}),
    ...(metrics?.length ? { metrics } : {}),
  }
}
