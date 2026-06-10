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
import type { ColumnFilterValue } from '@/lib/drilldownColumnFilters'

export type { ColumnDef, SortingState, VisibilityState, RowSelectionState, PaginationState, ExpandedState, Row, Table }

export type DataTablePaginationPosition = 'top' | 'bottom' | 'none'

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

  /**
   * Per-column filters (controlled). When `onColumnFilterChange` is set, columns with
   * `meta.numeric` or `meta.textFilterable` show a header filter popover.
   */
  columnFilters?: Record<string, ColumnFilterValue>
  onColumnFilterChange?: (columnId: string, value: ColumnFilterValue | null) => void

  /**
   * Persist sort in `useTableConfigStore` under this key (localStorage).
   * Ignored when `sorting` is controlled (prop provided).
   */
  tableConfigKey?: string
  /** Fallback when uncontrolled and no `tableConfigKey` (default: visits desc). */
  defaultSorting?: SortingState

  /** Pagination (controlled). Set `manualPagination` for server-side paging. */
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
  manualPagination?: boolean
  pageCount?: number
  /**
   * When `manualPagination` is true, total number of data rows across all pages (excluding
   * repeated category headers) for the footer range label and pagination visibility.
   */
  manualPaginationTotalRows?: number
  pageSizeOptions?: number[]

  /** Column visibility (controlled). */
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void

  /** Tree mode: async loader called when a row is expanded. */
  treeMode?: boolean
  getSubRows?: (row: TData) => TData[] | undefined
  onExpandRow?: (row: TData) => Promise<void>
  /**
   * TanStack would hide the expand control on rows that have no sub-rows yet. Return true to keep
   * the chevron visible so `onExpandRow` can lazy load them.
   */
  canLazyExpandRow?: (row: TData) => boolean
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
  /** Height of the table wrapper (e.g. `'100%'` inside a flex card body). */
  height?: string | number
  /** Extra classes on the root `.dt-wrapper` (e.g. `min-h-0 flex-1` with `height="100%"`). */
  className?: string

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

  /** Controlled column order (leaf column ids). Empty = definition order. */
  columnOrder?: string[]
  onColumnOrderChange?: (order: string[]) => void
  /** When true, the tree grouping column (`name`) cannot be dragged. Default true in treeMode. */
  pinTreeGroupingColumn?: boolean

  /**
   * When loading with no rows yet, reserve at least this scroll-inner min-height (px) so the grid
   * does not collapse (reduces scrollbar flicker). Default 240.
   */
  loadingMinBodyHeight?: number
  /** Skeleton row placeholders during initial load when `data` is empty. Default 10. */
  loadingSkeletonRows?: number

  /** Pagination controls position when pagination is enabled. Use `'none'` to hide built-in controls. @default 'bottom' */
  paginationPosition?: DataTablePaginationPosition

  /** Subtle footer hint while additional drilldown pages load in the background. */
  loadingMore?: boolean
}
