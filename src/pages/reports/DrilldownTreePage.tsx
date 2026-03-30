import { useState, useMemo, useCallback } from "react"
import { type ColumnDef, type ExpandedState, type OnChangeFn, type PaginationState, type SortingState } from "@tanstack/react-table"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { TreeDataTable } from "@/components/shared/TreeDataTable"
import { DrilldownToolbar } from "@/components/drilldown/DrilldownToolbar"
import { useDrilldownReport } from "@/api/hooks"
import type { DrilldownRequest, Report, ReportCell } from "@/types/stats"

interface TreeRowData {
  _id: string
  cells: ReportCell[]
  _hasChildren?: boolean
  subRows?: TreeRowData[]
  expandableInfo?: {
    groupIds: string[]
    children?: TreeRowData[]
  }
}

function reportRowsToTreeData(report: Report): TreeRowData[] {
  return report.rows.map((row, index) => {
    const cells: ReportCell[] = []
    // Rows use numeric string keys for cells
    for (let i = 0; i < report.columns.length; i++) {
      const cell = row[String(i)] as ReportCell | undefined
      cells.push(cell ?? { raw: "", formatted: "" })
    }

    const hasChildren = !!row.expandableInfo?.children?.length ||
      !!row.expandableInfo?.groupIds?.length

    return {
      _id: `row-${index}-${String(cells[0]?.raw ?? index)}`,
      cells,
      _hasChildren: hasChildren,
      expandableInfo: row.expandableInfo as TreeRowData["expandableInfo"],
      subRows: row.expandableInfo?.children?.map((child: Record<string, unknown>, childIdx: number) => {
        const childCells: ReportCell[] = []
        for (let i = 0; i < report.columns.length; i++) {
          const cell = (child as Record<string, unknown>)[String(i)] as ReportCell | undefined
          childCells.push(cell ?? { raw: "", formatted: "" })
        }
        return {
          _id: `row-${index}-child-${childIdx}`,
          cells: childCells,
          _hasChildren: false,
        }
      }),
    }
  })
}

export function DrilldownTreePage() {
  const drilldownMutation = useDrilldownReport()
  const [report, setReport] = useState<Report | null>(null)
  const [treeData, setTreeData] = useState<TreeRowData[]>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [lastRequest, setLastRequest] = useState<DrilldownRequest | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  const totalRows = report?.paging?.totalRecords ?? treeData.length

  const loadReport = useCallback(
    (request: DrilldownRequest) => {
      setLastRequest(request)
      drilldownMutation.mutate(request, {
        onSuccess: (data) => {
          setReport(data)
          setTreeData(reportRowsToTreeData(data))
        },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable
    [],
  )

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      setExpanded({})
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
      loadReport({
        ...request,
        options: { viewType: "tree" },
        paging: {
          start: 0,
          length: pagination.pageSize,
        },
      })
    },
    [loadReport, pagination.pageSize],
  )

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater
      setPagination(next)
      setExpanded({})

      if (lastRequest) {
        loadReport({
          ...lastRequest,
          paging: {
            start: next.pageIndex * next.pageSize,
            length: next.pageSize,
          },
        })
      }
    },
    [lastRequest, loadReport, pagination],
  )

  const setRowChildren = useCallback(
    (rows: TreeRowData[], rowId: string, children: TreeRowData[]): TreeRowData[] =>
      rows.map((row) => {
        if (row._id === rowId) {
          return { ...row, subRows: children }
        }
        if (!row.subRows?.length) {
          return row
        }
        return {
          ...row,
          subRows: setRowChildren(row.subRows, rowId, children),
        }
      }),
    [],
  )

  const columns: ColumnDef<TreeRowData, unknown>[] = useMemo(() => {
    if (!report) return []
    return report.columns.map((col, colIndex) => ({
      id: `col-${colIndex}`,
      header: col.name,
      accessorFn: (row: TreeRowData) => row.cells[colIndex]?.formatted ?? "",
      cell: ({ row }: { row: { original: TreeRowData } }) => {
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

  const handleSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater
      setSorting(nextSorting)

      if (!lastRequest) {
        return
      }

      const nextSort = nextSorting[0]
      setExpanded({})
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
      loadReport({
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
      })
    },
    [lastRequest, loadReport, pagination.pageSize, sorting],
  )

  const handleExpandRow = useCallback(
    async (rowId: string, row: TreeRowData) => {
      if (!lastRequest || !report) {
        return []
      }

      const depth = row.expandableInfo?.groupIds?.length
        ? row.expandableInfo.groupIds.length - 1
        : 0
      const currentGrouping = lastRequest.groupings[depth]?.groupBy
      const nextGrouping = lastRequest.groupings[depth + 1]

      if (!currentGrouping || !nextGrouping) {
        return []
      }

      const childRequest: DrilldownRequest = {
        ...lastRequest,
        groupings: [{ ...nextGrouping }],
        topLevelFilters: [
          ...(lastRequest.topLevelFilters ?? []),
          {
            groupBy: currentGrouping,
            whitelistFilters: [String(row.cells[depth]?.raw ?? "")],
            blacklistFilters: [],
          },
        ],
        paging: { start: 0, length: 99999 },
        options: { viewType: "tree" },
      }

      const childReport = await drilldownMutation.mutateAsync(childRequest)
      const childRows = reportRowsToTreeData({
        ...childReport,
        rows: childReport.rows ?? [],
      })

      setTreeData((currentRows) => setRowChildren(currentRows, rowId, childRows))
      return childRows
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutateAsync is stable
    [lastRequest, report, setRowChildren],
  )

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
      <PageHeader title="Drilldown Report (Tree)" />

      <DrilldownToolbar
        onApply={handleApply}
        isLoading={drilldownMutation.isPending}
        viewType="tree"
        paging={{
          start: pagination.pageIndex * pagination.pageSize,
          length: pagination.pageSize,
        }}
      />

      {report ? (
        <TreeDataTable
          columns={columns}
          data={treeData}
          isLoading={drilldownMutation.isPending}
          totalRows={totalRows}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          manualPagination
          manualSorting
          expanded={expanded}
          onExpandedChange={setExpanded}
          onExpandRow={handleExpandRow}
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
