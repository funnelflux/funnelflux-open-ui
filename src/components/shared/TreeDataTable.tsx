import { useState, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type VisibilityState,
  type ExpandedState,
  type OnChangeFn,
  type Row,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Columns3,
  Loader2,
} from "lucide-react"
import { Button, Dropdown, Skeleton, Select } from "antd"
import type { MenuProps } from "antd"
import { cn } from "@/lib/utils"

interface TreeRow {
  _hasChildren?: boolean
  _isLoadingChildren?: boolean
  subRows?: TreeRow[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TreeDataTableProps<TData extends TreeRow = any> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  isLoading?: boolean
  totalRows?: number
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  manualPagination?: boolean
  manualSorting?: boolean
  expanded?: ExpandedState
  onExpandedChange?: OnChangeFn<ExpandedState>
  onExpandRow?: (rowId: string, row: TData) => Promise<TData[]>
  totalsRow?: Record<string, React.ReactNode>
  getRowId: (row: TData) => string
  className?: string
}

const PAGE_SIZES = [25, 50, 100, 250]

export function TreeDataTable<TData extends TreeRow>({
  columns,
  data,
  isLoading,
  totalRows,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  manualPagination,
  manualSorting,
  expanded,
  onExpandedChange,
  onExpandRow,
  totalsRow,
  getRowId,
  className,
}: TreeDataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>({})
  const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set())

  const currentExpanded = expanded ?? internalExpanded
  const setCurrentExpanded = onExpandedChange ?? setInternalExpanded

  const handleToggleExpand = useCallback(
    async (row: Row<TData>) => {
      if (row.getIsExpanded()) {
        row.toggleExpanded(false)
        return
      }

      const rowId = row.id
      const rowData = row.original

      if (onExpandRow && rowData._hasChildren && (!rowData.subRows || rowData.subRows.length === 0)) {
        setLoadingRows((prev) => new Set(prev).add(rowId))
        try {
          await onExpandRow(rowId, rowData)
        } finally {
          setLoadingRows((prev) => {
            const next = new Set(prev)
            next.delete(rowId)
            return next
          })
        }
      }

      row.toggleExpanded(true)
    },
    [onExpandRow],
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: sorting ?? internalSorting,
      pagination: pagination ?? internalPagination,
      columnVisibility,
      expanded: currentExpanded,
    },
    onSortingChange: onSortingChange ?? setInternalSorting,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setCurrentExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.subRows as TData[] | undefined,
    getRowCanExpand: (row) => !!row.original._hasChildren || (row.original.subRows?.length ?? 0) > 0,
    autoResetExpanded: false,
    manualPagination,
    manualSorting,
    rowCount: totalRows,
    getRowId,
  })

  const currentPagination = pagination ?? internalPagination
  const pageCount = table.getPageCount()
  const rowCount = totalRows ?? data.length

  const columnMenuItems: MenuProps['items'] = table.getAllLeafColumns().map((column) => ({
    key: column.id,
    label: (
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={column.getIsVisible()}
          onChange={(e) => column.toggleVisibility(e.target.checked)}
          className="rounded"
        />
        {typeof column.columnDef.header === "string"
          ? column.columnDef.header
          : column.id}
      </label>
    ),
  }))

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-end">
        <Dropdown menu={{ items: columnMenuItems }} trigger={['click']}>
          <Button size="small" className="h-8 text-xs">
            <Columns3 className="mr-1.5 h-3.5 w-3.5" />
            Columns
          </Button>
        </Dropdown>
      </div>

      <div className="rounded-md border bg-background overflow-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-9 px-3 text-left text-xs font-medium text-muted-foreground"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1">
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 hover:text-foreground -ml-1 px-1 rounded"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b">
                  {columns.map((_, j) => (
                    <td key={j} className="px-3 py-2">
                      <Skeleton.Input active size="small" block />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isRowLoading = loadingRows.has(row.id)
                return (
                  <tr
                    key={row.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <td
                        key={cell.id}
                        className="px-3 py-2"
                        style={
                          cellIndex === 0
                            ? { paddingLeft: `${row.depth * 1.5 + 0.75}rem` }
                            : undefined
                        }
                      >
                        {cellIndex === 0 ? (
                          <div className="flex items-center gap-1">
                            {row.getCanExpand() ? (
                              <button
                                type="button"
                                className="shrink-0 p-0.5 rounded hover:bg-muted"
                                onClick={() => handleToggleExpand(row)}
                              >
                                {isRowLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                ) : row.getIsExpanded() ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="w-[18px]" />
                            )}
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}

            {totalsRow && !isLoading && (
              <tr className="border-t-2 bg-muted/30 font-medium">
                {table.getVisibleLeafColumns().map((col) => (
                  <td key={col.id} className="px-3 py-2 text-sm">
                    {totalsRow[col.id] ?? ""}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{rowCount.toLocaleString()} rows</span>
          <Select
            value={String(currentPagination.pageSize)}
            onChange={(v) =>
              (onPaginationChange ?? setInternalPagination)({
                pageIndex: 0,
                pageSize: Number(v),
              })
            }
            size="small"
            style={{ width: 70 }}
            options={PAGE_SIZES.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
          />
          <span>per page</span>
        </div>

        <div className="flex items-center gap-1">
          <span>
            Page {currentPagination.pageIndex + 1} of {Math.max(pageCount, 1)}
          </span>
          <Button
            type="text"
            className="h-7 w-7"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
          />
          <Button
            type="text"
            className="h-7 w-7"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            icon={<ChevronRight className="h-3.5 w-3.5" />}
          />
        </div>
      </div>
    </div>
  )
}
