import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { api } from '@/api/client'
import { DataTable, Icon } from '@/components/ui-kit'
import { buildColumnsFromReport } from '@/components/ui-kit/data-table'
import { drilldownSortParamFromReport } from '@/lib/drilldownTableSort'
import { reportRowToCells } from '@/lib/reportRowCells'
import { friendlyDashboardGroupingColumnHeader } from '@/lib/dashboardLabels'
import { DEFAULT_TABLE_SORTING, selectTableConfig, useTableConfigStore } from '@/store/tableConfig'
import type { ApiDateTimeRange, Report, ReportCell } from '@/types/stats'
import { metricsForColumnIds } from '@/lib/drilldownMetrics'

const EMPTY_CELL: ReportCell = { raw: '', formatted: '' }

/** Metric column ids (registry) in default dashboard top-table order. */
const WIDGET_METRIC_ORDER = [
  'visits',
  'landerClicks',
  'landerClickthroughRate',
  'offerViews',
  'conversionPerVisit',
  'cost',
  'revenue',
  'returnOnInvestment',
  'profitAndLoss',
] as const
const WIDGET_API_METRICS = metricsForColumnIds(WIDGET_METRIC_ORDER) ?? undefined

export interface DashboardTopTableFlatRow {
  _id: string
  cells: ReportCell[]
}

function dashboardTopTableRowId(row: DashboardTopTableFlatRow): string {
  return row._id
}

function reportRowsToFlatData(report: Report): DashboardTopTableFlatRow[] {
  const n = report.columns.length
  return report.rows.map((row, index) => {
    const cells = reportRowToCells(row, n)
    return {
      _id: `row-${index}-${String(cells[0]?.raw ?? index)}`,
      cells,
    }
  })
}

function buildWidgetColumnDefs(
  report: Report,
  groupBy: string,
): ColumnDef<DashboardTopTableFlatRow, unknown>[] {
  const groupingCol: ColumnDef<DashboardTopTableFlatRow, unknown> = {
    id: 'name',
    header: friendlyDashboardGroupingColumnHeader(report.columns[0]?.name, groupBy),
    accessorFn: (row) => row.cells[0]?.formatted ?? '',
    enableSorting: true,
    size: 300,
    minSize: 200,
    maxSize: 560,
    meta: { flex: 1 },
    cell: (info: { getValue: () => unknown }) => (
      <span className="font-medium">{String(info.getValue())}</span>
    ),
  }

  const all = buildColumnsFromReport<DashboardTopTableFlatRow>(report.columns)
  const byId = new Map(all.map((c) => [String(c.id), c]))
  const metrics = WIDGET_METRIC_ORDER.flatMap((id) => {
    const col = byId.get(id)
    return col ? [col] : []
  })

  return [groupingCol, ...metrics]
}

export interface DashboardTopTableProps {
  title: string
  groupBy: string
  tableConfigKey: string
  timeRange: ApiDateTimeRange
  timezone: string
  dataVersion: number
  /** Page size from dashboard settings (persisted). */
  pageSize: number
  onPageSizeChange?: (pageSize: number) => void
  /** When false, no drilldown request is sent (e.g. until the section scrolls into view). */
  fetchEnabled?: boolean
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const PLACEHOLDER_COLUMNS: ColumnDef<DashboardTopTableFlatRow, unknown>[] = [
  {
    id: 'name',
    header: 'Name',
    size: 260,
    enableSorting: false,
    accessorFn: (row) => row.cells[0]?.formatted ?? '',
    cell: () => '',
  },
]

function coercePageSize(n: number): number {
  return PAGE_SIZE_OPTIONS.includes(n) ? n : 10
}

export function DashboardTopTable({
  title,
  groupBy,
  tableConfigKey,
  timeRange,
  timezone,
  dataVersion,
  pageSize,
  onPageSizeChange,
  fetchEnabled = true,
}: DashboardTopTableProps) {
  const setTableSorting = useTableConfigStore((s) => s.setSorting)
  const storedSorting = useTableConfigStore((s) => selectTableConfig(tableConfigKey)(s).sorting)
  const effectiveSorting: SortingState =
    storedSorting.length > 0 ? storedSorting : DEFAULT_TABLE_SORTING

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: coercePageSize(pageSize),
  })
  const reportRef = useRef<Report | null>(null)
  reportRef.current = report

  useEffect(() => {
    const next = coercePageSize(pageSize)
    setPagination((previous) => ({
      pageIndex: previous.pageSize === next ? previous.pageIndex : 0,
      pageSize: next,
    }))
  }, [pageSize])

  const fetchWidget = useCallback(async () => {
    void dataVersion
    setLoading(true)
    const sortParam = drilldownSortParamFromReport(effectiveSorting, reportRef.current?.columns ?? null)
    try {
      const data = await api.postDrilldown<Report>({
        timeRange,
        timeZone: { name: timezone },
        groupings: [{ groupBy, whitelistFilters: [], blacklistFilters: [] }],
        paging: {
          start: pagination.pageIndex * pagination.pageSize,
          length: pagination.pageSize,
        },
        sorting:
          sortParam ?? { sortingColumns: [{ columnName: 'Entrances', order: 'desc' }] },
        options: { viewType: 'flat' },
        ...(WIDGET_API_METRICS ? { metrics: WIDGET_API_METRICS } : {}),
      })
      setReport(data)
    } catch {
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [
    timeRange,
    timezone,
    groupBy,
    dataVersion,
    pagination.pageIndex,
    pagination.pageSize,
    effectiveSorting,
  ])

  useEffect(() => {
    if (!fetchEnabled) return
    void fetchWidget()
  }, [fetchEnabled, fetchWidget])

  const flatData = useMemo(() => (report ? reportRowsToFlatData(report) : []), [report])

  const columnDefs = useMemo(
    () => (report ? buildWidgetColumnDefs(report, groupBy) : PLACEHOLDER_COLUMNS),
    [report, groupBy],
  )

  const pinnedBottomRows = useMemo(() => {
    if (!report?.totals?.cells) return undefined
    const n = report.columns.length
    const cells = Array.from({ length: n }, (_, i) => report.totals.cells[i] ?? EMPTY_CELL)
    return [{ _id: 'totals', cells }]
  }, [report])

  const rowsTotal = report?.rowsTotal ?? 0
  const pageCount = Math.max(1, Math.ceil(rowsTotal / pagination.pageSize))

  const handleSortingChange = useCallback(
    (next: SortingState) => {
      setTableSorting(tableConfigKey, next)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    },
    [setTableSorting, tableConfigKey],
  )

  const showPagination = rowsTotal > pagination.pageSize

  const handlePaginationSizeSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const next = Number(event.target.value)
      onPageSizeChange?.(next)
      setPagination({ pageIndex: 0, pageSize: next })
    },
    [onPageSizeChange],
  )

  const handlePageIndex = useCallback((nextIndex: number) => {
    setPagination((p) => ({ ...p, pageIndex: nextIndex }))
  }, [])

  const totalPages = pageCount
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
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {showPagination ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              {`${pagination.pageIndex * pagination.pageSize + 1}–${Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                rowsTotal,
              )} of ${rowsTotal.toLocaleString()}`}
            </span>
            <select
              className="dt-page-size-select"
              value={pagination.pageSize}
              onChange={handlePaginationSizeSelect}
              aria-label={`${title} rows per page`}
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="dt-page-btn"
                disabled={currentPage <= 0}
                onClick={() => handlePageIndex(currentPage - 1)}
                aria-label="Previous page"
              >
                <Icon name="chevron-left" size="sm" />
              </button>
              {pageNumbers.map((pageOrEllipsis, ellipsisIndex) =>
                pageOrEllipsis === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${ellipsisIndex}`}
                    className="dt-page-btn"
                    style={{ border: 'none', cursor: 'default', opacity: 0.5 }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={pageOrEllipsis}
                    type="button"
                    className={`dt-page-btn${pageOrEllipsis === currentPage ? ' dt-page-btn--active' : ''}`}
                    onClick={() => handlePageIndex(pageOrEllipsis)}
                  >
                    {pageOrEllipsis + 1}
                  </button>
                ),
              )}
              <button
                type="button"
                className="dt-page-btn"
                disabled={currentPage >= totalPages - 1}
                onClick={() => handlePageIndex(currentPage + 1)}
                aria-label="Next page"
              >
                <Icon name="chevron-right" size="sm" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <DataTable<DashboardTopTableFlatRow>
        className="min-h-0 flex-1"
        maxHeight={280}
        data={flatData}
        columns={columnDefs}
        loading={!fetchEnabled || loading}
        getRowId={dashboardTopTableRowId}
        sorting={effectiveSorting}
        onSortingChange={handleSortingChange}
        manualSorting
        pagination={pagination}
        onPaginationChange={setPagination}
        manualPagination
        pageCount={pageCount}
        manualPaginationTotalRows={rowsTotal}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        pinnedBottomRows={pinnedBottomRows}
        tableConfigKey={tableConfigKey}
        defaultSorting={DEFAULT_TABLE_SORTING}
        emptyMessage="No data for the selected period."
        showPaginationFooter={false}
      />
    </div>
  )
}
