import type React from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import type { ReactNode } from 'react'
import type { ReportCell } from '@/types/stats'

/** Extract raw numeric value from a ReportCell */
export function cellRaw(cell?: ReportCell): number {
  if (!cell) return 0
  return typeof cell.raw === 'number' ? cell.raw : Number(cell.raw) || 0
}

/** Extract formatted string from a ReportCell */
export function cellFmt(cell?: ReportCell): string {
  return cell?.formatted ?? ''
}

interface ColumnOpts {
  headerName?: string
  width?: number
  minWidth?: number
  flex?: number
}

interface NameColumnOpts extends ColumnOpts {
  actions?: (params: ICellRendererParams) => ReactNode
}

/** Entity name column — left-aligned, with optional hover actions overlay */
export function nameColumn(opts?: NameColumnOpts): ColDef {
  const { actions, ...rest } = opts ?? {}
  const base: ColDef = {
    colId: 'name',
    headerName: rest?.headerName ?? 'Name',
    field: 'name',
    flex: rest?.flex ?? 1,
    minWidth: rest?.minWidth ?? 180,
    ...rest,
  }
  if (actions) {
    base.cellStyle = { position: 'relative', overflow: 'visible' }
    const existingRenderer = base.cellRenderer
    base.cellRenderer = (params: ICellRendererParams) => {
      const nameContent = existingRenderer
        ? (existingRenderer as (p: ICellRendererParams) => ReactNode)(params)
        : params.value
      return (
        <>
          <span className="truncate">{nameContent}</span>
          <div className="name-actions">{actions(params)}</div>
        </>
      )
    }
  }
  return base
}

/** Visits/entrances column — right-aligned number */
export function visitsColumn(cellIndex: number, opts?: ColumnOpts): ColDef {
  return {
    colId: 'visits',
    headerName: opts?.headerName ?? 'Visits',
    type: 'rightAligned',
    width: opts?.width ?? 90,
    valueGetter: (p) => cellRaw(p.data?.cells?.[cellIndex]),
    valueFormatter: (p) => cellFmt(p.data?.cells?.[cellIndex]),
    cellStyle: { fontVariantNumeric: 'tabular-nums' },
  }
}

/** Clicks column — right-aligned number */
export function clicksColumn(cellIndex: number, opts?: ColumnOpts): ColDef {
  return {
    colId: 'clicks',
    headerName: opts?.headerName ?? 'Clicks',
    type: 'rightAligned',
    width: opts?.width ?? 90,
    valueGetter: (p) => cellRaw(p.data?.cells?.[cellIndex]),
    valueFormatter: (p) => cellFmt(p.data?.cells?.[cellIndex]),
    cellStyle: { fontVariantNumeric: 'tabular-nums' },
  }
}

/** CTR column — right-aligned percent */
export function ctrColumn(cellIndex: number, opts?: ColumnOpts): ColDef {
  return {
    colId: 'ctr',
    headerName: opts?.headerName ?? 'CTR',
    type: 'rightAligned',
    width: opts?.width ?? 80,
    valueGetter: (p) => cellRaw(p.data?.cells?.[cellIndex]),
    valueFormatter: (p) => cellFmt(p.data?.cells?.[cellIndex]),
    cellStyle: { fontVariantNumeric: 'tabular-nums' },
  }
}

/** Conversions column — right-aligned number */
export function convColumn(cellIndex: number, opts?: ColumnOpts): ColDef {
  return {
    colId: 'conv',
    headerName: opts?.headerName ?? 'Conv',
    type: 'rightAligned',
    width: opts?.width ?? 80,
    valueGetter: (p) => cellRaw(p.data?.cells?.[cellIndex]),
    valueFormatter: (p) => cellFmt(p.data?.cells?.[cellIndex]),
    cellStyle: { fontVariantNumeric: 'tabular-nums' },
  }
}

/** Revenue column — right-aligned currency */
export function revenueColumn(cellIndex: number, opts?: ColumnOpts): ColDef {
  return {
    colId: 'revenue',
    headerName: opts?.headerName ?? 'Revenue',
    type: 'rightAligned',
    width: opts?.width ?? 100,
    valueGetter: (p) => cellRaw(p.data?.cells?.[cellIndex]),
    valueFormatter: (p) => cellFmt(p.data?.cells?.[cellIndex]),
    cellStyle: { fontVariantNumeric: 'tabular-nums' },
  }
}

/** Cost column — right-aligned currency */
export function costColumn(cellIndex: number, opts?: ColumnOpts): ColDef {
  return {
    colId: 'cost',
    headerName: opts?.headerName ?? 'Cost',
    type: 'rightAligned',
    width: opts?.width ?? 90,
    valueGetter: (p) => cellRaw(p.data?.cells?.[cellIndex]),
    valueFormatter: (p) => cellFmt(p.data?.cells?.[cellIndex]),
    cellStyle: { fontVariantNumeric: 'tabular-nums' },
  }
}

/** Profit/loss column — right-aligned currency with color */
export function plColumn(cellIndex: number, opts?: ColumnOpts): ColDef {
  return {
    colId: 'pl',
    headerName: opts?.headerName ?? 'P/L',
    type: 'rightAligned',
    width: opts?.width ?? 90,
    valueGetter: (p) => cellRaw(p.data?.cells?.[cellIndex]),
    valueFormatter: (p) => cellFmt(p.data?.cells?.[cellIndex]),
    cellStyle: { fontVariantNumeric: 'tabular-nums' },
    cellClassRules: {
      'text-profit': (p) => Number(p.value) > 0,
      'text-loss': (p) => Number(p.value) < 0,
    },
  }
}

/** ROI column — right-aligned percent with color */
export function roiColumn(cellIndex: number, opts?: ColumnOpts): ColDef {
  return {
    colId: 'roi',
    headerName: opts?.headerName ?? 'ROI',
    type: 'rightAligned',
    width: opts?.width ?? 80,
    valueGetter: (p) => cellRaw(p.data?.cells?.[cellIndex]),
    valueFormatter: (p) => cellFmt(p.data?.cells?.[cellIndex]),
    cellStyle: { fontVariantNumeric: 'tabular-nums' },
    cellClassRules: {
      'text-profit': (p) => Number(p.value) > 0,
      'text-loss': (p) => Number(p.value) < 0,
    },
  }
}

/** ID column — muted, hidden by default, pinned left */
export function idColumn(opts?: ColumnOpts): ColDef {
  return {
    colId: 'id',
    headerName: opts?.headerName ?? 'ID',
    field: 'id',
    width: opts?.width ?? 170,
    cellClass: 'text-xs text-muted-foreground',
    pinned: 'left',
    lockPosition: 'left',
    hide: true,
  }
}

/** Actions column — right-aligned, no sort, uses cellRenderer */
export function actionsColumn(cellRenderer: (params: ICellRendererParams) => React.ReactNode, opts?: ColumnOpts): ColDef {
  return {
    colId: 'actions',
    headerName: '',
    width: opts?.width ?? 140,
    sortable: false,
    filter: false,
    resizable: false,
    cellRenderer,
    cellClass: 'flex items-center justify-end',
  }
}
