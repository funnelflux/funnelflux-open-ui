import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnResizeMode,
  type Header,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import type { DataTableProps, ColumnDef, SortingState, VisibilityState, RowSelectionState, PaginationState, ExpandedState, Row } from './types'
import './data-table.css'

const DEFAULT_PAGE_SIZES = [25, 50, 100, 200]

export function DataTable<TData>({
  data,
  columns,
  loading = false,
  getRowId,
  pinnedBottomRows,
  rowSelection: controlledSelection,
  onRowSelectionChange,
  enableRowSelection,
  sorting: controlledSorting,
  onSortingChange,
  manualSorting,
  pagination: controlledPagination,
  onPaginationChange,
  manualPagination,
  pageCount,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  columnVisibility: controlledVisibility,
  onColumnVisibilityChange,
  treeMode,
  getSubRows,
  onExpandRow,
  expanded: controlledExpanded,
  onExpandedChange,
  rowClassName,
  virtualizeThreshold = 100,
  rowHeight = 36,
  maxHeight,
  tableRef,
  onTableInstance,
  emptyMessage = 'No data.',
  noPagination,
  enableColumnResizing = true,
}: DataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>({})
  const [internalPagination, setInternalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>({})
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({})
  const [expandingRowId, setExpandingRowId] = useState<string | null>(null)
  const [columnSizing, setColumnSizing] = useState({})

  const sorting = controlledSorting ?? internalSorting
  const selection = controlledSelection ?? internalSelection
  const pagination = controlledPagination ?? internalPagination
  const visibility = controlledVisibility ?? internalVisibility
  const expanded = controlledExpanded ?? internalExpanded

  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      ;(onSortingChange ?? setInternalSorting)(next)
    },
    [sorting, onSortingChange],
  )

  const handleSelectionChange = useCallback(
    (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
      const next = typeof updater === 'function' ? updater(selection) : updater
      ;(onRowSelectionChange ?? setInternalSelection)(next)
    },
    [selection, onRowSelectionChange],
  )

  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      ;(onPaginationChange ?? setInternalPagination)(next)
    },
    [pagination, onPaginationChange],
  )

  const handleVisibilityChange = useCallback(
    (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
      const next = typeof updater === 'function' ? updater(visibility) : updater
      ;(onColumnVisibilityChange ?? setInternalVisibility)(next)
    },
    [visibility, onColumnVisibilityChange],
  )

  const handleExpandedChange = useCallback(
    (updater: ExpandedState | ((old: ExpandedState) => ExpandedState)) => {
      const next = typeof updater === 'function' ? updater(expanded) : updater
      ;(onExpandedChange ?? setInternalExpanded)(next)
    },
    [expanded, onExpandedChange],
  )

  const usePagination = !noPagination && !treeMode

  const columnResizeMode: ColumnResizeMode = 'onChange'

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection: selection,
      pagination,
      columnVisibility: visibility,
      expanded,
      columnSizing,
    },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    onSortingChange: handleSortingChange as never,
    onRowSelectionChange: handleSelectionChange as never,
    onPaginationChange: handlePaginationChange as never,
    onColumnVisibilityChange: handleVisibilityChange as never,
    onExpandedChange: handleExpandedChange as never,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getPaginationRowModel: usePagination && !manualPagination ? getPaginationRowModel() : undefined,
    getExpandedRowModel: treeMode ? getExpandedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    getSubRows: getSubRows as never,
    enableRowSelection: enableRowSelection as never,
    enableColumnResizing,
    columnResizeMode,
    manualSorting,
    manualPagination,
    pageCount,
  })

  const onTableInstanceRef = useRef(onTableInstance)
  onTableInstanceRef.current = onTableInstance
  const tableRefPropRef = useRef(tableRef)
  tableRefPropRef.current = tableRef

  useEffect(() => {
    if (tableRef) tableRef.current = table
    onTableInstance?.(table)
  }, [table, tableRef, onTableInstance])

  useEffect(() => () => {
    const r = tableRefPropRef.current
    if (r) r.current = null
    onTableInstanceRef.current?.(null)
  }, [])

  const { rows: tableRows } = table.getRowModel()

  const shouldVirtualize = tableRows.length > virtualizeThreshold
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 20,
    enabled: shouldVirtualize,
  })

  const handleToggleExpand = useCallback(
    async (row: Row<TData>) => {
      if (onExpandRow && !row.getIsExpanded()) {
        const id = row.id
        setExpandingRowId(id)
        try {
          await onExpandRow(row.original)
        } finally {
          setExpandingRowId(null)
        }
      }
      row.toggleExpanded()
    },
    [onExpandRow],
  )

  const headerGroups = table.getHeaderGroups()
  const visibleColumns = table.getVisibleLeafColumns()

  const totalTableWidth = useMemo(() => {
    return visibleColumns.reduce((sum, col) => {
      const meta = col.columnDef.meta as Record<string, unknown> | undefined
      if (meta?.flex) return sum + (col.columnDef.minSize ?? 150)
      return sum + col.getSize()
    }, 0)
  }, [visibleColumns])

  const getColStyle = useCallback(
    (col: { getSize: () => number; columnDef: { meta?: unknown; minSize?: number; maxSize?: number } }): React.CSSProperties => {
      const meta = col.columnDef.meta as Record<string, unknown> | undefined
      const minW = col.columnDef.minSize ?? 50
      const maxW = col.columnDef.maxSize
      if (meta?.flex) {
        return { flex: `${meta.flex as number} 1 0%`, minWidth: minW, maxWidth: maxW }
      }
      return { width: col.getSize(), minWidth: minW, maxWidth: maxW, flexShrink: 0, flexGrow: 0 }
    },
    [],
  )

  const renderResizer = useCallback(
    (header: Header<TData, unknown>) => {
      if (!enableColumnResizing) return null
      return (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={`dt-resizer${header.column.getIsResizing() ? ' dt-resizer--active' : ''}`}
        />
      )
    },
    [enableColumnResizing],
  )

  const renderRow = useCallback(
    (row: Row<TData>, style?: React.CSSProperties) => {
      const depth = row.depth ?? 0
      const rowClassValue = typeof rowClassName === 'function' ? rowClassName(row.original) : rowClassName

      return (
        <div
          key={row.id}
          className={`dt-row${row.getIsSelected() ? ' dt-row--selected' : ''} dt-row--depth-${Math.min(depth, 3)}${rowClassValue ? ` ${rowClassValue}` : ''}`}
          style={style}
          data-row-id={row.id}
        >
          {row.getVisibleCells().map((cell, cellIndex) => {
            const meta = cell.column.columnDef.meta as Record<string, unknown> | undefined
            const isNumeric = meta?.numeric === true
            const cellClasses = ['dt-cell']
            if (isNumeric) cellClasses.push('dt-cell--numeric')

            return (
              <div
                key={cell.id}
                className={cellClasses.join(' ')}
                style={getColStyle(cell.column)}
              >
                {cellIndex === 0 && treeMode && (
                  <>
                    <span className="dt-indent" style={{ width: depth * 20 }} />
                    {row.getCanExpand() ? (
                      <button
                        className={`dt-expand-toggle${row.getIsExpanded() ? ' dt-expand-toggle--expanded' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleToggleExpand(row) }}
                        aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
                      >
                        {expandingRowId === row.id ? (
                          <span className="dt-spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                    ) : (
                      <span style={{ width: 20 }} />
                    )}
                  </>
                )}
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            )
          })}
        </div>
      )
    },
    [rowClassName, getColStyle, treeMode, handleToggleExpand, expandingRowId],
  )

  // Pinned-bottom is a proper sub-component so its useReactTable call obeys
  // the rules of hooks. Passed through from the parent via props.

  const totalRowCount = manualPagination ? (pageCount ?? 0) * pagination.pageSize : data.length
  const showPagination = usePagination && totalRowCount > pagination.pageSize

  const totalPages = table.getPageCount()
  const currentPage = pagination.pageIndex

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
    const pages: (number | 'ellipsis')[] = []
    pages.push(0)
    const start = Math.max(1, currentPage - 1)
    const end = Math.min(totalPages - 2, currentPage + 1)
    if (start > 1) pages.push('ellipsis')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 2) pages.push('ellipsis')
    pages.push(totalPages - 1)
    return pages
  }, [totalPages, currentPage])

  const hasFlexColumn = visibleColumns.some(
    (c) => (c.columnDef.meta as Record<string, unknown> | undefined)?.flex,
  )

  return (
    <div
      className="dt-wrapper"
      style={maxHeight ? { maxHeight } : undefined}
    >
      {/* Scroll container for header + body (synced horizontal scroll) */}
      <div className="dt-scroll-container" ref={scrollRef}>
        <div className="dt-scroll-inner" style={!hasFlexColumn ? { minWidth: totalTableWidth } : undefined}>
          {/* Header */}
          <div className="dt-header">
            {headerGroups.map((hg) =>
              hg.headers.map((header, hi) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                const isFirstDataCol = treeMode && hi === (enableRowSelection ? 1 : 0)
                return (
                  <div
                    key={header.id}
                    className={`dt-header-cell${canSort ? ' dt-header-cell--sortable' : ''}`}
                    style={getColStyle(header.column)}
                  >
                    {isFirstDataCol && <span style={{ width: 20, flexShrink: 0 }} />}
                    <div
                      className="dt-header-cell-content"
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        <span className={`dt-sort-icon${sorted ? ' dt-sort-icon--active' : ''}`}>
                          {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
                        </span>
                      )}
                    </div>
                    {renderResizer(header)}
                  </div>
                )
              }),
            )}
          </div>

          {/* Body */}
          <div className="dt-body">
            {loading && (
              <div className="dt-loading">
                <div className="dt-spinner" />
              </div>
            )}

            {!loading && tableRows.length === 0 ? (
              <div className="dt-empty">{emptyMessage}</div>
            ) : shouldVirtualize ? (
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = tableRows[virtualRow.index]
                  return renderRow(row, {
                    position: 'absolute',
                    top: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                    width: '100%',
                    height: rowHeight,
                  })
                })}
              </div>
            ) : (
              tableRows.map((row) => renderRow(row))
            )}
          </div>

          {/* Pinned bottom (totals) */}
          {pinnedBottomRows?.length ? (
            <PinnedBottomRows
              rows={pinnedBottomRows}
              columns={columns}
              visibility={visibility}
              columnSizing={columnSizing}
              enableColumnResizing={enableColumnResizing}
              columnResizeMode={columnResizeMode}
              getColStyle={getColStyle}
            />
          ) : null}
        </div>
      </div>

      {/* Pagination (outside scroll so it's always visible) */}
      {showPagination && (
        <div className="dt-footer">
          <div className="dt-footer-info">
            <span>
              {manualPagination
                ? `${totalRowCount.toLocaleString()} rows`
                : `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.length)} of ${data.length.toLocaleString()}`}
            </span>
            <select
              className="dt-page-size-select"
              value={pagination.pageSize}
              onChange={(e) => {
                const next = Number(e.target.value)
                handlePaginationChange({ pageIndex: 0, pageSize: next })
              }}
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
          </div>
          <div className="dt-footer-nav">
            <button
              className="dt-page-btn"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`e${i}`} className="dt-page-btn" style={{ border: 'none', cursor: 'default', opacity: 0.5 }}>…</span>
              ) : (
                <button
                  key={p}
                  className={`dt-page-btn${p === currentPage ? ' dt-page-btn--active' : ''}`}
                  onClick={() => table.setPageIndex(p)}
                >
                  {p + 1}
                </button>
              ),
            )}
            <button
              className="dt-page-btn"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pinned bottom rows (totals) ────────────────────────────────────────────
// Extracted into its own component so the useReactTable call inside respects
// the rules of hooks. Shares column definitions and sizing state with the
// main table via props so it stays in sync when the user resizes or hides
// columns.

interface PinnedBottomRowsProps<TData> {
  rows: TData[]
  columns: ColumnDef<TData, unknown>[]
  visibility: VisibilityState
  columnSizing: Record<string, number>
  enableColumnResizing: boolean
  columnResizeMode: ColumnResizeMode
  getColStyle: (col: {
    getSize: () => number
    columnDef: { meta?: unknown; minSize?: number; maxSize?: number }
  }) => React.CSSProperties
}

function PinnedBottomRows<TData>({
  rows,
  columns,
  visibility,
  columnSizing,
  enableColumnResizing,
  columnResizeMode,
  getColStyle,
}: PinnedBottomRowsProps<TData>) {
  const pinnedTable = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility: visibility, columnSizing },
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing,
    columnResizeMode,
  })
  return (
    <div className="dt-pinned-bottom">
      {pinnedTable.getRowModel().rows.map((row) => (
        <div key={row.id} className="dt-row">
          {row.getVisibleCells().map((cell) => {
            const meta = cell.column.columnDef.meta as Record<string, unknown> | undefined
            const isNumeric = meta?.numeric === true
            return (
              <div
                key={cell.id}
                className={`dt-cell${isNumeric ? ' dt-cell--numeric' : ''}`}
                style={getColStyle(cell.column)}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
