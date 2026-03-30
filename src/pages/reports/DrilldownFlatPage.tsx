import { useState, useMemo, useCallback } from "react"
import { type ColumnDef, type OnChangeFn, type PaginationState, type SortingState } from "@tanstack/react-table"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { DataTable } from "@/components/shared/DataTable"
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      const paginatedRequest: DrilldownRequest = {
        ...request,
        options: { viewType: "flat" },
        paging: {
          start: pagination.pageIndex * pagination.pageSize,
          length: pagination.pageSize,
        },
        sorting: sorting[0]
          ? {
              column: Number(String(sorting[0].id).replace("col-", "")),
              direction: sorting[0].desc ? "desc" : "asc",
            }
          : undefined,
      }
      setLastRequest(paginatedRequest)
      drilldownMutation.mutate(paginatedRequest, {
        onSuccess: (data) => setReport(data),
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable
    [pagination, sorting],
  )

  // Re-fetch when pagination changes and we have a previous request
  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const nextPagination =
        typeof updater === "function" ? updater(pagination) : updater
      setPagination(nextPagination)

      if (lastRequest) {
        const paginatedRequest: DrilldownRequest = {
          ...lastRequest,
          paging: {
            start: nextPagination.pageIndex * nextPagination.pageSize,
            length: nextPagination.pageSize,
          },
        }
        drilldownMutation.mutate(paginatedRequest, {
          onSuccess: (data) => setReport(data),
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable
    [lastRequest, pagination],
  )

  const handleSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater
      setSorting(nextSorting)

      if (!lastRequest) {
        return
      }

      const nextSort = nextSorting[0]
      const nextRequest: DrilldownRequest = {
        ...lastRequest,
        sorting: nextSort
          ? {
              column: Number(String(nextSort.id).replace("col-", "")),
              direction: nextSort.desc ? "desc" : "asc",
            }
          : undefined,
        paging: {
          start: 0,
          length: pagination.pageSize,
        },
      }

      setPagination((current) => ({ ...current, pageIndex: 0 }))
      setLastRequest(nextRequest)
      drilldownMutation.mutate(nextRequest, {
        onSuccess: (data) => setReport(data),
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable
    [lastRequest, pagination.pageSize, sorting],
  )

  const flatData = useMemo(
    () => (report ? reportRowsToFlatData(report) : []),
    [report],
  )

  const totalRows = report?.paging?.totalRecords ?? flatData.length

  const columns: ColumnDef<FlatRowData, unknown>[] = useMemo(() => {
    if (!report) return []
    return report.columns.map((col, colIndex) => ({
      id: `col-${colIndex}`,
      header: col.name,
      accessorFn: (row: FlatRowData) => row.cells[colIndex]?.formatted ?? "",
      cell: ({ row }: { row: { original: FlatRowData } }) => {
        const cell = row.original.cells[colIndex]
        return (
          <span className={colIndex === 0 ? "font-medium" : "tabular-nums"}>
            {cell?.formatted ?? ""}
          </span>
        )
      },
      enableSorting: colIndex > 0,
    }))
  }, [report])

  const totalsRow = useMemo(() => {
    if (!report?.totals?.cells) return undefined
    const row: Record<string, React.ReactNode> = {}
    report.columns.forEach((_, colIndex) => {
      const cell = report.totals.cells[colIndex]
      row[`col-${colIndex}`] = colIndex === 0
        ? <span className="font-semibold">Totals</span>
        : <span className="tabular-nums">{cell?.formatted ?? ""}</span>
    })
    return row
  }, [report])

  return (
    <div className="space-y-4">
      <PageHeader title="Drilldown Report (Flat)" />

      <DrilldownToolbar
        onApply={handleApply}
        isLoading={drilldownMutation.isPending}
        viewType="flat"
        paging={{
          start: pagination.pageIndex * pagination.pageSize,
          length: pagination.pageSize,
        }}
      />

      {report ? (
        <DataTable
          columns={columns}
          data={flatData}
          isLoading={drilldownMutation.isPending}
          totalRows={totalRows}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          manualPagination
          manualSorting
          totalsRow={totalsRow}
          getRowId={(row) => row._id}
        />
      ) : (
        !drilldownMutation.isPending && (
          <EmptyState message="Select your groupings and date range, then click Apply to generate a report." />
        )
      )}
    </div>
  )
}
