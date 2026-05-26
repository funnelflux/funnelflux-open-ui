import type { DrilldownRequest } from '@/types/stats'
import type { ArchiveStatus } from '@/components/shared/ArchiveToggle'

/**
 * **Flat asset grid** loads the full entity list plus a flat drilldown report, then merges by id.
 * Used for landers, offers, traffic sources, offer sources (via {@link useEntityGrid}).
 *
 * **Campaign tree** loads hierarchy plus a paged funnel-level drilldown; rows are built in
 * {@link buildCampaignTreeOrderedByReport}.
 */
export type AssetTableDrilldownMode = 'flatFull' | 'campaignTreePaged'

export interface EntityGridDrilldownParams {
  dateFrom: Date
  dateTo: Date
  timezone: string
  groupBy: string
  groupings?: readonly string[]
  /** API metric names; omit for all metrics. */
  metrics?: string[]
  includeMissingAssets?: boolean
  assetStatus?: ArchiveStatus
}

export interface CampaignTreeDrilldownParams extends EntityGridDrilldownParams {
  pageIndex: number
  pageSize: number
  sorting?: DrilldownRequest['sorting']
}
