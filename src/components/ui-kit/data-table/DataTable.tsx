import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  flexRender,
  type Header,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import type { ColumnAlign } from './columnDefs'
import type { DataTableProps, SortingState, VisibilityState, RowSelectionState, PaginationState, ExpandedState, Row } from './types'
import './data-table.css'

const DEFAULT_PAGE_SIZES = [25, 50, 100, 200]

function alignClass(align?: ColumnAlign): string {
  if (align === 'center') return ' dt-align-center'
  if (align === 'right') return ' dt-align-right'
  return ''
}

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
  columnSizing: controlledSizing,
  onColumnSizingChange,
}: DataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>({})
  const [internalPagination, setInternalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>({})
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({})
  const [expandingRowId, setExpandingRowId] = useState<string | null>(null)
  const [internalSizing, setInternalSizing] = useState<Record<string, number>>({})

  const sorting = controlledSorting ?? internalSorting
  const selection = controlledSelection ?? internalSelection
  const pagination = controlledPagination ?? internalPagination
  const visibility = controlledVisibility ?? internalVisibility
  const expanded = controlledExpanded ?? internalExpanded
  const columnSizing = controlledSizing ?? internalSizing

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

  const handleSizingChange = useCallback(
    (updater: Record<string, number> | ((old: Record<string, number>) => Record<string, number>)) => {
      const next = typeof updater === 'function' ? updater(columnSizing) : updater
      ;(onColumnSizingChange ?? setInternalSizing)(next)
    },
    [columnSizing, onColumnSizingChange],
  )

  const usePagination = !noPagination && !treeMode

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
    onColumnSizingChange: handleSizingChange as never,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getPaginationRowModel: usePagination && !manualPagination ? getPaginationRowModel() : undefined,
    getExpandedRowModel: treeMode ? getExpandedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    getSubRows: getSubRows as never,
    enableRowSelection: enableRowSelection as never,
    enableColumnResizing,
    columnResizeMode: 'onChange',
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
    return visibleColumns.reduce((sum, col) => sum + col.getSize(), 0)
  }, [visibleColumns])

  const getColWidth = useCallback(
    (col: { getSize: () => number }): number => col.getSize(),
    [],
  )

  const renderResizer = useCallback(
    (header: Header<TData, unknown>) => {
      if (!enableColumnResizing || header.column.columnDef.enableResizing === false) return null
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
          style={{ ...style, minWidth: totalTableWidth }}
          data-row-id={row.id}
        >
          {row.getVisibleCells().map((cell) => {
            const meta = cell.column.columnDef.meta as Record<string, unknown> | undefined
            const cellAlign = (meta?.align as ColumnAlign | undefined)
            const isActionBtn = !!meta?.actionBtn
            const cellClasses = 'dt-cell' + alignClass(cellAlign)
            const isTreeTarget = treeMode && cell.column.id === 'name'
            const content = flexRender(cell.column.columnDef.cell, cell.getContext())

            return (
              <div
                key={cell.id}
                className={cellClasses}
                style={{ width: getColWidth(cell.column) }}
              >
                {isTreeTarget && (
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
                {isActionBtn ? content : <span className="dt-cell-text">{content}</span>}
              </div>
            )
          })}
        </div>
      )
    },
    [rowClassName, getColWidth, totalTableWidth, treeMode, handleToggleExpand, expandingRowId],
  )

  const pinnedTable = useReactTable({
    data: pinnedBottomRows ?? [],
    columns,
    state: { columnVisibility: visibility, columnSizing },
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing,
    columnResizeMode: 'onChange',
  })

  const renderPinnedBottom = () => {
    if (!pinnedBottomRows?.length) return null
    return (
      <div className="dt-pinned-bottom" style={{ minWidth: totalTableWidth }}>
        {pinnedTable.getRowModel().rows.map((row) => (
          <div key={row.id} className="dt-row">
            {row.getVisibleCells().map((cell) => {
              const meta = cell.column.columnDef.meta as Record<string, unknown> | undefined
              const cellAlign = (meta?.align as ColumnAlign | undefined)
              return (
                <div
                  key={cell.id}
                  className={'dt-cell' + alignClass(cellAlign)}
                  style={{ width: getColWidth(cell.column) }}
                >
                  <span className="dt-cell-text">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

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

  return (
    <div
      className="dt-wrapper"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className="dt-scroll-container" ref={scrollRef}>
        {loading && (
          <div className="dt-loading">
            <div className="dt-spinner" />
          </div>
        )}

        {/* Header — sticky top, scrolls horizontally with body */}
        <div className="dt-header" style={{ minWidth: totalTableWidth }}>
          {headerGroups.map((hg) =>
            hg.headers.map((header) => {
              const canSort = header.column.getCanSort()
              const sorted = header.column.getIsSorted()
              const meta = header.column.columnDef.meta as Record<string, unknown> | undefined
              const headerAlign = (meta?.align as ColumnAlign | undefined)
              const isFirstDataCol = treeMode && header.column.id === 'name'
              return (
                <div
                  key={header.id}
                  className={`dt-header-cell${canSort ? ' dt-header-cell--sortable' : ''}${alignClass(headerAlign)}`}
                  style={{ width: getColWidth(header.column) }}
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
                  height: rowHeight,
                })
              })}
            </div>
          ) : (
            tableRows.map((row) => renderRow(row))
          )}
        </div>

        {renderPinnedBottom()}
      </div>

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
