import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { api } from "@/api/client"
import { DataTable } from "@/components/ui-kit"
import { buildColumnsFromReport } from "@/components/ui-kit/data-table"
import { drilldownSortParamFromReport } from "@/lib/drilldownTableSort"
import { reportRowToCells } from "@/lib/reportRowCells"
import { DEFAULT_TABLE_SORTING, selectTableConfig, useTableConfigStore } from "@/store/tableConfig"
import type { ApiDateTimeRange, Report, ReportCell } from "@/types/stats"
import { metricsForColumnIds } from "@/lib/drilldownMetrics"

const EMPTY_CELL: ReportCell = { raw: "", formatted: "" }

/** Metric column ids (registry) in default dashboard top-table order. */
const WIDGET_METRIC_ORDER = [
  "visits",
  "landerClicks",
  "landerClickthroughRate",
  "offerViews",
  "conversionPerVisit",
  "cost",
  "revenue",
  "returnOnInvestment",
  "profitAndLoss",
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

function buildWidgetColumnDefs(report: Report): ColumnDef<DashboardTopTableFlatRow, unknown>[] {
  const groupingCol: ColumnDef<DashboardTopTableFlatRow, unknown> = {
    id: "name",
    header: report.columns[0]?.name ?? "Name",
    accessorFn: (row) => row.cells[0]?.formatted ?? "",
    enableSorting: true,
    size: 200,
    minSize: 120,
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
  /** When false, no drilldown request is sent (e.g. until the section scrolls into view). */
  fetchEnabled?: boolean
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const PLACEHOLDER_COLUMNS: ColumnDef<DashboardTopTableFlatRow, unknown>[] = [
  {
    id: "name",
    header: "Name",
    size: 200,
    enableSorting: false,
    accessorFn: (row) => row.cells[0]?.formatted ?? "",
    cell: () => "",
  },
]

export function DashboardTopTable({
  title,
  groupBy,
  tableConfigKey,
  timeRange,
  timezone,
  dataVersion,
  fetchEnabled = true,
}: DashboardTopTableProps) {
  const setTableSorting = useTableConfigStore((s) => s.setSorting)
  const storedSorting = useTableConfigStore((s) => selectTableConfig(tableConfigKey)(s).sorting)
  const effectiveSorting: SortingState =
    storedSorting.length > 0 ? storedSorting : DEFAULT_TABLE_SORTING

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const reportRef = useRef<Report | null>(null)
  reportRef.current = report

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
          sortParam ?? { sortingColumns: [{ columnName: "Entrances", order: "desc" }] },
        options: { viewType: "flat" },
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
    () => (report ? buildWidgetColumnDefs(report) : PLACEHOLDER_COLUMNS),
    [report],
  )

  const pinnedBottomRows = useMemo(() => {
    if (!report?.totals?.cells) return undefined
    const n = report.columns.length
    const cells = Array.from({ length: n }, (_, i) => report.totals.cells[i] ?? EMPTY_CELL)
    return [{ _id: "totals", cells }]
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

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <h3 className="shrink-0 text-sm font-medium text-foreground">{title}</h3>
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
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        pinnedBottomRows={pinnedBottomRows}
        tableConfigKey={tableConfigKey}
        defaultSorting={DEFAULT_TABLE_SORTING}
        emptyMessage="No data for the selected period."
      />
    </div>
  )
}
