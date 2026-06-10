import type { ArchiveStatus } from '@/components/shared/ArchiveToggle'

/**
 * Flat asset grids load the full entity list plus a flat drilldown report, then merge by id.
 * Used for campaigns, landers, offers, traffic sources, and offer sources (via {@link useEntityGrid}).
 */
export type AssetTableDrilldownMode = 'flatFull'

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
