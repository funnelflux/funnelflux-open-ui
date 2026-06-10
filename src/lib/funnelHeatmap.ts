import { toApiDateTimeRangeForReporting } from '@/lib/statsDateRange'
import type { ApiTimeZone, DrilldownRequest, Report, ReportRow } from '@/types/stats'

export const FUNNEL_HEATMAP_GROUP_BY = {
  elementFunnel: 'Element: Funnel',
  elementNodeId: 'Element: Node ID',
  elementNodeName: 'Element: Node Name',
} as const

export const FUNNEL_HEATMAP_METRIC = {
  nodeViews: 'Node Views',
  uniqueNodeViews: 'Unique Node Views',
  uniqueLanderClicks: 'Unique Lander Clicks',
  uniqueOfferClicks: 'Unique Offer Clicks',
  conversions: 'Conv.',
  revenue: 'Revenue',
  lifetimeConversions: 'Lifetime Conv.',
  lifetimeRevenue: 'Lifetime Revenue',
} as const

export const FUNNEL_HEATMAP_MODES = [
  {
    value: 'trafficFlow',
    label: 'Traffic Flow Heatmap',
    shortLabel: 'Traffic Flow',
  },
  {
    value: 'directValueByRevenue',
    label: 'Direct Value Heatmap: Sorted by revenue',
    shortLabel: 'Direct Revenue',
  },
  {
    value: 'directValueByConversions',
    label: 'Direct Value Heatmap: Sorted by conversions',
    shortLabel: 'Direct Conversions',
  },
  {
    value: 'directValueByEpv',
    label: 'Direct Value Heatmap: Sorted by earning per view',
    shortLabel: 'Direct EPV',
  },
  {
    value: 'lifetimeValueByRevenue',
    label: 'Lifetime Value Heatmap: Sorted by revenue',
    shortLabel: 'Lifetime Revenue',
  },
  {
    value: 'lifetimeValueByConversions',
    label: 'Lifetime Value Heatmap: Sorted by conversions',
    shortLabel: 'Lifetime Conversions',
  },
  {
    value: 'lifetimeValueByEpv',
    label: 'Lifetime Value Heatmap: Sorted by earning per view',
    shortLabel: 'Lifetime EPV',
  },
] as const

export type FunnelHeatmapMode = (typeof FUNNEL_HEATMAP_MODES)[number]['value']

export interface FunnelHeatmapNodeStats {
  nodeId: string
  nodeName: string
  views: number
  uniqueViews: number
  uniqueLanderClicks: number
  uniqueOfferClicks: number
  flowPercent: number
  directRevenue: number
  directConversions: number
  directEpv: number
  lifetimeRevenue: number
  lifetimeConversions: number
  lifetimeEpv: number
}

export type FunnelHeatmapStatsByNode = Record<string, FunnelHeatmapNodeStats>

export interface FunnelHeatmapDisplayRow {
  label: string
  value: string
}

export interface FunnelHeatmapDisplay {
  heading: string
  intensityValue: number
  intensityMax: number
  rows: FunnelHeatmapDisplayRow[]
}

const NUMBER_FORMAT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const MONEY_FORMAT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const EPV_FORMAT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})
const PERCENT_FORMAT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function emptyGrouping(groupBy: string) {
  return { groupBy, whitelistFilters: [], blacklistFilters: [] }
}

export function buildFunnelHeatmapRequest(args: {
  campaignId?: string
  funnelId: string
  dateFrom: Date
  dateTo: Date
  timeZone: ApiTimeZone
}): DrilldownRequest {
  const { campaignId, funnelId, dateFrom, dateTo, timeZone } = args
  const reportingZone = timeZone.name ?? 'UTC'

  return {
    timeRange: toApiDateTimeRangeForReporting(dateFrom, dateTo, reportingZone),
    timeZone,
    groupings: [
      emptyGrouping(FUNNEL_HEATMAP_GROUP_BY.elementFunnel),
      emptyGrouping(FUNNEL_HEATMAP_GROUP_BY.elementNodeId),
      emptyGrouping(FUNNEL_HEATMAP_GROUP_BY.elementNodeName),
    ],
    // Do not set topLevelFilters here: idFunnelFilter / idCampaignFilter already scope the query.
    // Funnel whitelist in topLevelFilters plus node-level flat groupings was yielding zero rows in CH.
    paging: { start: 0, length: 2000 },
    sorting: {
      sortingColumns: [{ columnName: FUNNEL_HEATMAP_METRIC.nodeViews, order: 'desc' }],
    },
    options: {
      viewType: 'flat',
      idCampaignFilter: campaignId,
      idFunnelFilter: funnelId,
    },
  }
}

function columnIndex(report: Report, name: string): number {
  return report.columns.findIndex((column) => column.name === name)
}

function getCellRaw(row: ReportRow, index: number): unknown {
  if (index < 0) return undefined
  return row.cells[index]?.raw
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0

  const normalized = value.replace(/[$,%\s]/g, '').replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function toCellString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

export function buildNodeHeatmapStatsFromReport(report: Report): FunnelHeatmapStatsByNode {
  const iNodeId = columnIndex(report, FUNNEL_HEATMAP_GROUP_BY.elementNodeId)
  const iNodeName = columnIndex(report, FUNNEL_HEATMAP_GROUP_BY.elementNodeName)
  const iNodeViews = columnIndex(report, FUNNEL_HEATMAP_METRIC.nodeViews)
  const iUniqueNodeViews = columnIndex(report, FUNNEL_HEATMAP_METRIC.uniqueNodeViews)
  const iUniqueLanderClicks = columnIndex(report, FUNNEL_HEATMAP_METRIC.uniqueLanderClicks)
  const iUniqueOfferClicks = columnIndex(report, FUNNEL_HEATMAP_METRIC.uniqueOfferClicks)
  const iConversions = columnIndex(report, FUNNEL_HEATMAP_METRIC.conversions)
  const iRevenue = columnIndex(report, FUNNEL_HEATMAP_METRIC.revenue)
  const iLifetimeConversions = columnIndex(report, FUNNEL_HEATMAP_METRIC.lifetimeConversions)
  const iLifetimeRevenue = columnIndex(report, FUNNEL_HEATMAP_METRIC.lifetimeRevenue)

  if (iNodeId < 0) return {}

  const partialStats = report.rows.reduce<FunnelHeatmapStatsByNode>((acc, row) => {
    const nodeId = toCellString(getCellRaw(row, iNodeId)).trim()
    if (!nodeId) return acc

    const existing = acc[nodeId]
    const views = toFiniteNumber(getCellRaw(row, iNodeViews))
    const directRevenue = toFiniteNumber(getCellRaw(row, iRevenue))
    const lifetimeRevenue = toFiniteNumber(getCellRaw(row, iLifetimeRevenue))

    acc[nodeId] = {
      nodeId,
      nodeName: existing?.nodeName || toCellString(getCellRaw(row, iNodeName)),
      views: (existing?.views ?? 0) + views,
      uniqueViews: (existing?.uniqueViews ?? 0) + toFiniteNumber(getCellRaw(row, iUniqueNodeViews)),
      uniqueLanderClicks:
        (existing?.uniqueLanderClicks ?? 0) + toFiniteNumber(getCellRaw(row, iUniqueLanderClicks)),
      uniqueOfferClicks:
        (existing?.uniqueOfferClicks ?? 0) + toFiniteNumber(getCellRaw(row, iUniqueOfferClicks)),
      flowPercent: 0,
      directRevenue: (existing?.directRevenue ?? 0) + directRevenue,
      directConversions: (existing?.directConversions ?? 0) + toFiniteNumber(getCellRaw(row, iConversions)),
      directEpv: 0,
      lifetimeRevenue: (existing?.lifetimeRevenue ?? 0) + lifetimeRevenue,
      lifetimeConversions:
        (existing?.lifetimeConversions ?? 0) + toFiniteNumber(getCellRaw(row, iLifetimeConversions)),
      lifetimeEpv: 0,
    }

    return acc
  }, {})

  const maxViews = Math.max(0, ...Object.values(partialStats).map((stats) => stats.views))
  const statsByNode: FunnelHeatmapStatsByNode = {}

  for (const [nodeId, stats] of Object.entries(partialStats)) {
    statsByNode[nodeId] = {
      ...stats,
      flowPercent: maxViews > 0 ? (100 * stats.views) / maxViews : 0,
      directEpv: stats.views > 0 ? stats.directRevenue / stats.views : 0,
      lifetimeEpv: stats.views > 0 ? stats.lifetimeRevenue / stats.views : 0,
    }
  }

  return statsByNode
}

export function getFunnelHeatmapIntensityValue(
  stats: FunnelHeatmapNodeStats,
  mode: FunnelHeatmapMode,
): number {
  switch (mode) {
    case 'trafficFlow':
      return stats.views
    case 'directValueByRevenue':
      return stats.directRevenue
    case 'directValueByConversions':
      return stats.directConversions
    case 'directValueByEpv':
      return stats.directEpv
    case 'lifetimeValueByRevenue':
      return stats.lifetimeRevenue
    case 'lifetimeValueByConversions':
      return stats.lifetimeConversions
    case 'lifetimeValueByEpv':
      return stats.lifetimeEpv
  }
}

export function getFunnelHeatmapIntensityMax(
  nodeStats: FunnelHeatmapStatsByNode,
  mode: FunnelHeatmapMode,
): number {
  return Math.max(
    0,
    ...Object.values(nodeStats).map((stats) => getFunnelHeatmapIntensityValue(stats, mode)),
  )
}

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value)
}

function formatMoney(value: number): string {
  return MONEY_FORMAT.format(value)
}

function formatEpv(value: number): string {
  return EPV_FORMAT.format(value)
}

function formatPercent(value: number): string {
  return `${PERCENT_FORMAT.format(value)}%`
}

function uniqueClicksForNodeKind(stats: FunnelHeatmapNodeStats, nodeKind?: string): number | null {
  const normalizedKind = nodeKind?.toLowerCase() ?? ''
  if (normalizedKind.includes('lander')) return stats.uniqueLanderClicks
  if (normalizedKind.includes('offer')) return stats.uniqueOfferClicks
  return null
}

export function getFunnelHeatmapDisplay(args: {
  stats: FunnelHeatmapNodeStats
  mode: FunnelHeatmapMode
  intensityMax: number
  nodeKind?: string
}): FunnelHeatmapDisplay {
  const { stats, mode, intensityMax, nodeKind } = args

  switch (mode) {
    case 'trafficFlow': {
      const rows: FunnelHeatmapDisplayRow[] = [
        { label: 'Views', value: formatNumber(stats.views) },
        { label: 'Unique Views', value: formatNumber(stats.uniqueViews) },
        { label: 'Flow', value: formatPercent(stats.flowPercent) },
      ]
      const uniqueClicks = uniqueClicksForNodeKind(stats, nodeKind)
      if (uniqueClicks !== null) {
        rows.push({ label: 'Unique Clicks', value: formatNumber(uniqueClicks) })
      }
      return {
        heading: 'Traffic Flow',
        intensityValue: stats.views,
        intensityMax,
        rows,
      }
    }
    case 'directValueByRevenue':
    case 'directValueByConversions':
    case 'directValueByEpv':
      return {
        heading: 'Direct Value',
        intensityValue: getFunnelHeatmapIntensityValue(stats, mode),
        intensityMax,
        rows: [
          { label: 'Direct Revenue', value: formatMoney(stats.directRevenue) },
          { label: 'Conversions', value: formatNumber(stats.directConversions) },
          { label: 'EPV', value: formatEpv(stats.directEpv) },
        ],
      }
    case 'lifetimeValueByRevenue':
    case 'lifetimeValueByConversions':
    case 'lifetimeValueByEpv':
      return {
        heading: 'Lifetime Value',
        intensityValue: getFunnelHeatmapIntensityValue(stats, mode),
        intensityMax,
        rows: [
          { label: 'Lifetime Revenue', value: formatMoney(stats.lifetimeRevenue) },
          { label: 'Conversions', value: formatNumber(stats.lifetimeConversions) },
          { label: 'EPV', value: formatEpv(stats.lifetimeEpv) },
        ],
      }
  }
}
