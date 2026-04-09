import { useState, useMemo, useCallback } from "react"
import type { ColDef, SortChangedEvent } from "ag-grid-community"
import { PageShell, EmptyState, DataGrid } from "@/components/ui-kit"
import { DrilldownToolbar } from "@/components/drilldown/DrilldownToolbar"
import { useDrilldownReport } from "@/api/hooks"
import type { DrilldownRequest, Report, ReportCell } from "@/types/stats"

interface TreeRowData {
  _id: string
  cells: ReportCell[]
  depth: number
  expandableInfo?: {
    groupIds: string[]
    children?: TreeRowData[]
  }
}

function reportRowsToFlatList(report: Report, depth = 0): TreeRowData[] {
  const result: TreeRowData[] = []
  for (let index = 0; index < report.rows.length; index++) {
    const row = report.rows[index]
    const cells: ReportCell[] = []
    for (let i = 0; i < report.columns.length; i++) {
      const cell = row[String(i)] as ReportCell | undefined
      cells.push(cell ?? { raw: "", formatted: "" })
    }
    result.push({
      _id: `row-${depth}-${index}-${String(cells[0]?.raw ?? index)}`,
      cells,
      depth,
      expandableInfo: row.expandableInfo as TreeRowData["expandableInfo"],
    })

    // Flatten children inline
    if (row.expandableInfo?.children) {
      for (let childIdx = 0; childIdx < row.expandableInfo.children.length; childIdx++) {
        const child = row.expandableInfo.children[childIdx] as Record<string, unknown>
        const childCells: ReportCell[] = []
        for (let i = 0; i < report.columns.length; i++) {
          const cell = child[String(i)] as ReportCell | undefined
          childCells.push(cell ?? { raw: "", formatted: "" })
        }
        result.push({
          _id: `row-${depth}-${index}-child-${childIdx}`,
          cells: childCells,
          depth: depth + 1,
        })
      }
    }
  }
  return result
}

export function DrilldownTreePage() {
  const drilldownMutation = useDrilldownReport()
  const [report, setReport] = useState<Report | null>(null)
  const [treeData, setTreeData] = useState<TreeRowData[]>([])
  const [lastRequest, setLastRequest] = useState<DrilldownRequest | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 50

  const loadReport = useCallback(
    (request: DrilldownRequest) => {
      setLastRequest(request)
      drilldownMutation.mutate(request, {
        onSuccess: (data) => {
          setReport(data)
          setTreeData(reportRowsToFlatList(data))
        },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      setPage(0)
      loadReport({
        ...request,
        options: { viewType: "tree" },
        paging: { start: 0, length: pageSize },
      })
    },
    [loadReport, pageSize],
  )

  const handleSortChanged = useCallback(
    (e: SortChangedEvent) => {
      const colState = e.api.getColumnState().find((c) => c.sort)
      const newSortColId = colState?.colId ?? null
      const newSortDir = (colState?.sort ?? "asc") as "asc" | "desc"
      setPage(0)

      if (!lastRequest) return

      loadReport({
        ...lastRequest,
        sorting: newSortColId
          ? { column: Number(newSortColId.replace("col-", "")), direction: newSortDir }
          : undefined,
        paging: { start: 0, length: pageSize },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastRequest, loadReport, pageSize],
  )

  const columnDefs: ColDef[] = useMemo(() => {
    if (!report) return []
    return report.columns.map((col, colIndex) => ({
      colId: `col-${colIndex}`,
      headerName: col.name,
      valueGetter: (p: { data: TreeRowData }) => p.data?.cells[colIndex]?.formatted ?? "",
      cellRenderer: colIndex === 0
        ? (params: { data: TreeRowData }) => {
            const row = params.data
            if (!row) return ""
            const indent = row.depth * 1.5
            return (
              <span style={{ paddingLeft: `${indent}rem` }} className="font-medium">
                {row.cells[0]?.formatted ?? ""}
              </span>
            )
          }
        : undefined,
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
      depth: 0,
    }]
  }, [report])

  return (
    <PageShell title="Drilldown Report (Tree)">
      <DrilldownToolbar
        onApply={handleApply}
        isLoading={drilldownMutation.isPending}
        viewType="tree"
        paging={{ start: page * pageSize, length: pageSize }}
      />

      {report ? (
        <DataGrid
          rowData={treeData}
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
