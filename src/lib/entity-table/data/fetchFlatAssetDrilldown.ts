import type { DrilldownRequest } from '@/types/stats'
import type { Report } from '@/types/stats'
import { fetchAllFlatDrilldownRows, type FetchAllFlatDrilldownOptions } from '@/api/drilldown'
import { buildFlatAssetDrilldownRequest } from '@/lib/entity-table/data/request'
import type { EntityGridDrilldownParams } from '@/lib/entity-table/types'

/**
 * Full flat drilldown fetch for standard entity grids (landers, offers, traffic sources, offer sources).
 */
export async function fetchFlatAssetDrilldownReport(
  params: EntityGridDrilldownParams,
  options?: Pick<FetchAllFlatDrilldownOptions, 'isStale' | 'onFirstPage'>,
): Promise<Report> {
  const request: DrilldownRequest = buildFlatAssetDrilldownRequest(params)
  return fetchAllFlatDrilldownRows(request, options)
}
