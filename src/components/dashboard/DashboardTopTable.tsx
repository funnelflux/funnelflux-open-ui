import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { api } from '@/api/client'
import { DataTable } from '@/components/ui-kit/data-table'
import { buildColumnsFromReport, buildDataTablePageTokens, DataTablePagination } from '@/components/ui-kit/data-table'
import { drilldownSortParamFromReport } from '@/lib/drilldownTableSort'
import { reportRowToCells } from '@/lib/reportRowCells'
import { friendlyDashboardGroupingColumnHeader } from '@/lib/dashboardLabels'
import { DEFAULT_TABLE_SORTING, selectTableConfig, useTableConfigStore } from '@/store/tableConfig'
import type { ApiDateTimeRange, Report, ReportCell } from '@/types/stats'
import { metricsForColumnIds } from '@/lib/drilldownMetrics'
import { Icon, type IconName } from '@/components/ui-kit/icons'
import { cn } from '@/lib/utils'

const EMPTY_CELL: ReportCell = { raw: '', formatted: '' }

/** Metric column ids (registry) in default dashboard top-table order. */
const WIDGET_METRIC_ORDER = [
  'visits',
  'landerClicks',
  'landerClickthroughRate',
  'offerViews',
  'cost',
  'revenue',
  'returnOnInvestment',
  'profitAndLoss',
] as const
const WIDGET_API_METRICS = metricsForColumnIds(WIDGET_METRIC_ORDER) ?? undefined

const TITLE_ICON_BY_GROUP = new Map<string, { icon: IconName; className: string }>([
  ['Element: Funnel', { icon: 'workflow', className: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300' }],
  ['Third Parties: Traffic Source', { icon: 'network', className: 'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300' }],
  ['Element: Lander', { icon: 'file-text', className: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300' }],
  ['Element: Offer', { icon: 'gift', className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' }],
])

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
    header: () => (
      <span className="font-semibold text-foreground">
        {friendlyDashboardGroupingColumnHeader(report.columns[0]?.name, groupBy)}
      </span>
    ),
    accessorFn: (row) => row.cells[0]?.formatted ?? '',
    enableSorting: true,
    size: 320,
    minSize: 180,
    maxSize: 680,
    meta: { flex: 1 },
    cell: (info: { getValue: () => unknown }) => (
      <span className="font-medium">{String(info.getValue())}</span>
    ),
  }

  const all = buildColumnsFromReport<DashboardTopTableFlatRow>(report.columns)
  const byId = new Map(all.map((c) => [String(c.id), c]))
  const metrics = WIDGET_METRIC_ORDER.flatMap((id) => {
    const col = byId.get(id)
    if (!col) return []
    const isRoi = id === 'returnOnInvestment'
    const isProfitAndLoss = id === 'profitAndLoss'
    const compactMetricColumn = {
      ...col,
      size: isRoi ? 100 : isProfitAndLoss ? 90 : 96,
      minSize: isRoi ? 90 : isProfitAndLoss ? 78 : 82,
      maxSize: isRoi ? 128 : isProfitAndLoss ? 118 : 132,
    }
    return [compactMetricColumn]
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
  /** When false, no drilldown request is sent (e.g. until the section scrolls into view). */
  fetchEnabled?: boolean
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100]
const DASHBOARD_TOP_TABLE_HEIGHT = 248

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
  return PAGE_SIZE_OPTIONS.includes(n) ? n : 5
}

export function DashboardTopTable({
  title,
  groupBy,
  tableConfigKey,
  timeRange,
  timezone,
  dataVersion,
  pageSize,
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
  const hasMultiplePages = rowsTotal > pagination.pageSize
  const showPagination = fetchEnabled && (rowsTotal > 0 || !loading)
  const totalPages = pageCount
  const currentPage = pagination.pageIndex

  const handleSortingChange = useCallback(
    (next: SortingState) => {
      setTableSorting(tableConfigKey, next)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    },
    [setTableSorting, tableConfigKey],
  )

  const handlePrevPage = useCallback(() => {
    setPagination((previous) => ({ ...previous, pageIndex: Math.max(0, previous.pageIndex - 1) }))
  }, [])

  const handleNextPage = useCallback(() => {
    setPagination((previous) => ({
      ...previous,
      pageIndex: Math.min(totalPages - 1, previous.pageIndex + 1),
    }))
  }, [totalPages])

  const handlePageIndexSelect = useCallback((nextIndex: number) => {
    setPagination((previous) => ({ ...previous, pageIndex: nextIndex }))
  }, [])

  const pageNumbers = useMemo(() => {
    return buildDataTablePageTokens(totalPages, currentPage)
  }, [totalPages, currentPage])

  const paginationRangeLabel = `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    rowsTotal,
  )} of ${rowsTotal.toLocaleString()}`
  const titleIcon = TITLE_ICON_BY_GROUP.get(groupBy) ?? { icon: 'bar-chart-3' as IconName, className: 'text-primary bg-primary/10' }

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-foreground">
          <span className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md', titleIcon.className)}>
            <Icon name={titleIcon.icon} size="sm" aria-hidden />
          </span>
          <span className="truncate">{title}</span>
        </h3>
        {showPagination ? (
          <DataTablePagination
            className="!border-t-0 !p-0 bg-transparent text-xs"
            rangeLabel={paginationRangeLabel}
            pageSize={pagination.pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            pageTokens={pageNumbers}
            currentPage={currentPage}
            canPreviousPage={currentPage > 0}
            canNextPage={currentPage < totalPages - 1}
            onPageSizeChange={() => {}}
            onPreviousPage={handlePrevPage}
            onNextPage={handleNextPage}
            onPageSelect={handlePageIndexSelect}
            showNavigation={hasMultiplePages}
            showPageSizeSelect={false}
            pageSizeAriaLabel={`${title} rows per page`}
          />
        ) : null}
      </div>
      <DataTable<DashboardTopTableFlatRow>
        className="dashboard-top-table-grid"
        height={DASHBOARD_TOP_TABLE_HEIGHT}
        maxHeight={DASHBOARD_TOP_TABLE_HEIGHT}
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
        loadingMinBodyHeight={216}
        loadingSkeletonRows={5}
        paginationPosition="none"
      />
    </div>
  )
}
