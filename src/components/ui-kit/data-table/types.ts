import type {
  ColumnDef,
  SortingState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
  ExpandedState,
  Row,
  Table,
} from '@tanstack/react-table'
import type { ReactNode } from 'react'

export type { ColumnDef, SortingState, VisibilityState, RowSelectionState, PaginationState, ExpandedState, Row, Table }

export interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  loading?: boolean

  getRowId?: (row: TData) => string

  /** Pinned rows rendered below the scrollable body (e.g. totals). */
  pinnedBottomRows?: TData[]

  /** Row selection state (controlled). */
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (selection: RowSelectionState) => void
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)

  /** Sorting (controlled). Set `manualSorting` for server-side sort. */
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  manualSorting?: boolean

  /** Pagination (controlled). Set `manualPagination` for server-side paging. */
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
  manualPagination?: boolean
  pageCount?: number
  pageSizeOptions?: number[]

  /** Column visibility (controlled). */
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void

  /** Tree mode: async loader called when a row is expanded. */
  treeMode?: boolean
  getSubRows?: (row: TData) => TData[] | undefined
  onExpandRow?: (row: TData) => Promise<void>
  expanded?: ExpandedState
  onExpandedChange?: (expanded: ExpandedState) => void

  /** CSS class or function returning class for each row. */
  rowClassName?: string | ((row: TData) => string | undefined)

  /** Virtualization threshold. Rows above this count are virtualized. Default 100. */
  virtualizeThreshold?: number
  /** Fixed row height for virtualization. Default 36. */
  rowHeight?: number
  /** Max height of the scrollable area. Default '100%'. */
  maxHeight?: string | number

  /** Expose the table instance to parent. */
  tableRef?: React.MutableRefObject<Table<TData> | null>

  /** Called when the table instance is ready or after unmount (null). Use for UI that must not read refs during render. */
  onTableInstance?: (table: Table<TData> | null) => void

  /** Empty state message when no rows. */
  emptyMessage?: ReactNode

  /** Disable client-side pagination entirely (shows all rows). */
  noPagination?: boolean

  /** Enable column resizing by dragging header borders. Default true. */
  enableColumnResizing?: boolean

  /** Controlled column sizing state (column id → pixel width). */
  columnSizing?: Record<string, number>
  onColumnSizingChange?: (sizing: Record<string, number>) => void
}
