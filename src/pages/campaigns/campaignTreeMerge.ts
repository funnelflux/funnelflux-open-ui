import { aggregateChildCells } from '@/lib/entity-table/data/aggregateChildCells'
import { buildMergedRows, type EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import type { CategorySegment } from '@/lib/entity-table/engine/paginateCategorySegments'
import { sortCategorySegments } from '@/lib/entity-table/engine/sortCategorySegments'
import type { CampaignRow } from '@/pages/campaigns/campaignTreeAdapter'
import type { CampaignTreeStaticData } from '@/pages/campaigns/campaignTreeStatic'
import type { Report, ReportCell, ReportColumn } from '@/types/stats'
import type { SortingState } from '@tanstack/react-table'

function statsByFunnelIdFromReport(report: Report): Record<string, ReportCell[]> {
  const out: Record<string, ReportCell[]> = {}
  for (const reportRow of report.rows ?? []) {
    const cells = reportRow.cells
    if (!cells?.length) continue
    const funnelId = String(cells[0]?.raw ?? '')
    if (!funnelId) continue
    out[funnelId] = cells
  }
  return out
}

export function buildCampaignCategoryHeader(
  row: CampaignRow,
  items: CampaignRow[],
  reportColumns: ReportColumn[],
): CampaignRow {
  const campaignName = row.campaignName ?? row.name
  const groupingCell: ReportCell = { raw: row.campaignId, formatted: campaignName }
  return {
    id: `campaign:${row.campaignId}`,
    name: campaignName,
    cells: aggregateChildCells(items, reportColumns, groupingCell),
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    categoryId: row.campaignId,
    _categoryId: row.campaignId,
    _isCategoryHeader: true,
    isArchived: row.isArchived,
  }
}

/** Group funnel rows by campaign with aggregated metric totals on each header. */
export function buildCampaignSegmentsFromFunnelRows(
  funnelRows: CampaignRow[],
  reportColumns: ReportColumn[],
): CategorySegment<CampaignRow>[] {
  const grouped = new Map<string, CampaignRow[]>()
  for (const row of funnelRows) {
    const items = grouped.get(row.campaignId)
    if (items) {
      items.push(row)
      continue
    }
    grouped.set(row.campaignId, [row])
  }

  return Array.from(grouped.values()).map((items) => {
    const first = items[0]!
    return {
      header: buildCampaignCategoryHeader(first, items, reportColumns),
      items,
    }
  })
}

/**
 * Group funnels under one campaign header each (with child totals), sort funnels within
 * each campaign, then order campaigns by aggregated header metrics.
 */
export function buildSortedCampaignSegments(
  funnelRows: CampaignRow[],
  reportColumns: ReportColumn[],
  sorting: SortingState,
): CategorySegment<CampaignRow>[] {
  const segments = buildCampaignSegmentsFromFunnelRows(funnelRows, reportColumns)
  return sortCategorySegments(segments, reportColumns, sorting)
}

export function filterCampaignFunnelRows(rows: CampaignRow[], searchLower: string): CampaignRow[] {
  if (!searchLower) return rows

  const matchingCampaignIds = new Set<string>()
  for (const row of rows) {
    if ((row.campaignName ?? '').toLowerCase().includes(searchLower)) {
      matchingCampaignIds.add(row.campaignId)
    }
  }

  return rows.filter(
    (row) =>
      matchingCampaignIds.has(row.campaignId)
      || row.name.toLowerCase().includes(searchLower)
      || (row.campaignName ?? '').toLowerCase().includes(searchLower),
  )
}

export function mapMergedRowsToCampaignFunnels(rows: EntityGridRow[]): CampaignRow[] {
  return rows.map((row) => ({
    ...row,
    campaignId: String(row.campaignId ?? ''),
    campaignName: row.campaignName != null ? String(row.campaignName) : undefined,
    funnelId: row.id,
    categoryId: String(row.campaignId ?? ''),
    isArchived: Boolean(row.isArchived),
  }))
}

/**
 * Build flat campaign funnel rows from hierarchy list entities and drilldown stats.
 */
export function buildCampaignFunnelRowsFromGrid(
  staticData: CampaignTreeStaticData,
  report: Report,
): CampaignRow[] {
  const columns = report.columns?.length
    ? report.columns
    : [{ name: 'Element: Funnel', type: 'grouping' as const }]
  const statsByFunnelId = statsByFunnelIdFromReport(report)
  const listEntities = staticData.orderedFunnels.map((funnel) => ({
    id: funnel.id,
    name: funnel.name,
    campaignId: funnel.campaignId,
    campaignName: funnel.campaignName,
    isArchived: funnel.isArchived,
    categoryId: funnel.campaignId,
  }))
  const merged = buildMergedRows(listEntities, statsByFunnelId, columns)
  return mapMergedRowsToCampaignFunnels(merged)
}
