import type { ColumnDef, CellContext } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/ui-kit/icons'
import { Tooltip } from '@/components/ui-kit/Tooltip'
import { Button } from '@/components/ui-kit/Button'
import type { ReportCell } from '@/types/stats'
import {
  getColumnMeta,
  ENTITY_ID_COLUMN_META,
  type MetricScope,
} from './columnRegistry'
import { resolveApiColumnId } from '@/lib/drilldownMetrics'

export type { ColumnGroupDef, ColumnMeta, MetricScope } from './columnRegistry'
export { resolveApiColumnId }

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

export interface BuildColumnsFromReportOptions {
  /** Omit metrics scoped to lander (Offers / Offer Sources) or offer (Landers) */
  hideScopes?: Set<MetricScope>
}

/**
 * Number of leading dimensions before metrics (flat drilldown uses one cell per grouping level).
 * Typed responses use {@link ReportColumn.type}; legacy rows without any `type` assume a single leading grouping.
 */
export function countLeadingGroupingColumns(apiColumns: { type?: string }[]): number {
  if (apiColumns.length === 0) return 0
  const anyTyped = apiColumns.some((c) => c.type === 'grouping' || c.type === 'metric')
  if (!anyTyped) {
    return 1
  }
  let n = 0
  for (const col of apiColumns) {
    if (col.type === 'grouping') {
      n++
    } else {
      break
    }
  }
  return n
}

/**
 * Build TanStack column defs for every metric column returned by the API.
 * Skips all leading grouping columns (`type: grouping`), then emits stat columns for metrics.
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
  const start = countLeadingGroupingColumns(apiColumns)
  for (let i = start; i < apiColumns.length; i++) {
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
    size: opts?.size ?? 300,
    minSize: opts?.minSize ?? 200,
    maxSize: opts?.maxSize ?? 560,
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

export function idColumn<T extends HasName>(
  opts?: ColumnOpts & { hideIdForRow?: (row: T) => boolean },
): ColumnDef<T, unknown> {
  return {
    id: 'id',
    header: opts?.headerName ?? ENTITY_ID_COLUMN_META.abbr,
    accessorFn: (row) => row.id,
    size: opts?.size ?? ENTITY_ID_COLUMN_META.size,
    minSize: ENTITY_ID_COLUMN_META.minSize,
    enableSorting: false,
    meta: { ...(opts?.align ? { align: opts.align } : {}) },
    cell: (info) => {
      const row = info.row.original as T
      if (opts?.hideIdForRow?.(row)) return null
      if ((row as HasName).id === '__totals__') return null
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
  iconName: IconName,
  tooltip: string,
  onClick: (row: T) => void,
  opts?: { destructive?: boolean; hidden?: (row: T) => boolean },
): ColumnDef<T, unknown> {
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
            aria-label={tooltip}
            className={`dt-action-btn${opts?.destructive ? ' dt-action-btn--destructive' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onClick(row)
            }}
            icon={<Icon name={iconName} size="sm" />}
          />
        </Tooltip>
      )
    },
  }
}

export function editBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_edit', 'pencil', 'Edit', onClick, opts)
}

export function cloneBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_clone', 'copy', 'Clone', onClick, opts)
}

export function deleteBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_delete', 'trash-2', 'Delete', onClick, { destructive: true, ...opts })
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
      const tooltip = archived ? 'Restore' : 'Archive'
      const iconName = archived ? 'archive-restore' : 'archive'
      return (
        <Tooltip title={tooltip}>
          <Button
            type="text"
            size="small"
            aria-label={tooltip}
            className="dt-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(row, !archived)
            }}
            icon={<Icon name={iconName} size="sm" />}
          />
        </Tooltip>
      )
    },
  }
}

export function addFunnelBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_add_funnel', 'plus', 'Add Funnel', onClick, opts)
}

export function moveBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_move', 'workflow', 'Move funnel to another campaign', onClick, opts)
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
                aria-label="Add Funnel"
                className="dt-action-btn"
                onClick={(e) => { e.stopPropagation(); onAddFunnel(row) }}
                icon={<Icon name="plus" size="sm" />}
              />
            </Tooltip>
          ) : null}
          {opts.showMove(row) ? (
            <Tooltip title="Move funnel to another campaign">
              <Button
                type="text"
                size="small"
                aria-label="Move funnel to another campaign"
                className="dt-action-btn"
                onClick={(e) => { e.stopPropagation(); onMove(row) }}
                icon={<Icon name="workflow" size="sm" />}
              />
            </Tooltip>
          ) : null}
        </div>
      )
    },
  }
}

export function resetStatsBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_reset', 'rotate-ccw', 'Reset Stats', onClick, opts)
}

export function enableBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_enable', 'user-check', 'Enable', onClick, opts)
}

export function disableBtnColumn<T>(onClick: (row: T) => void, opts?: { hidden?: (row: T) => boolean }): ColumnDef<T, unknown> {
  return actionBtnColumn('btn_disable', 'user-x', 'Disable', onClick, opts)
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
    header: ({ table }) => {
      const selectableRows = table.getRowModel().rows.filter((row) => row.getCanSelect())
      const selectedCount = selectableRows.filter((row) => row.getIsSelected()).length
      const allSelected = selectableRows.length > 0 && selectedCount === selectableRows.length
      const someSelected = selectedCount > 0 && !allSelected

      return (
        <input
          type="checkbox"
          className="dt-checkbox"
          checked={allSelected}
          disabled={selectableRows.length === 0}
          ref={(el) => { if (el) el.indeterminate = someSelected }}
          onChange={(e) => {
            const checked = e.currentTarget.checked
            table.setRowSelection((prev) => {
              const next = { ...prev }
              for (const row of selectableRows) {
                if (checked) next[row.id] = true
                else delete next[row.id]
              }
              return next
            })
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
    cell: ({ row }) => {
      if (isPinnedTotalsRow(row.original)) return null
      return (
        <input
          type="checkbox"
          className="dt-checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={(e) => row.toggleSelected(e.currentTarget.checked)}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
  }
}
