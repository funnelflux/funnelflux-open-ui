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
import type { Column } from '@tanstack/react-table'
import type { ColumnAlign } from './columnDefs'
import { DataTablePagination, buildDataTablePageTokens } from './DataTablePagination'
import type { DataTableProps, SortingState, VisibilityState, RowSelectionState, PaginationState, ExpandedState, Row } from './types'
import { DataTableColumnFilterTrigger } from './DataTableColumnFilter'
import { DEFAULT_TABLE_SORTING, useTableConfigStore, selectTableConfig } from '@/store/tableConfig'
import './data-table.css'

const DEFAULT_PAGE_SIZES = [25, 50, 100, 200]
const DEFAULT_MIN_COLUMN_WIDTH = 40
const DEFAULT_MAX_COLUMN_WIDTH = 4000

function clampColumnWidth<TData>(
  width: number,
  column?: Column<TData, unknown>,
): number {
  const minSize = column?.columnDef.minSize ?? DEFAULT_MIN_COLUMN_WIDTH
  const maxSize = column?.columnDef.maxSize ?? DEFAULT_MAX_COLUMN_WIDTH
  if (!Number.isFinite(width) || width <= 0) return minSize
  return Math.min(maxSize, Math.max(minSize, Math.round(width)))
}

function pinnedLeadingColumnIds(treeMode?: boolean, pinTreeGrouping?: boolean): string[] {
  const ids: string[] = []
  if (treeMode && pinTreeGrouping !== false) ids.push('name')
  return ids
}

function reorderMovableColumns(
  order: string[],
  draggedId: string,
  targetId: string,
  pinnedIds: string[],
): string[] | null {
  if (pinnedIds.includes(draggedId) || pinnedIds.includes(targetId)) return null
  if (draggedId === targetId) return null
  const pinnedPresent = pinnedIds.filter((id) => order.includes(id))
  const movable = order.filter((id) => !pinnedIds.includes(id))
  const fromIndex = movable.indexOf(draggedId)
  const toIndex = movable.indexOf(targetId)
  if (fromIndex < 0 || toIndex < 0) return null
  const nextMovable = [...movable]
  nextMovable.splice(fromIndex, 1)
  nextMovable.splice(toIndex, 0, draggedId)
  return [...pinnedPresent, ...nextMovable]
}

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
  columnFilters,
  onColumnFilterChange,
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
  columnOrder: controlledColumnOrder,
  onColumnOrderChange,
  pinTreeGroupingColumn,
  loadingMinBodyHeight = 240,
  loadingSkeletonRows = 10,
  paginationPosition = 'bottom',
  loadingMore = false,
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
  const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>([])
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null)

  const selection = controlledSelection ?? internalSelection
  const pagination = controlledPagination ?? internalPagination
  const visibility = controlledVisibility ?? internalVisibility
  const expanded = controlledExpanded ?? internalExpanded
  const columnSizing = controlledSizing ?? internalSizing
  const columnOrder = controlledColumnOrder ?? internalColumnOrder

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

  const handleColumnOrderChange = useCallback(
    (updater: string[] | ((old: string[]) => string[])) => {
      const next = typeof updater === 'function' ? updater(columnOrder) : updater
      ;(onColumnOrderChange ?? setInternalColumnOrder)(next)
    },
    [columnOrder, onColumnOrderChange],
  )

  const usePagination = !noPagination

  const table = useReactTable({
    data,
    columns,
    /**
     * Only disable `paginateExpandedRows` when client-side pagination row model is active.
     * For manual/no pagination there is no pagination row model to flatten expanded nodes,
     * so this must stay `true` or children may not render after expand.
     */
    paginateExpandedRows: treeMode && usePagination && !manualPagination ? false : true,
    state: {
      sorting: effectiveSorting,
      rowSelection: selection,
      pagination,
      columnVisibility: visibility,
      expanded,
      columnSizing,
      columnOrder,
    },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    onSortingChange: handleSortingChange as never,
    onRowSelectionChange: handleSelectionChange as never,
    onPaginationChange: handlePaginationChange as never,
    onColumnVisibilityChange: handleVisibilityChange as never,
    onExpandedChange: handleExpandedChange as never,
    onColumnSizingChange: handleSizingChange as never,
    onColumnOrderChange: handleColumnOrderChange as never,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getPaginationRowModel: usePagination && !manualPagination ? getPaginationRowModel() : undefined,
    getExpandedRowModel: treeMode ? getExpandedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    getSubRows: getSubRows as never,
    getRowCanExpand: treeMode
      ? (row) => {
          if ((row.subRows?.length ?? 0) > 0) return true
          if (onExpandRow) {
            return canLazyExpandRow?.(row.original as TData) ?? false
          }
          return false
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
  const [scrollViewportWidth, setScrollViewportWidth] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const updateWidth = () => setScrollViewportWidth(el.clientWidth)
    updateWidth()
    const ResizeObserverCtor = globalThis.ResizeObserver
    if (!ResizeObserverCtor) {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }
    const resizeObserver = new ResizeObserverCtor(updateWidth)
    resizeObserver.observe(el)
    return () => resizeObserver.disconnect()
  }, [])

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

  const columnWidths = useMemo(() => {
    const widths = new Map<string, number>()
    const baseTotal = visibleColumns.reduce((sum, col) => {
      const width = Math.ceil(col.getSize())
      widths.set(col.id, width)
      return sum + width
    }, 0)
    const fitWidth = Math.max(0, Math.floor(scrollViewportWidth) - 2)
    let extra = Math.max(0, fitWidth - baseTotal)
    if (extra <= 0) return widths

    const flexColumns = visibleColumns.filter((col) => {
      const meta = col.columnDef.meta as Record<string, unknown> | undefined
      if (typeof meta?.flex !== 'number' || meta.flex <= 0) return false
      if (columnSizing[col.id] != null) return false
      return true
    })

    while (extra > 0.5 && flexColumns.length > 0) {
      const activeFlexColumns = flexColumns.filter((col) => {
        const current = widths.get(col.id) ?? col.getSize()
        const maxSize = col.columnDef.maxSize ?? Number.POSITIVE_INFINITY
        return current < maxSize
      })
      if (activeFlexColumns.length === 0) break
      let distributed = 0
      const portion = Math.max(1, Math.floor(extra / activeFlexColumns.length))
      for (const col of activeFlexColumns) {
        const current = widths.get(col.id) ?? col.getSize()
        const maxSize = col.columnDef.maxSize ?? Number.POSITIVE_INFINITY
        const room = Math.max(0, maxSize - current)
        const add = Math.min(room, portion)
        if (add > 0) {
          widths.set(col.id, current + add)
          distributed += add
        }
      }
      if (distributed <= 0) break
      extra -= distributed
    }

    for (const col of visibleColumns) {
      const width = widths.get(col.id) ?? col.getSize()
      widths.set(col.id, clampColumnWidth(width, col))
    }

    return widths
  }, [visibleColumns, scrollViewportWidth, columnSizing])

  const totalTableWidth = useMemo(() => {
    return visibleColumns.reduce((sum, col) => sum + (columnWidths.get(col.id) ?? col.getSize()), 0)
  }, [visibleColumns, columnWidths])

  const getColWidth = useCallback(
    (col: { id: string; getSize: () => number }): number => {
      const column = table.getColumn(col.id)
      return clampColumnWidth(columnWidths.get(col.id) ?? col.getSize(), column)
    },
    [columnWidths, table],
  )

  const pinnedColumnIds = useMemo(
    () => pinnedLeadingColumnIds(treeMode, pinTreeGroupingColumn),
    [treeMode, pinTreeGroupingColumn],
  )

  const handleHeaderDragStart = useCallback(
    (columnId: string) => (event: React.DragEvent) => {
      if (pinnedColumnIds.includes(columnId)) {
        event.preventDefault()
        return
      }
      setDraggingColumnId(columnId)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', columnId)
    },
    [pinnedColumnIds],
  )

  const handleHeaderDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleHeaderDrop = useCallback(
    (targetId: string) => (event: React.DragEvent) => {
      event.preventDefault()
      const draggedId = event.dataTransfer.getData('text/plain') || draggingColumnId
      setDraggingColumnId(null)
      if (!draggedId) return
      const baseOrder =
        columnOrder.length > 0 ? [...columnOrder] : visibleColumns.map((col) => col.id)
      const next = reorderMovableColumns(baseOrder, draggedId, targetId, pinnedColumnIds)
      if (next) handleColumnOrderChange(next)
    },
    [columnOrder, visibleColumns, draggingColumnId, pinnedColumnIds, handleColumnOrderChange],
  )

  const handleHeaderDragEnd = useCallback(() => {
    setDraggingColumnId(null)
  }, [])

  const renderResizer = useCallback(
    (header: Header<TData, unknown>) => {
      if (!enableColumnResizing || header.column.columnDef.enableResizing === false) return null
      const resizeHandler = header.getResizeHandler()
      const stopResizePointer = (
        event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>,
      ) => {
        event.stopPropagation()
      }
      const seedFlexWidthOnResizeStart = (
        event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>,
      ) => {
        event.stopPropagation()
        const col = header.column
        const meta = col.columnDef.meta as Record<string, unknown> | undefined
        const isFlex = typeof meta?.flex === 'number' && meta.flex > 0
        if (isFlex && columnSizing[col.id] == null) {
          const rendered = columnWidths.get(col.id) ?? col.getSize()
          handleSizingChange({
            ...columnSizing,
            [col.id]: clampColumnWidth(rendered, col),
          })
        }
        resizeHandler(event as never)
      }
      const handleResizerDragStart = (event: React.DragEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
      }
      return (
        <button
          type="button"
          draggable={false}
          onMouseDown={seedFlexWidthOnResizeStart}
          onTouchStart={seedFlexWidthOnResizeStart}
          onPointerDown={stopResizePointer}
          onDragStart={handleResizerDragStart}
          aria-label={`Resize ${String(header.column.id)} column`}
          className={`dt-resizer${header.column.getIsResizing() ? ' dt-resizer--active' : ''}`}
        />
      )
    },
    [columnSizing, columnWidths, enableColumnResizing, handleSizingChange],
  )

  const renderRow = useCallback(
    (row: Row<TData>, style?: React.CSSProperties, rowIndex?: number) => {
      const depth = row.depth ?? 0
      const rowClassValue = typeof rowClassName === 'function' ? rowClassName(row.original) : rowClassName

      return (
        <div
          key={row.id}
          role="row"
          /* 1-based; header row is 1 — required with virtualization since only a window of rows is in the DOM */
          aria-rowindex={rowIndex != null ? rowIndex + 2 : undefined}
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
                role="cell"
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
    state: { columnVisibility: visibility, columnSizing, columnOrder },
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing,
    columnResizeMode: 'onChange',
  })

  const renderPinnedBottom = () => {
    if (!pinnedBottomRows?.length) return null
    return (
      <div className="dt-pinned-bottom" role="rowgroup" style={{ minWidth: totalTableWidth }}>
        {pinnedTable.getRowModel().rows.map((row, pinnedIndex) => (
          <div
            key={row.id}
            className="dt-row"
            role="row"
            aria-rowindex={1 + tableRows.length + pinnedIndex + 1}
          >
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
                    role="cell"
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
                  role="cell"
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

  /** Header row + all body rows (even those not rendered while virtualized) + pinned totals rows. */
  const ariaRowCount = 1 + tableRows.length + (pinnedBottomRows?.length ?? 0)

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
      loadingMore={loadingMore}
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

        <div
          className="dt-scroll-inner"
          role="table"
          aria-rowcount={ariaRowCount}
        >
          {/* Header — sticky top, scrolls horizontally with body */}
          <div
            className="dt-header"
            style={{ minWidth: totalTableWidth }}
            role="row"
            aria-rowindex={1}
          >
            {headerGroups.map((hg) =>
              hg.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                const meta = header.column.columnDef.meta as Record<string, unknown> | undefined
                const headerAlign = (meta?.align as ColumnAlign | undefined)
                const isFirstDataCol = treeMode && header.column.id === 'name'
                const columnId = header.column.id
                const canDragColumn = !pinnedColumnIds.includes(columnId)
                const filterKind =
                  meta?.numeric === true
                    ? 'numeric'
                    : meta?.textFilterable === true
                      ? 'text'
                      : null
                const canFilter = Boolean(onColumnFilterChange) && filterKind !== null
                const activeFilter = Boolean(columnFilters?.[columnId])
                return (
                  // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- sort/filter/drag interactions live on focusable child buttons; the cell itself is not a tab stop
                  <div
                    key={header.id}
                    data-col-id={columnId}
                    role="columnheader"
                    aria-sort={
                      canSort
                        ? sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    onDragOver={canDragColumn ? handleHeaderDragOver : undefined}
                    onDrop={canDragColumn ? handleHeaderDrop(columnId) : undefined}
                    className={cn(
                      'dt-header-cell',
                      canSort && 'dt-header-cell--sortable',
                      alignClass(headerAlign),
                      draggingColumnId === columnId && 'dt-header-cell--dragging',
                    )}
                    style={{ width: getColWidth(header.column) }}
                  >
                    {isFirstDataCol && <span className="dt-tree-header-spacer" />}
                    <div className="dt-header-cell-actions">
                      {canSort ? (
                        <button
                          type="button"
                          draggable={canDragColumn}
                          className={cn(
                            'dt-header-cell-content',
                            canDragColumn && 'dt-header-cell-content--reorderable',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          onDragStart={
                            canDragColumn ? handleHeaderDragStart(columnId) : undefined
                          }
                          onDragEnd={canDragColumn ? handleHeaderDragEnd : undefined}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          <span className={`dt-sort-icon${sorted ? ' dt-sort-icon--active' : ''}`}>
                            {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
                          </span>
                        </button>
                      ) : (
                        <div
                          draggable={canDragColumn}
                          className={cn(
                            'dt-header-cell-content',
                            canDragColumn && 'dt-header-cell-content--reorderable',
                          )}
                          onDragStart={
                            canDragColumn ? handleHeaderDragStart(columnId) : undefined
                          }
                          onDragEnd={canDragColumn ? handleHeaderDragEnd : undefined}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                      )}
                      {canFilter && onColumnFilterChange ? (
                        <DataTableColumnFilterTrigger
                          columnId={columnId}
                          filterKind={filterKind!}
                          active={activeFilter}
                          value={columnFilters?.[columnId]}
                          onChange={onColumnFilterChange}
                        />
                      ) : null}
                    </div>
                    {renderResizer(header)}
                  </div>
                )
              }),
            )}
          </div>

          {/* Body — grows when few rows so pinned totals stay at bottom of the scroll area */}
          <div className="dt-body" role="rowgroup">
            {loadingEmpty ? (
              <div
                className="dt-loading-skeleton-wrap"
                role="presentation"
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
              <div className="dt-empty" role="presentation">{emptyMessage}</div>
            ) : shouldVirtualize ? (
              /* presentation: keeps role="row" children owned by the rowgroup in the a11y tree */
              <div role="presentation" style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = tableRows[virtualRow.index]
                  return renderRow(
                    row,
                    {
                      position: 'absolute',
                      top: 0,
                      transform: `translateY(${virtualRow.start}px)`,
                      height: rowHeight,
                    },
                    virtualRow.index,
                  )
                })}
              </div>
            ) : (
              tableRows.map((row, rowIndex) => renderRow(row, undefined, rowIndex))
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
