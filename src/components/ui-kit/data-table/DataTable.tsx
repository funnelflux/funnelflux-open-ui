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
import { useRef, useCallback, useEffect, useMemo, useState, memo } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { cn } from '@/lib/utils'
import type { ColumnAlign } from './columnDefs'
import { DataTablePagination, buildDataTablePageTokens } from './DataTablePagination'
import type { DataTableProps, SortingState, VisibilityState, RowSelectionState, PaginationState, ExpandedState, Row } from './types'
import { DEFAULT_TABLE_SORTING, useTableConfigStore, selectTableConfig } from '@/store/tableConfig'
import './data-table.css'

const DEFAULT_PAGE_SIZES = [25, 50, 100, 200]

function alignClass(align?: ColumnAlign): string {
  if (align === 'center') return ' dt-align-center'
  if (align === 'right') return ' dt-align-right'
  return ''
}

function DataTableInner<TData>({
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
  tableConfigKey,
  defaultSorting,
  pagination: controlledPagination,
  onPaginationChange,
  manualPagination,
  pageCount,
  manualPaginationTotalRows,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  columnVisibility: controlledVisibility,
  onColumnVisibilityChange,
  treeMode,
  getSubRows,
  onExpandRow,
  canLazyExpandRow,
  expanded: controlledExpanded,
  onExpandedChange,
  rowClassName,
  virtualizeThreshold = 100,
  rowHeight = 36,
  maxHeight,
  height,
  className,
  tableRef,
  onTableInstance,
  emptyMessage = 'No data.',
  noPagination,
  enableColumnResizing = true,
  columnSizing: controlledSizing,
  onColumnSizingChange,
  loadingMinBodyHeight = 240,
  loadingSkeletonRows = 10,
  paginationPosition = 'bottom',
}: DataTableProps<TData>) {
  const fallbackDefault = defaultSorting ?? DEFAULT_TABLE_SORTING
  const [internalSorting, setInternalSorting] = useState<SortingState>(fallbackDefault)

  const isSortingControlled = controlledSorting !== undefined
  const storeConfigSlice = useTableConfigStore((state) =>
    tableConfigKey ? selectTableConfig(tableConfigKey)(state) : null,
  )
  const sortingFromStore = storeConfigSlice?.sorting ?? []
  const setSortingInStore = useTableConfigStore((s) => s.setSorting)

  const persistedOrDefaultFallback = defaultSorting ?? DEFAULT_TABLE_SORTING

  const effectiveSorting = isSortingControlled
    ? (controlledSorting as SortingState)
    : (tableConfigKey
      ? (sortingFromStore.length > 0 ? sortingFromStore : persistedOrDefaultFallback)
      : internalSorting)
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>({})
  const [internalPagination, setInternalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>({})
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({})
  const [expandingRowId, setExpandingRowId] = useState<string | null>(null)
  const [internalSizing, setInternalSizing] = useState<Record<string, number>>({})

  const selection = controlledSelection ?? internalSelection
  const pagination = controlledPagination ?? internalPagination
  const visibility = controlledVisibility ?? internalVisibility
  const expanded = controlledExpanded ?? internalExpanded
  const columnSizing = controlledSizing ?? internalSizing

  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const next = typeof updater === 'function' ? updater(effectiveSorting) : updater
      if (onSortingChange) {
        onSortingChange(next)
      }
      if (!isSortingControlled && tableConfigKey) {
        setSortingInStore(tableConfigKey, next)
      }
      if (!isSortingControlled && !tableConfigKey) {
        setInternalSorting(next)
      }
    },
    [effectiveSorting, onSortingChange, isSortingControlled, tableConfigKey, setSortingInStore],
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

  const usePagination = !noPagination

  const table = useReactTable({
    data,
    columns,
    /**
     * In tree mode with pagination, `false` keeps expanded children on the parent's page
     * (flattening happens in `getPaginationRowModel`). With `noPagination`, there is no
     * pagination row model, so we must leave this `true` for `getExpandedRowModel` to
     * flatten parent+children into the visible rows.
     */
    paginateExpandedRows: treeMode && usePagination ? false : true,
    state: {
      sorting: effectiveSorting,
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
    getRowCanExpand:
      treeMode && onExpandRow
        ? (row) => {
            if ((row.subRows?.length ?? 0) > 0) return true
            return canLazyExpandRow?.(row.original as TData) ?? false
          }
        : undefined,
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
      const lazyLoad = Boolean(onExpandRow && !row.getIsExpanded())
      if (lazyLoad) {
        setExpandingRowId(row.id)
        try {
          await onExpandRow?.(row.original)
        } finally {
          setExpandingRowId(null)
        }
        /** Parent may own `expanded` state and have already opened this row; only toggle if still closed. */
        if (!row.getIsExpanded()) {
          row.toggleExpanded(true)
        }
        return
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
        <button
          type="button"
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          aria-label={`Resize ${String(header.column.id)} column`}
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
                data-col-id={cell.column.id}
                className={cellClasses}
                style={{ width: getColWidth(cell.column) }}
              >
                {isTreeTarget && (
                  <>
                    <span className="dt-indent" style={{ width: depth * 24 }} />
                    {row.getCanExpand() ? (
                      <button
                        type="button"
                        className={`dt-expand-toggle${row.getIsExpanded() ? ' dt-expand-toggle--expanded' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleToggleExpand(row) }}
                        aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
                      >
                        {expandingRowId === row.id ? (
                          <span className="dt-spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
                        ) : (
                          <Icon name="chevron-right" size="sm" />
                        )}
                      </button>
                    ) : (
                      <span className="dt-expand-placeholder" aria-hidden />
                    )}
                    <span className="dt-expand-gap" aria-hidden />
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
              const isActionBtn = !!meta?.actionBtn
              const isSelect = cell.column.id === 'select'
              if (isActionBtn || isSelect) {
                return (
                  <div
                    key={cell.id}
                    data-col-id={cell.column.id}
                    className={'dt-cell' + alignClass(cellAlign)}
                    style={{ width: getColWidth(cell.column) }}
                  />
                )
              }
              const content = flexRender(cell.column.columnDef.cell, cell.getContext())
              return (
                <div
                  key={cell.id}
                  data-col-id={cell.column.id}
                  className={'dt-cell' + alignClass(cellAlign)}
                  style={{ width: getColWidth(cell.column) }}
                >
                  <span className="dt-cell-text">{content}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  const totalRowCount = manualPagination ? (pageCount ?? 0) * pagination.pageSize : data.length
  const totalPages = table.getPageCount()
  const currentPage = pagination.pageIndex

  const pageNumbers = useMemo(() => {
    return buildDataTablePageTokens(totalPages, currentPage)
  }, [totalPages, currentPage])

  const wrapperStyle =
    maxHeight != null || height != null
      ? { ...(maxHeight != null ? { maxHeight } : {}), ...(height != null ? { height } : {}) }
      : undefined

  const loadingEmpty = loading && tableRows.length === 0
  const wrapperStyleWithLoadingMin =
    loadingEmpty && loadingMinBodyHeight > 0
      ? { ...wrapperStyle, ['--dt-loading-min-body-height' as string]: `${loadingMinBodyHeight}px` }
      : wrapperStyle

  const paginationRangeLabel = manualPagination
    ? manualPaginationTotalRows != null
      ? `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, manualPaginationTotalRows)} of ${manualPaginationTotalRows.toLocaleString()}`
      : `${totalRowCount.toLocaleString()} rows`
    : `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.length)} of ${data.length.toLocaleString()}`

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      handlePaginationChange({ pageIndex: 0, pageSize: nextPageSize })
    },
    [handlePaginationChange],
  )

  const handlePreviousPage = useCallback(() => {
    table.previousPage()
  }, [table])

  const handleNextPage = useCallback(() => {
    table.nextPage()
  }, [table])

  const handlePageSelect = useCallback(
    (pageIndex: number) => {
      table.setPageIndex(pageIndex)
    },
    [table],
  )

  const paginationControls = usePagination ? (
    <DataTablePagination
      rangeLabel={paginationRangeLabel}
      pageSize={pagination.pageSize}
      pageSizeOptions={pageSizeOptions}
      pageTokens={pageNumbers}
      currentPage={currentPage}
      canPreviousPage={table.getCanPreviousPage()}
      canNextPage={table.getCanNextPage()}
      onPageSizeChange={handlePageSizeChange}
      onPreviousPage={handlePreviousPage}
      onNextPage={handleNextPage}
      onPageSelect={handlePageSelect}
    />
  ) : null

  return (
    <div
      className={cn('dt-wrapper', loadingEmpty && 'dt-wrapper--loading-empty', className)}
      style={wrapperStyleWithLoadingMin}
    >
      {paginationPosition === 'top' ? paginationControls : null}
      <div className="dt-scroll-container" ref={scrollRef}>
        {loading && (
          <div className="dt-loading">
            <div className="dt-spinner" />
          </div>
        )}

        <div className="dt-scroll-inner">
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
                    data-col-id={header.column.id}
                    className={`dt-header-cell${canSort ? ' dt-header-cell--sortable' : ''}${alignClass(headerAlign)}`}
                    style={{ width: getColWidth(header.column) }}
                  >
                    {isFirstDataCol && <span className="dt-tree-header-spacer" />}
                    <button
                      type="button"
                      className="dt-header-cell-content"
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      disabled={!canSort}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        <span className={`dt-sort-icon${sorted ? ' dt-sort-icon--active' : ''}`}>
                          {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
                        </span>
                      )}
                    </button>
                    {renderResizer(header)}
                  </div>
                )
              }),
            )}
          </div>

          {/* Body — grows when few rows so pinned totals stay at bottom of the scroll area */}
          <div className="dt-body">
            {loadingEmpty ? (
              <div
                className="dt-loading-skeleton-wrap"
                aria-busy="true"
                aria-label="Loading"
              >
                {Array.from({ length: loadingSkeletonRows }, (_, skeletonRowIndex) => (
                  <div
                    key={`sk-${skeletonRowIndex}`}
                    className="dt-skeleton-row"
                  >
                    <span className="dt-skeleton-bar dt-skeleton-bar--primary" />
                    <span className="dt-skeleton-bar dt-skeleton-bar--muted" />
                  </div>
                ))}
              </div>
            ) : !loading && tableRows.length === 0 ? (
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
      </div>

      {paginationPosition === 'bottom' ? paginationControls : null}
    </div>
  )
}

export const DataTable = memo(DataTableInner) as typeof DataTableInner
