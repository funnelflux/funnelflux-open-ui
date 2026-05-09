import type { Report, ReportCell } from '@/types/stats'
import { api } from '@/api/client'
import {
  cellRaw,
  getColumnMeta,
  resolveApiColumnId,
} from '@/components/ui-kit/data-table'
import type { ColumnMeta } from '@/components/ui-kit/data-table'

export interface CampaignHierarchyItem {
  id: string
  name: string
}

export interface CampaignHierarchyCampaign extends CampaignHierarchyItem {
  funnels: CampaignHierarchyItem[]
}

export interface CampaignHierarchyResponse {
  campaigns: CampaignHierarchyCampaign[]
}

export interface CampaignTreeRow {
  id: string
  name: string
  cells: ReportCell[]
  kind: 'campaign' | 'funnel'
  campaignId: string
  funnelId?: string
  _children?: CampaignTreeRow[]
}

/** Rates / per-unit metrics must not be naively summed for parent campaign rows. */
function shouldSumRolledUpMetric(regId: string | undefined): boolean {
  if (!regId) return true
  if (regId.includes('Per')) return false
  if (regId.includes('Rate')) return false
  if (regId.includes('Percent')) return false
  if (regId === 'returnOnInvestment') return false
  if (regId === 'uniqueness') return false
  return true
}

function formatRolledUpMetric(sum: number, meta: ColumnMeta | undefined): string {
  if (!Number.isFinite(sum)) return '—'
  if (meta?.symbol === '$') {
    return `$${sum.toFixed(meta.fractionDigits ?? 2)}`
  }
  if (meta?.fractionDigits !== undefined) {
    return sum.toFixed(meta.fractionDigits)
  }
  if (Number.isInteger(sum)) return String(sum)
  return sum.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

/**
 * Build grouping + metric cells for a campaign row from child funnel rows.
 * Sums additive metrics only; rates / per-visit figures show an em dash.
 */
export function buildCampaignRollupCells(
  campaignId: string,
  campaignName: string,
  childCellsList: ReportCell[][],
  apiColumns: { name: string; type?: string }[],
): ReportCell[] {
  const colCount = apiColumns.length
  const out: ReportCell[] = []
  for (let i = 0; i < colCount; i++) {
    if (i === 0) {
      out.push({ raw: campaignId, formatted: campaignName })
      continue
    }
    const apiCol = apiColumns[i]
    if (apiCol.type === 'grouping') {
      out.push({ raw: '', formatted: '' })
      continue
    }
    if (childCellsList.length === 0) {
      out.push({ raw: 0, formatted: '—' })
      continue
    }
    const regId = resolveApiColumnId(apiCol.name)
    if (!shouldSumRolledUpMetric(regId)) {
      out.push({ raw: '', formatted: '—' })
      continue
    }
    let sum = 0
    for (const cells of childCellsList) {
      sum += cellRaw(cells[i])
    }
    const meta = regId ? getColumnMeta(regId) : undefined
    out.push({ raw: sum, formatted: formatRolledUpMetric(sum, meta) })
  }
  return out
}

function emptyFunnelCells(funnelId: string, funnelName: string, columnCount: number): ReportCell[] {
  const cells: ReportCell[] = []
  for (let i = 0; i < columnCount; i++) {
    if (i === 0) {
      cells.push({ raw: funnelId, formatted: funnelName })
    } else {
      cells.push({ raw: 0, formatted: '0' })
    }
  }
  return cells
}

/**
 * Operational campaigns table: MySQL defines parent→child structure; drilldown
 * supplies flat per-funnel metrics (FunnelID is stable after a move).
 */
export function buildCampaignTreeFromMysqlAndFlatFunnelReport(
  hierarchy: CampaignHierarchyCampaign[],
  report: Report,
): CampaignTreeRow[] {
  const columns = report.columns ?? []
  const colCount = columns.length
  const funnelRowById = new Map<string, ReportCell[]>()

  for (const row of report.rows ?? []) {
    const cells = row.cells
    if (!cells?.length) continue
    const id = String(cells[0]?.raw ?? '')
    if (id) funnelRowById.set(id, cells)
  }

  const out: CampaignTreeRow[] = []

  for (const campaign of hierarchy) {
    const campaignIdStr = String(campaign.id)
    const childRows: CampaignTreeRow[] = []

    for (const funnel of campaign.funnels ?? []) {
      const fid = String(funnel.id)
      const cells = funnelRowById.get(fid) ?? emptyFunnelCells(fid, funnel.name, colCount)
      const displayName = cells[0]?.formatted ?? funnel.name
      childRows.push({
        id: `funnel-${fid}`,
        name: displayName,
        cells,
        kind: 'funnel',
        campaignId: campaignIdStr,
        funnelId: fid,
      })
    }

    const childCellsList = childRows.map((r) => r.cells)
    const campaignCells = buildCampaignRollupCells(
      campaignIdStr,
      campaign.name,
      childCellsList,
      columns,
    )

    out.push({
      id: `campaign-${campaignIdStr}`,
      name: campaign.name,
      cells: campaignCells,
      kind: 'campaign',
      campaignId: campaignIdStr,
      _children: childRows,
    })
  }

  return out
}

/**
 * Load MySQL campaign→funnel tree; GET first, POST fallback (session route variants).
 */
export async function fetchCampaignHierarchyWire(): Promise<CampaignHierarchyResponse> {
  let raw: CampaignHierarchyResponse
  try {
    raw = await api.get<CampaignHierarchyResponse>('/ui/campaigns/hierarchy/')
  } catch {
    raw = await api.post<CampaignHierarchyResponse>('/ui/campaigns/hierarchy/', undefined)
  }
  const campaigns = Array.isArray(raw?.campaigns) ? raw.campaigns : []
  return { campaigns }
}
