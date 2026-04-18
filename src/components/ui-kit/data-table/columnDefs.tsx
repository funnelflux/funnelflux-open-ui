import type { ColumnDef, CellContext } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Pencil, Copy, Trash2, Archive, ArchiveRestore, Plus, Workflow, RotateCcw, UserCheck, UserX } from 'lucide-react'
import { Tooltip } from '../Tooltip'
import { Button } from '../Button'
import type { ReportCell } from '@/types/stats'

// ---------- Cell helpers ----------

export function cellRaw(cell?: ReportCell): number {
  if (!cell) return 0
  return typeof cell.raw === 'number' ? cell.raw : Number(cell.raw) || 0
}

export function cellFmt(cell?: ReportCell): string {
  return cell?.formatted ?? ''
}

// ---------- Types ----------

export type ColumnAlign = 'left' | 'center' | 'right'

interface HasCells {
  cells: ReportCell[]
}

interface HasName {
  id: string
  name: string
}

interface ColumnOpts {
  headerName?: string
  size?: number
  minSize?: number
  maxSize?: number
  enableSorting?: boolean
  align?: ColumnAlign
}

interface NameColumnOpts<T> extends ColumnOpts {
  actions?: (row: T) => ReactNode
  cellContent?: (row: T) => ReactNode
}

// ---------- Column group / registry types ----------

export interface ColumnGroupDef {
  groupId: string
  groupLabel: string
  columns: ColumnMeta[]
}

export interface ColumnMeta {
  id: string
  label: string
  abbr: string
  defaultVisible: boolean
  size: number
  minSize: number
  colorize?: boolean
  symbol?: string
  fractionDigits?: number
}

// ---------- Column groups registry ----------

const TRAFFIC_COLUMNS: ColumnMeta[] = [
  { id: 'visits', label: 'Visits', abbr: 'Visits', defaultVisible: true, size: 90, minSize: 75 },
  { id: 'visitors', label: 'Unique Visitors', abbr: 'Visitors', defaultVisible: false, size: 90, minSize: 75 },
  { id: 'uniqueness', label: 'Uniqueness %', abbr: 'Uniq %', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 2 },
  { id: 'costPerVisit', label: 'Cost per Visit', abbr: 'CPVi', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerVisitor', label: 'Cost per Visitor', abbr: 'u|CPV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerUniqueVisitor', label: 'Cost per Unique Visitor', abbr: 'u|CPV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerVisit', label: 'Revenue per Visit', abbr: 'RPVi', defaultVisible: true, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerVisitor', label: 'Revenue per Visitor', abbr: 'u|RPV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerUniqueVisitor', label: 'Revenue per Unique Visitor', abbr: 'u|RPV', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'conversionPerVisit', label: 'Conversion per Visit', abbr: 'Cv %', defaultVisible: true, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerVisitor', label: 'Conversion per Visitor', abbr: 'u|Cv %', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerUniqueVisitor', label: 'Conversion per Unique Visitor', abbr: 'u|Cv %', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'visitPercentVsTopLevel', label: 'Visit % vs Top Level', abbr: 'top|V%', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 2 },
  { id: 'visitPercentVsParent', label: 'Visit % vs Parent', abbr: 'rel|V%', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 2 },
  { id: 'conversionPercentVsTopLevel', label: 'Conversion % vs Top Level', abbr: 'top|Cv%', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPercentVsParent', label: 'Conversion % vs Parent', abbr: 'rel|Cv%', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerParentVisit', label: 'Conversion per Parent Visit', abbr: 'CvPV', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerParentVisitUnique', label: 'Conversion per Unique Parent Visit', abbr: 'u|CvPV', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
]

const LANDER_COLUMNS: ColumnMeta[] = [
  { id: 'landerViews', label: 'Lander Views', abbr: 'L-Views', defaultVisible: true, size: 90, minSize: 75 },
  { id: 'landerViewsUnique', label: 'Unique Lander Views', abbr: 'u|L-Views', defaultVisible: false, size: 110, minSize: 90 },
  { id: 'landerClicks', label: 'Lander Clicks', abbr: 'L-Clicks', defaultVisible: true, size: 100, minSize: 75 },
  { id: 'landerClicksUnique', label: 'Unique Lander Clicks', abbr: 'u|L-Clicks', defaultVisible: false, size: 110, minSize: 90 },
  { id: 'landerClickthroughRate', label: 'Lander CTR', abbr: 'L-CTR', defaultVisible: true, size: 90, minSize: 75, symbol: '%', fractionDigits: 2 },
  { id: 'landerClickthroughRateUnique', label: 'Unique Lander CTR', abbr: 'u|L-CTR', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 2 },
  { id: 'costPerLanderView', label: 'Cost per Lander View', abbr: 'CPLV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerLanderClick', label: 'Cost per Lander Click', abbr: 'CPLC', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerUniqueLanderView', label: 'Cost per Unique Lander View', abbr: 'u|CPLV', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'costPerUniqueLanderClick', label: 'Cost per Unique Lander Click', abbr: 'u|CPLC', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerLanderView', label: 'Revenue per Lander View', abbr: 'RPLV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerLanderClick', label: 'Revenue per Lander Click', abbr: 'RPLC', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerUniqueLanderView', label: 'Revenue per Unique Lander View', abbr: 'u|RPLV', defaultVisible: false, size: 110, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerUniqueLanderClick', label: 'Revenue per Unique Lander Click', abbr: 'u|RPLC', defaultVisible: false, size: 100, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'conversionPerLanderView', label: 'Conversion per Lander View', abbr: 'CvLV', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerLanderClick', label: 'Conversion per Lander Click', abbr: 'CvLC', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerUniqueLanderView', label: 'Conversion per Unique Lander View', abbr: 'u|CvLV', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerUniqueLanderClick', label: 'Conversion per Unique Lander Click', abbr: 'u|CvLC', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4 },
]

const OFFER_COLUMNS: ColumnMeta[] = [
  { id: 'offerViews', label: 'Offer Views', abbr: 'O-Views', defaultVisible: true, size: 100, minSize: 75 },
  { id: 'offerViewsUnique', label: 'Unique Offer Views', abbr: 'u|O-Views', defaultVisible: false, size: 110, minSize: 90 },
  { id: 'offerClicks', label: 'Offer Clicks', abbr: 'O-Clicks', defaultVisible: false, size: 100, minSize: 75 },
  { id: 'offerClicksUnique', label: 'Unique Offer Clicks', abbr: 'u|O-Clicks', defaultVisible: false, size: 110, minSize: 90 },
  { id: 'offerClickthroughRate', label: 'Offer CTR', abbr: 'O-CTR', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 2 },
  { id: 'offerClickthroughRateUnique', label: 'Unique Offer CTR', abbr: 'u|O-CTR', defaultVisible: false, size: 100, minSize: 90, symbol: '%', fractionDigits: 2 },
  { id: 'costPerOfferView', label: 'Cost per Offer View', abbr: 'CPOV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerOfferClick', label: 'Cost per Offer Click', abbr: 'CPOC', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerUniqueOfferView', label: 'Cost per Unique Offer View', abbr: 'u|CPOV', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'costPerUniqueOfferClick', label: 'Cost per Unique Offer Click', abbr: 'u|CPOC', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerOfferView', label: 'Revenue per Offer View', abbr: 'RPOV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerOfferClick', label: 'Revenue per Offer Click', abbr: 'RPOC', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerUniqueOfferView', label: 'Revenue per Unique Offer View', abbr: 'u|RPOV', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerUniqueOfferClick', label: 'Revenue per Unique Offer Click', abbr: 'u|RPOC', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'conversionPerOfferView', label: 'Conversion per Offer View', abbr: 'CvOV', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerOfferClick', label: 'Conversion per Offer Click', abbr: 'CvOC', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerUniqueOfferView', label: 'Conversion per Unique Offer View', abbr: 'u|CvOV', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerUniqueOfferClick', label: 'Conversion per Unique Offer Click', abbr: 'u|CvOC', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4 },
  { id: 'offerPayout', label: 'Offer Payout', abbr: 'Payout', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 2 },
  { id: 'offerURL', label: 'Offer URL', abbr: 'Offer URL', defaultVisible: false, size: 150, minSize: 75 },
]

const CONVERSION_COLUMNS: ColumnMeta[] = [
  { id: 'conversions', label: 'Conversions', abbr: 'Conv', defaultVisible: true, size: 90, minSize: 75 },
  { id: 'indirectConversions', label: 'Conversions (Indirect)', abbr: 'i|Conv', defaultVisible: false, size: 90, minSize: 80 },
  { id: 'conversionsLifetime', label: 'Conversions (Lifetime)', abbr: 'L|Conv', defaultVisible: false, size: 90, minSize: 90 },
  { id: 'costPerConversion', label: 'Cost per Conversion', abbr: 'CPCv', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerConversion', label: 'Revenue per Conversion', abbr: 'RPCv', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
]

const REVENUE_COST_COLUMNS: ColumnMeta[] = [
  { id: 'revenue', label: 'Revenue', abbr: 'Revenue', defaultVisible: true, size: 100, minSize: 75, symbol: '$', fractionDigits: 2 },
  { id: 'conversionRevenue', label: 'Conversion Revenue', abbr: 'Conv Rev', defaultVisible: false, size: 100, minSize: 75, symbol: '$', fractionDigits: 2 },
  { id: 'revenueIndirect', label: 'Revenue (Indirect)', abbr: 'i|Rev', defaultVisible: false, size: 90, minSize: 80, symbol: '$', fractionDigits: 2 },
  { id: 'revenueLifetime', label: 'Revenue (Lifetime)', abbr: 'L|Rev', defaultVisible: false, size: 90, minSize: 80, symbol: '$', fractionDigits: 2 },
  { id: 'cost', label: 'Traffic Cost', abbr: 'Cost', defaultVisible: true, size: 90, minSize: 75, symbol: '$', fractionDigits: 2 },
  { id: 'profitAndLoss', label: 'Profit & Loss', abbr: 'P/L', defaultVisible: true, size: 100, minSize: 75, colorize: true, symbol: '$', fractionDigits: 2 },
  { id: 'returnOnInvestment', label: 'Return on Investment', abbr: 'ROI', defaultVisible: true, size: 90, minSize: 75, colorize: true, symbol: '%', fractionDigits: 2 },
]

const RESOURCE_COLUMNS: ColumnMeta[] = [
  { id: 'resourceId', label: 'Resource ID', abbr: 'Res ID', defaultVisible: false, size: 120, minSize: 75 },
  { id: 'landerURL', label: 'Lander URL', abbr: 'Lander URL', defaultVisible: false, size: 150, minSize: 75 },
]

function makeCustomEventColumns(): ColumnMeta[] {
  const cols: ColumnMeta[] = []
  for (let i = 1; i <= 10; i++) {
    cols.push(
      { id: `customEvent${i}Count`, label: `Custom Event ${i} Count`, abbr: `CE${i}`, defaultVisible: false, size: 90, minSize: 75 },
      { id: `customEvent${i}Revenue`, label: `Custom Event ${i} Revenue`, abbr: `CE${i} Rev`, defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 2 },
      { id: `customEvent${i}PerVisit`, label: `Custom Event ${i} per Visit`, abbr: `CE${i} %`, defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
      { id: `costPerEvent${i}`, label: `Cost per Event ${i}`, abbr: `CPCE${i}`, defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
      { id: `revenuePerEvent${i}`, label: `Revenue per Event ${i}`, abbr: `RPCE${i}`, defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
    )
  }
  return cols
}

const CUSTOM_EVENT_COLUMNS = makeCustomEventColumns()

export const ALL_COLUMN_GROUPS: ColumnGroupDef[] = [
  { groupId: 'traffic', groupLabel: 'Traffic', columns: TRAFFIC_COLUMNS },
  { groupId: 'lander', groupLabel: 'Lander', columns: LANDER_COLUMNS },
  { groupId: 'offer', groupLabel: 'Offer', columns: OFFER_COLUMNS },
  { groupId: 'conversions', groupLabel: 'Conversions', columns: CONVERSION_COLUMNS },
  { groupId: 'revenueCost', groupLabel: 'Revenue & Cost', columns: REVENUE_COST_COLUMNS },
  { groupId: 'resource', groupLabel: 'Resource Info', columns: RESOURCE_COLUMNS },
  { groupId: 'customEvents', groupLabel: 'Custom Events', columns: CUSTOM_EVENT_COLUMNS },
]

const ALL_COLUMNS_FLAT = ALL_COLUMN_GROUPS.flatMap((g) => g.columns)

export function getColumnMeta(id: string): ColumnMeta | undefined {
  return ALL_COLUMNS_FLAT.find((c) => c.id === id)
}

export function getDefaultVisibleIds(): string[] {
  return ALL_COLUMNS_FLAT.filter((c) => c.defaultVisible).map((c) => c.id)
}

/**
 * Map from API column name (as returned by the drilldown API) to registry column id.
 * The first column (index 0) is always the grouping/name column and is skipped.
 */
const API_NAME_TO_ID: Record<string, string> = {
  'Entrances': 'visits',
  'Visits': 'visits',
  'Visitors': 'visitors',
  'Uniqueness': 'uniqueness',
  'Lander Views': 'landerViews',
  'Lander Views (Unique)': 'landerViewsUnique',
  'Lander Clicks': 'landerClicks',
  'Lander Clicks (Unique)': 'landerClicksUnique',
  'Lander CTR': 'landerClickthroughRate',
  'Lander CTR (Unique)': 'landerClickthroughRateUnique',
  'Offer Views': 'offerViews',
  'Offer Views (Unique)': 'offerViewsUnique',
  'Offer Clicks': 'offerClicks',
  'Offer Clicks (Unique)': 'offerClicksUnique',
  'Offer CTR': 'offerClickthroughRate',
  'Offer CTR (Unique)': 'offerClickthroughRateUnique',
  'Conv.': 'conversions',
  'Conversions': 'conversions',
  'Conv. (Indirect)': 'indirectConversions',
  'Conv. (Lifetime)': 'conversionsLifetime',
  'Revenue': 'revenue',
  'Total Revenue': 'revenue',
  'Conv. Revenue': 'conversionRevenue',
  'Revenue (Indirect)': 'revenueIndirect',
  'Revenue (Lifetime)': 'revenueLifetime',
  'Cost': 'cost',
  'Traffic Cost': 'cost',
  'P/L': 'profitAndLoss',
  'Profit/Loss': 'profitAndLoss',
  'ROI': 'returnOnInvestment',
  'Cv %': 'conversionPerVisit',
  'Cv% (Visit)': 'conversionPerVisit',
  'u|Cv %': 'conversionPerUniqueVisitor',
  'CPVi': 'costPerVisit',
  'Cost/Visit': 'costPerVisit',
  'u|CPV': 'costPerUniqueVisitor',
  'RPVi': 'revenuePerVisit',
  'Rev/Visit': 'revenuePerVisit',
  'u|RPV': 'revenuePerUniqueVisitor',
  'CPCv': 'costPerConversion',
  'Cost/Conv': 'costPerConversion',
  'RPCv': 'revenuePerConversion',
  'Rev/Conv': 'revenuePerConversion',
  'CPLV': 'costPerLanderView',
  'CPLC': 'costPerLanderClick',
  'u|CPLV': 'costPerUniqueLanderView',
  'u|CPLC': 'costPerUniqueLanderClick',
  'RPLV': 'revenuePerLanderView',
  'RPLC': 'revenuePerLanderClick',
  'u|RPLV': 'revenuePerUniqueLanderView',
  'u|RPLC': 'revenuePerUniqueLanderClick',
  'CPOV': 'costPerOfferView',
  'CPOC': 'costPerOfferClick',
  'u|CPOV': 'costPerUniqueOfferView',
  'u|CPOC': 'costPerUniqueOfferClick',
  'RPOV': 'revenuePerOfferView',
  'RPOC': 'revenuePerOfferClick',
  'u|RPOV': 'revenuePerUniqueOfferView',
  'u|RPOC': 'revenuePerUniqueOfferClick',
  'CvOV': 'conversionPerOfferView',
  'CvOC': 'conversionPerOfferClick',
  'u|CvOV': 'conversionPerUniqueOfferView',
  'u|CvOC': 'conversionPerUniqueOfferClick',
  'CvLV': 'conversionPerLanderView',
  'CvLC': 'conversionPerLanderClick',
  'u|CvLV': 'conversionPerUniqueLanderView',
  'u|CvLC': 'conversionPerUniqueLanderClick',
  'top|V%': 'visitPercentVsTopLevel',
  'rel|V%': 'visitPercentVsParent',
  'top|Cv%': 'conversionPercentVsTopLevel',
  'rel|Cv%': 'conversionPercentVsParent',
  'Payout': 'offerPayout',
  'Offer URL': 'offerURL',
  'Lander URL': 'landerURL',
  'Resource ID': 'resourceId',
}

// Custom event name patterns: "CE1", "CE1 Rev", "CE1 %", "CPCE1", "RPCE1"
export function resolveApiColumnId(apiName: string): string | undefined {
  if (API_NAME_TO_ID[apiName]) return API_NAME_TO_ID[apiName]

  let m: RegExpMatchArray | null
  m = apiName.match(/^CE(\d+)$/)
  if (m) return `customEvent${m[1]}Count`
  m = apiName.match(/^CE(\d+)\s*Rev/)
  if (m) return `customEvent${m[1]}Revenue`
  m = apiName.match(/^CE(\d+)\s*%/)
  if (m) return `customEvent${m[1]}PerVisit`
  m = apiName.match(/^CPCE(\d+)/)
  if (m) return `costPerEvent${m[1]}`
  m = apiName.match(/^RPCE(\d+)/)
  if (m) return `revenuePerEvent${m[1]}`

  return undefined
}

/**
 * Build TanStack column defs for every metric column returned by the API.
 * Skips the first column (index 0) which is the grouping/name column.
 * Columns that match the registry get proper sizing/colorize; unknown columns
 * get a generic stat column with the API name as header.
 */
export function buildColumnsFromReport<T extends HasCells>(
  apiColumns: { name: string; type?: string }[],
): ColumnDef<T, unknown>[] {
  const cols: ColumnDef<T, unknown>[] = []
  for (let i = 1; i < apiColumns.length; i++) {
    const apiCol = apiColumns[i]
    const registryId = resolveApiColumnId(apiCol.name)
    const meta = registryId ? getColumnMeta(registryId) : undefined

    cols.push(statColumn<T>(
      registryId ?? `col-${i}`,
      meta?.abbr ?? apiCol.name,
      i,
      {
        size: meta?.size ?? 100,
        minSize: meta?.minSize ?? 70,
        colorize: meta?.colorize,
      },
    ))
  }
  return cols
}

// ---------- Generic stat column builder ----------

function statColumn<T extends HasCells>(
  id: string,
  headerName: string,
  cellIndex: number,
  opts?: ColumnOpts & { colorize?: boolean },
): ColumnDef<T, unknown> {
  return {
    id,
    header: opts?.headerName ?? headerName,
    size: opts?.size ?? 90,
    minSize: opts?.minSize ?? 60,
    maxSize: opts?.maxSize,
    enableSorting: opts?.enableSorting ?? true,
    accessorFn: (row) => cellRaw(row.cells[cellIndex]),
    cell: (info: CellContext<T, unknown>) => {
      const row = info.row.original
      const formatted = cellFmt(row.cells[cellIndex])
      const raw = cellRaw(row.cells[cellIndex])

      if (opts?.colorize) {
        const cls = raw > 0 ? 'dt-cell--profit' : raw < 0 ? 'dt-cell--loss' : ''
        return <span className={cls}>{formatted}</span>
      }
      return formatted
    },
    meta: { numeric: true, ...(opts?.align ? { align: opts.align } : {}) },
  }
}

/**
 * Build a stat column from the registry by id + cellIndex.
 * Falls back to a generic column if the id isn't in the registry.
 */
export function registryStatColumn<T extends HasCells>(
  id: string,
  cellIndex: number,
  overrides?: ColumnOpts,
): ColumnDef<T, unknown> {
  const meta = getColumnMeta(id)
  return statColumn<T>(id, meta?.abbr ?? id, cellIndex, {
    size: meta?.size ?? 90,
    minSize: meta?.minSize ?? 60,
    colorize: meta?.colorize,
    ...overrides,
  })
}

// ---------- Specific column factories ----------

export function nameColumn<T extends HasName>(opts?: NameColumnOpts<T>): ColumnDef<T, unknown> {
  return {
    id: 'name',
    header: opts?.headerName ?? 'Name',
    accessorFn: (row) => row.name,
    size: opts?.size ?? 250,
    minSize: opts?.minSize ?? 180,
    enableSorting: opts?.enableSorting ?? true,
    meta: { flex: 1, ...(opts?.align ? { align: opts.align } : {}) },
    cell: (info) => {
      const row = info.row.original
      const content = opts?.cellContent ? opts.cellContent(row) : (
        <span className="dt-cell-text">{row.name}</span>
      )
      if (opts?.actions) {
        return (
          <div className="dt-cell-name-wrap">
            {content}
            <div className="dt-actions">{opts.actions(row)}</div>
          </div>
        )
      }
      return content
    },
  }
}

export function idColumn<T extends HasName>(opts?: ColumnOpts): ColumnDef<T, unknown> {
  return {
    id: 'id',
    header: opts?.headerName ?? 'ID',
    accessorFn: (row) => row.id,
    size: opts?.size ?? 170,
    minSize: 100,
    enableSorting: false,
    meta: { ...(opts?.align ? { align: opts.align } : {}) },
    cell: (info) => (
      <span className="dt-cell-text" style={{ color: 'var(--muted-fg)', fontSize: '12px' }}>{String(info.getValue())}</span>
    ),
  }
}

export function visitsColumn<T extends HasCells>(cellIndex: number, opts?: ColumnOpts): ColumnDef<T, unknown> {
  return statColumn('visits', 'Visits', cellIndex, { size: 90, ...opts })
}

export function clicksColumn<T extends HasCells>(cellIndex: number, opts?: ColumnOpts): ColumnDef<T, unknown> {
  return statColumn('clicks', 'Clicks', cellIndex, { size: 90, ...opts })
}

export function ctrColumn<T extends HasCells>(cellIndex: number, opts?: ColumnOpts): ColumnDef<T, unknown> {
  return statColumn('ctr', 'CTR', cellIndex, { size: 80, ...opts })
}

export function convColumn<T extends HasCells>(cellIndex: number, opts?: ColumnOpts): ColumnDef<T, unknown> {
  return statColumn('conv', 'Conv', cellIndex, { size: 80, ...opts })
}

export function revenueColumn<T extends HasCells>(cellIndex: number, opts?: ColumnOpts): ColumnDef<T, unknown> {
  return statColumn('revenue', 'Revenue', cellIndex, { size: 100, ...opts })
}

export function costColumn<T extends HasCells>(cellIndex: number, opts?: ColumnOpts): ColumnDef<T, unknown> {
  return statColumn('cost', 'Cost', cellIndex, { size: 90, ...opts })
}

export function plColumn<T extends HasCells>(cellIndex: number, opts?: ColumnOpts): ColumnDef<T, unknown> {
  return statColumn('pl', 'P/L', cellIndex, { size: 90, colorize: true, ...opts })
}

export function roiColumn<T extends HasCells>(cellIndex: number, opts?: ColumnOpts): ColumnDef<T, unknown> {
  return statColumn('roi', 'ROI', cellIndex, { size: 80, colorize: true, ...opts })
}

export function actionsColumn<T>(
  renderActions: (row: T) => ReactNode,
  opts?: ColumnOpts,
): ColumnDef<T, unknown> {
  return {
    id: 'actions',
    header: '',
    size: opts?.size ?? 140,
    enableSorting: false,
    enableResizing: false,
    cell: (info) => (
      <div className="flex items-center justify-end w-full">
        {renderActions(info.row.original)}
      </div>
    ),
  }
}

// ---------- Individual action-button columns ----------

const ACTION_COL_SIZE = 36

function actionBtnColumn<T>(
  id: string,
  icon: LucideIcon,
  tooltip: string,
  onClick: (row: T) => void,
  opts?: { destructive?: boolean; hidden?: (row: T) => boolean },
): ColumnDef<T, unknown> {
  const Icon = icon
  return {
    id,
    header: '',
    size: ACTION_COL_SIZE,
    minSize: ACTION_COL_SIZE,
    maxSize: ACTION_COL_SIZE,
    enableSorting: false,
    enableResizing: false,
    meta: { actionBtn: true },
    cell: (info) => {
      const row = info.row.original
      if (opts?.hidden?.(row)) return null
      return (
        <Tooltip title={tooltip}>
          <Button
            type="text"
            size="small"
            className={`dt-action-btn${opts?.destructive ? ' dt-action-btn--destructive' : ''}`}
            onClick={(e) => { e.stopPropagation(); onClick(row) }}
            icon={<Icon className="h-3.5 w-3.5" />}
          />
        </Tooltip>
      )
    },
  }
}

export function editBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_edit', Pencil, 'Edit', onClick, opts)
}

export function cloneBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_clone', Copy, 'Clone', onClick, opts)
}

export function deleteBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_delete', Trash2, 'Delete', onClick, { destructive: true, ...opts })
}

/**
 * Archive or restore per row. When `isArchived` is true for a row, shows restore icon and calls `onToggle(row, false)`.
 */
export function archiveBtnColumn<T>(
  onToggle: (row: T, archive: boolean) => void,
  opts?: {
    hidden?: (row: T) => boolean
    /** Return true when the entity is archived (shows restore and unarchives on click). */
    isArchived?: (row: T) => boolean
  },
): ColumnDef<T, unknown> {
  return {
    id: 'btn_archive',
    header: '',
    size: ACTION_COL_SIZE,
    minSize: ACTION_COL_SIZE,
    maxSize: ACTION_COL_SIZE,
    enableSorting: false,
    enableResizing: false,
    meta: { actionBtn: true },
    cell: (info) => {
      const row = info.row.original
      if (opts?.hidden?.(row)) return null
      const archived = opts?.isArchived?.(row) ?? false
      const Icon = archived ? ArchiveRestore : Archive
      const tooltip = archived ? 'Restore' : 'Archive'
      return (
        <Tooltip title={tooltip}>
          <Button
            type="text"
            size="small"
            className="dt-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(row, !archived)
            }}
            icon={<Icon className="h-3.5 w-3.5" />}
          />
        </Tooltip>
      )
    },
  }
}

export function addFunnelBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_add_funnel', Plus, 'Add Funnel', onClick, opts)
}

export function moveBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_move', Workflow, 'Move', onClick, opts)
}

export function resetStatsBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_reset', RotateCcw, 'Reset Stats', onClick, opts)
}

export function enableBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_enable', UserCheck, 'Enable', onClick, opts)
}

export function disableBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_disable', UserX, 'Disable', onClick, opts)
}

// ---------- Selection checkbox column ----------

function isPinnedTotalsRow(row: unknown): boolean {
  const r = row as { id?: string; _id?: string }
  return r.id === '__totals__' || r._id === 'totals'
}

export function selectionColumn<T>(): ColumnDef<T, unknown> {
  return {
    id: 'select',
    size: 48,
    minSize: 48,
    maxSize: 48,
    enableSorting: false,
    enableResizing: false,
    header: ({ table }) => (
      <input
        type="checkbox"
        className="dt-checkbox"
        checked={table.getIsAllPageRowsSelected()}
        ref={(el) => { if (el) el.indeterminate = table.getIsSomePageRowsSelected() }}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => {
      if (isPinnedTotalsRow(row.original)) return null
      return (
        <input
          type="checkbox"
          className="dt-checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
  }
}
