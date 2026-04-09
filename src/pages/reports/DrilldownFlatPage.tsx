import { useState, useMemo, useCallback } from "react"
import type { ColDef, SortChangedEvent } from "ag-grid-community"
import { PageShell, EmptyState, DataGrid } from "@/components/ui-kit"
import { DrilldownToolbar } from "@/components/drilldown/DrilldownToolbar"
import { useDrilldownReport } from "@/api/hooks"
import type { DrilldownRequest, Report, ReportCell } from "@/types/stats"

interface FlatRowData {
  _id: string
  cells: ReportCell[]
}

function reportRowsToFlatData(report: Report): FlatRowData[] {
  return report.rows.map((row, index) => {
    const cells: ReportCell[] = []
    for (let i = 0; i < report.columns.length; i++) {
      const cell = row[String(i)] as ReportCell | undefined
      cells.push(cell ?? { raw: "", formatted: "" })
    }
    return {
      _id: `row-${index}-${String(cells[0]?.raw ?? index)}`,
      cells,
    }
  })
}

export function DrilldownFlatPage() {
  const drilldownMutation = useDrilldownReport()
  const [report, setReport] = useState<Report | null>(null)
  const [lastRequest, setLastRequest] = useState<DrilldownRequest | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 50
  const [sortColId, setSortColId] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      const sortParam = sortColId
        ? { column: Number(sortColId.replace("col-", "")), direction: sortDir }
        : undefined
      const paginatedRequest: DrilldownRequest = {
        ...request,
        options: { viewType: "flat" },
        paging: { start: page * pageSize, length: pageSize },
        sorting: sortParam,
      }
      setLastRequest(paginatedRequest)
      drilldownMutation.mutate(paginatedRequest, {
        onSuccess: (data) => setReport(data),
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, sortColId, sortDir],
  )

  const handleSortChanged = useCallback(
    (e: SortChangedEvent) => {
      const colState = e.api.getColumnState().find((c) => c.sort)
      const newSortColId = colState?.colId ?? null
      const newSortDir = (colState?.sort ?? "asc") as "asc" | "desc"
      setSortColId(newSortColId)
      setSortDir(newSortDir)
      setPage(0)

      if (!lastRequest) return

      const nextRequest: DrilldownRequest = {
        ...lastRequest,
        sorting: newSortColId
          ? { column: Number(newSortColId.replace("col-", "")), direction: newSortDir }
          : undefined,
        paging: { start: 0, length: pageSize },
      }
      setLastRequest(nextRequest)
      drilldownMutation.mutate(nextRequest, {
        onSuccess: (data) => setReport(data),
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastRequest, pageSize],
  )

  const flatData = useMemo(
    () => (report ? reportRowsToFlatData(report) : []),
    [report],
  )

  const columnDefs: ColDef[] = useMemo(() => {
    if (!report) return []
    return report.columns.map((col, colIndex) => ({
      colId: `col-${colIndex}`,
      headerName: col.name,
      valueGetter: (p: { data: FlatRowData }) => p.data?.cells[colIndex]?.formatted ?? "",
      cellClass: colIndex === 0 ? "font-medium" : undefined,
      cellStyle: colIndex > 0 ? { fontVariantNumeric: "tabular-nums" } : undefined,
      sortable: colIndex > 0,
      flex: colIndex === 0 ? 1 : undefined,
      width: colIndex > 0 ? 110 : undefined,
    }))
  }, [report])

  const pinnedBottomRowData = useMemo(() => {
    if (!report?.totals?.cells) return undefined
    return [{
      _id: "totals",
      cells: report.totals.cells,
    }]
  }, [report])

  return (
    <PageShell title="Drilldown Report (Flat)">
      <DrilldownToolbar
        onApply={handleApply}
        isLoading={drilldownMutation.isPending}
        viewType="flat"
        paging={{ start: page * pageSize, length: pageSize }}
      />

      {report ? (
        <DataGrid
          rowData={flatData}
          columnDefs={columnDefs}
          loading={drilldownMutation.isPending}
          getRowId={(params) => params.data._id}
          onSortChanged={handleSortChanged}
          pinnedBottomRowData={pinnedBottomRowData}
        />
      ) : (
        !drilldownMutation.isPending && (
          <EmptyState message="Select your groupings and date range, then click Apply to generate a report." />
        )
      )}
    </PageShell>
  )
}
