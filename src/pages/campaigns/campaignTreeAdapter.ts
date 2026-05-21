import type { QueryClient } from '@tanstack/react-query'
import { fetchFlatDrilldownPage } from '@/api/drilldown'
import { queryKeys } from '@/api/queryKeys'
import { buildCampaignTreeDrilldownRequest } from '@/lib/entity-table/data/request'
import type { AssetTableEngineLoadArgs, AssetTableEnginePageData } from '@/lib/entity-table/engine/useServerPagedData'
import { buildCampaignTreePageData, hierarchyOnlyReport } from '@/pages/campaigns/campaignTreeMerge'
import { fetchCampaignTreeStaticData } from '@/pages/campaigns/campaignTreeStatic'
import type { ReportCell } from '@/types/stats'

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

export function createCampaignTreeLoadPageData(
  archiveStatus: CampaignArchiveTab,
  queryClient: QueryClient,
) {
  return async (args: AssetTableEngineLoadArgs): Promise<AssetTableEnginePageData<CampaignRow>> => {
    const searchLower = args.search?.trim().toLowerCase() ?? ''
    const drilldownParams = {
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      timezone: args.timezone,
      groupBy: 'Element: Funnel' as const,
      ...(args.reportMetrics?.length ? { metrics: args.reportMetrics } : {}),
    }

    const staticData = await queryClient.fetchQuery({
      queryKey: queryKeys.campaignStrip.static(archiveStatus),
      queryFn: () => fetchCampaignTreeStaticData(archiveStatus),
    })

    if (searchLower) {
      return buildCampaignTreePageData(
        staticData,
        hierarchyOnlyReport(args.reportMetrics),
        args,
      )
    }

    const report = await fetchFlatDrilldownPage(
      buildCampaignTreeDrilldownRequest({
        ...drilldownParams,
        pageIndex: args.pageIndex,
        pageSize: args.pageSize,
      }),
      { pageSize: args.pageSize },
    )

    return buildCampaignTreePageData(staticData, report, args)
  }
}
