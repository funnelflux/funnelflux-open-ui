import type { ColumnDef, CellContext } from '@tanstack/react-table'
import type { ReactNode } from 'react'
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
}

interface NameColumnOpts<T> extends ColumnOpts {
  actions?: (row: T) => ReactNode
  cellContent?: (row: T) => ReactNode
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
    meta: { numeric: true },
  }
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
    meta: { flex: 1 },
    cell: (info) => {
      const row = info.row.original
      const content = opts?.cellContent ? opts.cellContent(row) : (
        <span className="truncate">{row.name}</span>
      )
      if (opts?.actions) {
        return (
          <div style={{ position: 'relative', overflow: 'visible', display: 'flex', alignItems: 'center', width: '100%' }}>
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
    cell: (info) => (
      <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>{String(info.getValue())}</span>
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
    cell: (info) => (
      <div className="flex items-center justify-end w-full">
        {renderActions(info.row.original)}
      </div>
    ),
  }
}

// ---------- Selection checkbox column ----------

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
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="dt-checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  }
}
