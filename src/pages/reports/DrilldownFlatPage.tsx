import { useState, useMemo, useCallback, useRef } from "react"
import type { ColumnDef, SortingState, Table } from "@tanstack/react-table"
import { PageShell, EmptyState, DataTable } from "@/components/ui-kit"
import { buildColumnsFromReport } from "@/components/ui-kit/data-table"
import { DrilldownToolbar } from "@/components/drilldown/DrilldownToolbar"
import { useDrilldownReport } from "@/api/hooks"
import { drilldownSortParamFromReport } from "@/lib/drilldownTableSort"
import { useTableConfigStore, selectTableConfig, DEFAULT_TABLE_SORTING } from "@/store/tableConfig"
import { reportRowToCells } from "@/lib/reportRowCells"
import type { DrilldownRequest, Report, ReportCell } from "@/types/stats"

const DRILLDOWN_FLAT_TABLE_KEY = "reports-drilldown-flat"

interface FlatRowData {
  _id: string
  cells: ReportCell[]
}

function reportRowsToFlatData(report: Report): FlatRowData[] {
  return report.rows.map((row, index) => {
    const cells = reportRowToCells(row, report.columns.length)
    return {
      _id: `row-${index}-${String(cells[0]?.raw ?? index)}`,
      cells,
    }
  })
}

export function DrilldownFlatPage() {
  const drilldownMutation = useDrilldownReport()
  const setTableSorting = useTableConfigStore((s) => s.setSorting)
  const [report, setReport] = useState<Report | null>(null)
  const [lastRequest, setLastRequest] = useState<DrilldownRequest | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 100
  const [sorting, setSorting] = useState<SortingState>(() => {
    const saved = selectTableConfig(DRILLDOWN_FLAT_TABLE_KEY)(useTableConfigStore.getState()).sorting
    return saved.length > 0 ? saved : DEFAULT_TABLE_SORTING
  })
  const tableRef = useRef<Table<FlatRowData> | null>(null)

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      setPage(0)
      const sortParam = drilldownSortParamFromReport(sorting, report?.columns)
      const paginatedRequest: DrilldownRequest = {
        ...request,
        options: { viewType: "flat" },
        paging: { start: 0, length: pageSize },
        sorting: sortParam,
      }
      setLastRequest(paginatedRequest)
      drilldownMutation.mutate(paginatedRequest, {
        onSuccess: (data) => setReport(data),
      })
    },
    [pageSize, sorting, drilldownMutation, report?.columns],
  )

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      setTableSorting(DRILLDOWN_FLAT_TABLE_KEY, newSorting)
      setPage(0)

      if (!lastRequest) return

      const nextRequest: DrilldownRequest = {
        ...lastRequest,
        sorting: drilldownSortParamFromReport(newSorting, report?.columns),
        paging: { start: 0, length: pageSize },
      }
      setLastRequest(nextRequest)
      drilldownMutation.mutate(nextRequest, {
        onSuccess: (data) => setReport(data),
      })
    },
    [lastRequest, pageSize, drilldownMutation, report?.columns, setTableSorting],
  )

  const flatData = useMemo(
    () => (report ? reportRowsToFlatData(report) : []),
    [report],
  )

  const columnDefs: ColumnDef<FlatRowData, unknown>[] = useMemo(() => {
    if (!report) return []
    const groupingCol: ColumnDef<FlatRowData, unknown> = {
      id: 'name',
      header: report.columns[0]?.name ?? 'Name',
      accessorFn: (row: FlatRowData) => row.cells[0]?.formatted ?? '',
      enableSorting: true,
      size: 250,
      meta: { flex: 1 },
      cell: (info: { getValue: () => unknown }) => <span className="font-medium">{String(info.getValue())}</span>,
    }
    return [groupingCol, ...buildColumnsFromReport<FlatRowData>(report.columns)]
  }, [report])

  const pinnedBottomRows = useMemo(() => {
    if (!report?.totals?.cells) return undefined
    return [{
      _id: "totals",
      cells: report.totals.cells,
    }]
  }, [report])

  return (
    <PageShell title="Drilldown Report (Flat)" fillHeight>
      <DrilldownToolbar
        onApply={handleApply}
        isLoading={drilldownMutation.isPending}
        viewType="flat"
        paging={{ start: page * pageSize, length: pageSize }}
      />

      {report ? (
        <DataTable
          data={flatData}
          columns={columnDefs}
          loading={drilldownMutation.isPending}
          getRowId={(row) => row._id}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          manualSorting
          pinnedBottomRows={pinnedBottomRows}
          tableRef={tableRef}
        />
      ) : (
        !drilldownMutation.isPending && (
          <EmptyState message="Select your groupings and date range, then click Apply to generate a report." />
        )
      )}
    </PageShell>
  )
}
