import { api } from '@/api/client'
import { fetchFlatDrilldownPage } from '@/api/drilldown'
import { buildCampaignTreeDrilldownRequest } from '@/lib/entity-table/data/request'
import type { AssetTableEngineLoadArgs, AssetTableEnginePageData } from '@/lib/entity-table/engine/useServerPagedData'
import type { Campaign } from '@/types/entities'
import type { DrilldownRequest, ReportCell } from '@/types/stats'

interface CampaignHierarchyCampaign {
  id: string
  name: string
  funnels: Array<{ id: string; name: string }>
}

interface CampaignHierarchyResponse {
  campaigns: CampaignHierarchyCampaign[]
}

export interface CampaignRow {
  id: string
  name: string
  cells: ReportCell[]
  campaignId: string
  campaignName?: string
  funnelId?: string
  categoryId?: string
  _isCategoryHeader?: boolean
  _categoryId?: string
  isArchived?: boolean
  [key: string]: unknown
}

export type CampaignArchiveTab = 'active' | 'archived' | 'all'

export function filterCampaignStripRows(rows: CampaignRow[], searchLower: string): CampaignRow[] {
  if (!searchLower) return rows
  const out: CampaignRow[] = []
  let currentHeader: CampaignRow | null = null
  let headerAdded = false
  let includeGroupByHeader = false
  for (const row of rows) {
    if (row._isCategoryHeader) {
      currentHeader = row
      headerAdded = false
      includeGroupByHeader = row.name.toLowerCase().includes(searchLower)
      if (includeGroupByHeader) {
        out.push(row)
        headerAdded = true
      }
      continue
    }
    if (includeGroupByHeader || row.name.toLowerCase().includes(searchLower)) {
      if (currentHeader && !headerAdded) {
        out.push(currentHeader)
        headerAdded = true
      }
      out.push(row)
    }
  }
  return out
}

export function passesArchiveTab(row: CampaignRow, tab: CampaignArchiveTab): boolean {
  if (tab === 'all') return true
  const archived = Boolean(row.isArchived)
  if (tab === 'active') return !archived
  return archived
}

export function finalizeCampaignStrip(rows: CampaignRow[]): CampaignRow[] {
  const out: CampaignRow[] = []
  let i = 0
  while (i < rows.length) {
    const row = rows[i]!
    if (!row._isCategoryHeader) {
      out.push(row)
      i++
      continue
    }
    const header = row
    i++
    const funnels: CampaignRow[] = []
    while (i < rows.length) {
      const next = rows[i]!
      if (next._isCategoryHeader) break
      funnels.push(next)
      i++
    }
    if (funnels.length > 0) out.push(header, ...funnels)
  }
  return out
}

export function filterRowsForArchiveTab(rows: CampaignRow[], tab: CampaignArchiveTab): CampaignRow[] {
  return finalizeCampaignStrip(rows.filter((row) => passesArchiveTab(row, tab)))
}

function sliceCampaignBlock(rows: CampaignRow[], campaignId: string): CampaignRow[] {
  const start = rows.findIndex((row) => row._isCategoryHeader && row.campaignId === campaignId)
  if (start === -1) return []
  const slice: CampaignRow[] = []
  let i = start
  while (i < rows.length) {
    const row = rows[i]!
    if (i !== start && row._isCategoryHeader) break
    slice.push(row)
    i++
  }
  return slice
}

export function findTemplateFunnelRow(rows: CampaignRow[], campaignId: string): CampaignRow | undefined {
  const fromBlock = sliceCampaignBlock(rows, campaignId).find((row) => row.funnelId && !row._isCategoryHeader)
  return fromBlock ?? rows.find((row) => row.funnelId && !row._isCategoryHeader)
}

export function cellsForNewFunnel(templateCells: ReportCell[], funnelId: string, funnelName: string): ReportCell[] {
  if (!templateCells?.length) return [{ raw: funnelId, formatted: funnelName }]
  return templateCells.map((_cell, index) =>
    index === 0 ? { raw: funnelId, formatted: funnelName } : { raw: '0', formatted: '0' },
  )
}

export function createCampaignTreeLoadPageData(archiveStatus: CampaignArchiveTab) {
  return async (args: AssetTableEngineLoadArgs): Promise<AssetTableEnginePageData<CampaignRow>> => {
    const drilldownBody: DrilldownRequest = buildCampaignTreeDrilldownRequest({
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      timezone: args.timezone,
      groupBy: 'Element: Funnel',
      pageIndex: args.pageIndex,
      pageSize: args.pageSize,
      ...(args.reportMetrics?.length ? { metrics: args.reportMetrics } : {}),
    })

    const [hierarchy, report, campaignsByStatus] = await Promise.all([
      api.get<CampaignHierarchyResponse>('/ui/campaigns/hierarchy/').catch(async () =>
        api.post<CampaignHierarchyResponse>('/ui/campaigns/hierarchy/', undefined)),
      fetchFlatDrilldownPage(drilldownBody, { pageSize: drilldownBody.paging?.length }),
      api.get<Campaign[]>('/data/campaign/find/byStatus/', { status: archiveStatus }),
    ])

    const campaignArchivedById = new Map<string, boolean>()
    for (const campaign of campaignsByStatus ?? []) {
      campaignArchivedById.set(String(campaign.idCampaign), Boolean(campaign.isArchived))
    }

    const funnelMap = new Map<string, { campaignId: string; campaignName: string; funnelName: string }>()
    for (const campaign of hierarchy.campaigns ?? []) {
      const campaignId = String(campaign.id)
      if (!campaignArchivedById.has(campaignId)) continue
      for (const funnel of campaign.funnels ?? []) {
        funnelMap.set(String(funnel.id), {
          campaignId,
          campaignName: campaign.name,
          funnelName: funnel.name,
        })
      }
    }

    const grouped = new Map<string, { header: CampaignRow; items: CampaignRow[] }>()
    for (const reportRow of report.rows ?? []) {
      const cells = reportRow.cells
      if (!cells?.length) continue
      const funnelId = String(cells[0]?.raw ?? '')
      if (!funnelId) continue
      const meta = funnelMap.get(funnelId)
      if (!meta) continue
      const row: CampaignRow = {
        id: funnelId,
        name: cells[0]?.formatted ?? meta.funnelName,
        cells,
        campaignId: meta.campaignId,
        campaignName: meta.campaignName,
        funnelId,
        categoryId: meta.campaignId,
        isArchived: campaignArchivedById.get(meta.campaignId) ?? false,
      }
      const existing = grouped.get(meta.campaignId)
      if (existing) {
        existing.items.push(row)
      } else {
        grouped.set(meta.campaignId, {
          header: {
            id: `campaign:${meta.campaignId}`,
            name: meta.campaignName,
            cells: [{ raw: meta.campaignId, formatted: meta.campaignName }],
            campaignId: meta.campaignId,
            campaignName: meta.campaignName,
            categoryId: meta.campaignId,
            _categoryId: meta.campaignId,
            _isCategoryHeader: true,
            isArchived: campaignArchivedById.get(meta.campaignId) ?? false,
          },
          items: [row],
        })
      }
    }

    const rows: CampaignRow[] = []
    for (const segment of grouped.values()) {
      rows.push(segment.header, ...segment.items)
    }

    return {
      rows,
      columns: report.columns ?? [],
      totalsCells: report.totals?.cells ?? null,
      totalRows: report.rowsTotal ?? report.paging?.totalRecords ?? report.rows?.length ?? 0,
    }
  }
}
