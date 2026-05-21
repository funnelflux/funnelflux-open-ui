import { buildMergedRows } from '@/lib/entity-table/data/mergedRows'
import type { AssetTableEngineLoadArgs, AssetTableEnginePageData } from '@/lib/entity-table/engine/useServerPagedData'
import type { CampaignRow } from '@/pages/campaigns/campaignTreeAdapter'
import type { CampaignTreeFunnelRef, CampaignTreeStaticData } from '@/pages/campaigns/campaignTreeStatic'
import type { Report, ReportCell } from '@/types/stats'

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

/** Match funnel or parent campaign name (same rules as `filterCampaignStripRows`). */
export function filterOrderedFunnelsBySearch(
  staticData: CampaignTreeStaticData,
  searchLower: string,
): CampaignTreeFunnelRef[] {
  if (!searchLower) return staticData.orderedFunnels

  const matchingCampaignIds = new Set<string>()
  for (const campaign of staticData.campaigns) {
    if (campaign.name.toLowerCase().includes(searchLower)) {
      matchingCampaignIds.add(campaign.id)
    }
  }

  return staticData.orderedFunnels.filter(
    (funnel) =>
      matchingCampaignIds.has(funnel.campaignId)
      || funnel.name.toLowerCase().includes(searchLower)
      || funnel.campaignName.toLowerCase().includes(searchLower),
  )
}

function resolvePageFunnels(
  staticData: CampaignTreeStaticData,
  report: Report,
  pageIndex: number,
  pageSize: number,
): CampaignTreeFunnelRef[] {
  const { orderedFunnels, funnelById } = staticData
  const drilldownRows = report.rows ?? []

  if (drilldownRows.length > 0) {
    const pageFunnels: CampaignTreeFunnelRef[] = []
    for (const reportRow of drilldownRows) {
      const cells = reportRow.cells
      if (!cells?.length) continue
      const funnelId = String(cells[0]?.raw ?? '')
      if (!funnelId) continue
      const meta = funnelById.get(funnelId)
      if (!meta) continue
      const fromHierarchy = orderedFunnels.find((funnel) => funnel.id === funnelId)
      pageFunnels.push({
        id: funnelId,
        name: fromHierarchy?.name ?? String(cells[0]?.formatted ?? funnelId),
        campaignId: meta.campaignId,
        campaignName: meta.campaignName,
        isArchived: meta.isArchived,
      })
    }
    return pageFunnels
  }

  const start = pageIndex * pageSize
  return orderedFunnels.slice(start, start + pageSize)
}

function groupFunnelRowsIntoStrip(funnelRows: CampaignRow[]): CampaignRow[] {
  const grouped = new Map<string, { header: CampaignRow; items: CampaignRow[] }>()
  for (const row of funnelRows) {
    const existing = grouped.get(row.campaignId)
    if (existing) {
      existing.items.push(row)
      continue
    }
    grouped.set(row.campaignId, {
      header: {
        id: `campaign:${row.campaignId}`,
        name: row.campaignName ?? row.name,
        cells: [{ raw: row.campaignId, formatted: row.campaignName ?? row.name }],
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        categoryId: row.campaignId,
        _categoryId: row.campaignId,
        _isCategoryHeader: true,
        isArchived: row.isArchived,
      },
      items: [row],
    })
  }

  const rows: CampaignRow[] = []
  for (const segment of grouped.values()) {
    rows.push(segment.header, ...segment.items)
  }
  return rows
}

function resolveTotalRows(staticData: CampaignTreeStaticData, report: Report): number {
  const fromReport = report.rowsTotal > 0
    ? report.rowsTotal
    : report.paging?.totalRecords
  if (fromReport !== undefined && fromReport > 0) {
    return fromReport
  }
  return staticData.orderedFunnels.length
}

/** No drilldown — hierarchy supplies ids/names; metric columns show zeros. */
export function hierarchyOnlyReport(reportMetrics?: string[]): Report {
  const columns: Report['columns'] = [{ name: 'Element: Funnel', type: 'grouping' }]
  for (const metric of reportMetrics ?? []) {
    columns.push({ name: metric, type: 'metric' })
  }
  return {
    columns,
    rows: [],
    totals: { cells: [] },
    rowsReturned: 0,
    rowsTotal: 0,
  }
}

/**
 * Build one campaigns table page: row identity from hierarchy + byStatus; stats from drilldown.
 */
export function buildCampaignTreePageData(
  staticData: CampaignTreeStaticData,
  report: Report,
  args: Pick<AssetTableEngineLoadArgs, 'pageIndex' | 'pageSize' | 'search'>,
): AssetTableEnginePageData<CampaignRow> {
  const columns = report.columns?.length
    ? report.columns
    : [{ name: 'Element: Funnel', type: 'grouping' as const }]
  const searchLower = args.search?.trim().toLowerCase() ?? ''
  const matchingFunnels = searchLower
    ? filterOrderedFunnelsBySearch(staticData, searchLower)
    : null
  const pageFunnels = matchingFunnels
    ? matchingFunnels.slice(
        args.pageIndex * args.pageSize,
        args.pageIndex * args.pageSize + args.pageSize,
      )
    : resolvePageFunnels(staticData, report, args.pageIndex, args.pageSize)
  const statsByFunnelId = statsByFunnelIdFromReport(report)

  const merged = buildMergedRows(
    pageFunnels.map((funnel) => ({ id: funnel.id, name: funnel.name })),
    statsByFunnelId,
    columns,
  )

  const funnelRows: CampaignRow[] = merged.map((row, index) => {
    const meta = pageFunnels[index]!
    return {
      ...row,
      name: meta.name,
      cells: row.cells.length
        ? [{ ...row.cells[0]!, formatted: meta.name, raw: meta.id }, ...row.cells.slice(1)]
        : [{ raw: meta.id, formatted: meta.name }],
      campaignId: meta.campaignId,
      campaignName: meta.campaignName,
      funnelId: meta.id,
      categoryId: meta.campaignId,
      isArchived: meta.isArchived,
    }
  })

  return {
    rows: groupFunnelRowsIntoStrip(funnelRows),
    columns,
    totalsCells: report.totals?.cells ?? null,
    totalRows: matchingFunnels
      ? matchingFunnels.length
      : resolveTotalRows(staticData, report),
  }
}
