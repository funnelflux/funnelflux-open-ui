import { fetchAllFlatDrilldownRows } from '@/api/drilldown'
import { toApiDateTimeRange } from '@/lib/statsDateRange'
import type { DrilldownRequest, ReportColumn, ReportCell } from '@/types/stats'
import { getErrorMessage } from '@/lib/utils'
import {
  buildCampaignTreeFromMysqlAndFlatFunnelReport,
  type CampaignTreeRow,
  fetchCampaignHierarchyWire,
} from './campaignTreeUtils'

export interface CampaignPageLoadResult {
  columns: ReportColumn[]
  treeData: CampaignTreeRow[]
  totalsCells: ReportCell[] | null
}

/**
 * Loads MySQL campaign→funnel hierarchy and flat funnel-level stats in parallel.
 * Errors are attributed to hierarchy vs stats so operators can tell which request failed.
 */
export async function loadCampaignPageData(params: {
  dateFrom: Date
  dateTo: Date
  timezone: string
  reportMetrics?: string[]
}): Promise<CampaignPageLoadResult> {
  const { dateFrom, dateTo, timezone, reportMetrics } = params

  const drilldownBody: DrilldownRequest = {
    timeRange: toApiDateTimeRange(dateFrom, dateTo),
    timeZone: { name: timezone },
    groupings: [
      { groupBy: 'Element: Funnel', whitelistFilters: [], blacklistFilters: [] },
    ],
    options: { viewType: 'flat' as const },
    ...(reportMetrics?.length ? { metrics: reportMetrics } : {}),
  }

  const [hierarchyOutcome, reportOutcome] = await Promise.allSettled([
    fetchCampaignHierarchyWire(),
    fetchAllFlatDrilldownRows(drilldownBody),
  ])

  if (hierarchyOutcome.status === 'rejected' && reportOutcome.status === 'rejected') {
    const hMsg = getErrorMessage(hierarchyOutcome.reason)
    const sMsg = getErrorMessage(reportOutcome.reason)
    throw new Error(`Campaign hierarchy failed: ${hMsg}. Campaign stats failed: ${sMsg}`)
  }

  if (hierarchyOutcome.status === 'rejected') {
    throw new Error(`Campaign hierarchy failed: ${getErrorMessage(hierarchyOutcome.reason)}`)
  }

  if (reportOutcome.status === 'rejected') {
    throw new Error(`Campaign stats failed: ${getErrorMessage(reportOutcome.reason)}`)
  }

  const hierarchy = hierarchyOutcome.value
  const report = reportOutcome.value

  return {
    columns: report.columns ?? [],
    treeData: buildCampaignTreeFromMysqlAndFlatFunnelReport(
      hierarchy.campaigns ?? [],
      report,
    ),
    totalsCells: report.totals?.cells ?? null,
  }
}
