import type { AgGridReactProps } from 'ag-grid-react'

export type DataGridProps<TData = unknown> = AgGridReactProps<TData> & {
  /** Classes for the outer `.ff-data-grid.ag-theme-quartz` wrapper (layout, min-height, etc.). */
  className?: string
}

/** Prefer importing from `@/components/ui/data-grid` instead of `ag-grid-community` in app code. */
export type {
  ColDef,
  FirstDataRenderedEvent,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowDataUpdatedEvent,
} from 'ag-grid-community'
