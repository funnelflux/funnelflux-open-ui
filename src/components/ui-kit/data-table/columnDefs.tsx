import type { ColumnDef, CellContext } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Pencil, Copy, Trash2, Archive, ArchiveRestore, Plus, Workflow, RotateCcw, UserCheck, UserX } from 'lucide-react'
import { Tooltip } from '../Tooltip'
import { Button } from '../Button'
import type { ReportCell } from '@/types/stats'
import {
  getColumnMeta,
  ENTITY_ID_COLUMN_META,
  type MetricScope,
} from './columnRegistry'

export type { ColumnGroupDef, ColumnMeta, MetricScope } from './columnRegistry'
export {
  ALL_COLUMN_GROUPS,
  getColumnMeta,
  getDefaultVisibleIds,
  ENTITY_ID_COLUMN_META,
  COLUMN_CHOOSER_OTHER_GROUP,
  buildChooserGroupsForPage,
  filterColumnGroupsByScope,
} from './columnRegistry'

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

export interface BuildColumnsFromReportOptions {
  /** Omit metrics scoped to lander (Offers / Offer Sources) or offer (Landers) */
  hideScopes?: Set<MetricScope>
}

/**
 * Build TanStack column defs for every metric column returned by the API.
 * Skips the first column (index 0) which is the grouping/name column.
 * Columns that match the registry get proper sizing/colorize; unknown columns
 * get a generic stat column with the API name as header.
 * Cell indices always match the API row `cells[i]` even when columns are filtered out.
 */
export function buildColumnsFromReport<T extends HasCells>(
  apiColumns: { name: string; type?: string }[],
  options?: BuildColumnsFromReportOptions,
): ColumnDef<T, unknown>[] {
  const cols: ColumnDef<T, unknown>[] = []
  const hideScopes = options?.hideScopes
  for (let i = 1; i < apiColumns.length; i++) {
    const apiCol = apiColumns[i]
    const registryId = resolveApiColumnId(apiCol.name)
    const meta = registryId ? getColumnMeta(registryId) : undefined
    if (hideScopes?.size && meta?.scope && hideScopes.has(meta.scope)) {
      continue
    }

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
    header: opts?.headerName ?? ENTITY_ID_COLUMN_META.abbr,
    accessorFn: (row) => row.id,
    size: opts?.size ?? ENTITY_ID_COLUMN_META.size,
    minSize: ENTITY_ID_COLUMN_META.minSize,
    enableSorting: false,
    meta: { ...(opts?.align ? { align: opts.align } : {}) },
    cell: (info) => {
      const row = info.row.original as HasName
      if (row.id === '__totals__') return null
      return (
        <span className="dt-cell-text" style={{ color: 'var(--muted-fg)', fontSize: '12px' }}>{String(info.getValue())}</span>
      )
    },
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
  return actionBtnColumn('btn_move', Workflow, 'Move funnel to another campaign', onClick, opts)
}

/** One column: Add Funnel (campaign rows) and Move (funnel rows). */
export function addFunnelOrMoveColumn<T>(
  onAddFunnel: (row: T) => void,
  onMove: (row: T) => void,
  opts: { hidden?: (row: T) => boolean; showAdd: (row: T) => boolean; showMove: (row: T) => boolean },
): ColumnDef<T, unknown> {
  return {
    id: 'btn_add_or_move_funnel',
    header: '',
    size: ACTION_COL_SIZE * 2,
    minSize: ACTION_COL_SIZE * 2,
    maxSize: ACTION_COL_SIZE * 2,
    enableSorting: false,
    enableResizing: false,
    meta: { actionBtn: true },
    cell: (info) => {
      const row = info.row.original
      if (opts.hidden?.(row)) return null
      return (
        <div className="flex items-center justify-center gap-0.5 w-full">
          {opts.showAdd(row) ? (
            <Tooltip title="Add Funnel">
              <Button
                type="text"
                size="small"
                className="dt-action-btn"
                onClick={(e) => { e.stopPropagation(); onAddFunnel(row) }}
                icon={<Plus className="h-3.5 w-3.5" />}
              />
            </Tooltip>
          ) : null}
          {opts.showMove(row) ? (
            <Tooltip title="Move funnel to another campaign">
              <Button
                type="text"
                size="small"
                className="dt-action-btn"
                onClick={(e) => { e.stopPropagation(); onMove(row) }}
                icon={<Workflow className="h-3.5 w-3.5" />}
              />
            </Tooltip>
          ) : null}
        </div>
      )
    },
  }
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
    size: 40,
    minSize: 40,
    maxSize: 40,
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
