import { useState, useMemo, useCallback, useRef } from "react"
import type { ColumnDef, SortingState, ExpandedState, Table } from "@tanstack/react-table"
import { PageShell, EmptyState, DataTable } from "@/components/ui-kit"
import { buildColumnsFromReport } from "@/components/ui-kit/data-table"
import { DrilldownToolbar } from "@/components/drilldown/DrilldownToolbar"
import { useDrilldownReport } from "@/api/hooks"
import { api } from "@/api/client"
import { drilldownSortParamFromReport } from "@/lib/drilldownTableSort"
import { useTableConfigStore, selectTableConfig, DEFAULT_TABLE_SORTING } from "@/store/tableConfig"
import type { DrilldownRequest, Report, ReportCell } from "@/types/stats"

const DRILLDOWN_TREE_TABLE_KEY = "reports-drilldown-tree"

interface TreeRowData {
  _id: string
  cells: ReportCell[]
  depth: number
  _children?: TreeRowData[]
  _groupIds?: string[]
  _loaded?: boolean
}

function parseReportCells(row: Record<string, unknown>, columnCount: number): ReportCell[] {
  const cells: ReportCell[] = []
  for (let i = 0; i < columnCount; i++) {
    const cell = row[String(i)] as ReportCell | undefined
    cells.push(cell ?? { raw: "", formatted: "" })
  }
  return cells
}

function reportToTreeRows(report: Report, depth = 0): TreeRowData[] {
  return report.rows.map((row, index) => {
    const cells = parseReportCells(row, report.columns.length)
    const expandInfo = row.expandableInfo as { groupIds?: string[]; children?: Record<string, unknown>[] } | undefined

    const treeRow: TreeRowData = {
      _id: `row-${depth}-${index}-${String(cells[0]?.raw ?? index)}`,
      cells,
      depth,
      _groupIds: expandInfo?.groupIds,
      _loaded: false,
    }

    if (expandInfo?.children?.length) {
      treeRow._children = expandInfo.children.map((child, ci) => ({
        _id: `row-${depth + 1}-${index}-${ci}`,
        cells: parseReportCells(child, report.columns.length),
        depth: depth + 1,
        _loaded: true,
      }))
      treeRow._loaded = true
    }

    return treeRow
  })
}

export function DrilldownTreePage() {
  const drilldownMutation = useDrilldownReport()
  const setTableSorting = useTableConfigStore((s) => s.setSorting)
  const [report, setReport] = useState<Report | null>(null)
  const [treeData, setTreeData] = useState<TreeRowData[]>([])
  const [lastRequest, setLastRequest] = useState<DrilldownRequest | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 50
  const [sorting, setSorting] = useState<SortingState>(() => {
    const saved = selectTableConfig(DRILLDOWN_TREE_TABLE_KEY)(useTableConfigStore.getState()).sorting
    return saved.length > 0 ? saved : DEFAULT_TABLE_SORTING
  })
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const tableRef = useRef<Table<TreeRowData> | null>(null)

  const loadReport = useCallback(
    (request: DrilldownRequest) => {
      setLastRequest(request)
      drilldownMutation.mutate(request, {
        onSuccess: (data) => {
          setReport(data)
          setTreeData(reportToTreeRows(data))
          setExpanded({})
        },
      })
    },
    [drilldownMutation],
  )

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      setPage(0)
      loadReport({
        ...request,
        options: { viewType: "tree" },
        paging: { start: 0, length: pageSize },
        sorting: drilldownSortParamFromReport(sorting, report?.columns),
      })
    },
    [loadReport, pageSize, sorting, report?.columns],
  )

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      setTableSorting(DRILLDOWN_TREE_TABLE_KEY, newSorting)
      setPage(0)

      if (!lastRequest) return

      loadReport({
        ...lastRequest,
        sorting: drilldownSortParamFromReport(newSorting, report?.columns),
        paging: { start: 0, length: pageSize },
      })
    },
    [lastRequest, loadReport, pageSize, report?.columns, setTableSorting],
  )

  const handleExpandRow = useCallback(
    async (row: TreeRowData) => {
      if (row._loaded || row._children?.length) return
      if (!lastRequest || !row._groupIds?.length) return

      const groupings = lastRequest.groupings.slice(0, row.depth + 2)
      const topLevelFilters = row._groupIds.map((gid, i) => ({
        groupBy: lastRequest.groupings[row.depth + i]?.groupBy ?? '',
        whitelistFilters: [gid],
        blacklistFilters: [] as string[],
      }))

      const childReport = await api.post<Report>('/stats/reporting/drilldown/', {
        ...lastRequest,
        groupings,
        topLevelFilters,
        paging: { start: 0, length: 99999 },
      })

      const childRows = reportToTreeRows(childReport, row.depth + 1)

      setTreeData((prev) => {
        const clone = [...prev]
        const updateChildren = (rows: TreeRowData[]): TreeRowData[] =>
          rows.map((r) => {
            if (r._id === row._id) {
              return { ...r, _children: childRows, _loaded: true }
            }
            if (r._children) {
              return { ...r, _children: updateChildren(r._children) }
            }
            return r
          })
        return updateChildren(clone)
      })
    },
    [lastRequest],
  )

  const columnDefs: ColumnDef<TreeRowData, unknown>[] = useMemo(() => {
    if (!report) return []
    const groupingCol: ColumnDef<TreeRowData, unknown> = {
      id: 'name',
      header: report.columns[0]?.name ?? 'Name',
      accessorFn: (row: TreeRowData) => row.cells[0]?.formatted ?? '',
      enableSorting: true,
      size: 300,
      meta: { flex: 1 },
      cell: (info: { getValue: () => unknown }) => <span className="font-medium">{String(info.getValue())}</span>,
    }
    return [groupingCol, ...buildColumnsFromReport<TreeRowData>(report.columns)]
  }, [report])

  const pinnedBottomRows = useMemo(() => {
    if (!report?.totals?.cells) return undefined
    return [{
      _id: "totals",
      cells: report.totals.cells,
      depth: 0,
    }]
  }, [report])

  const getSubRows = useCallback((row: TreeRowData) => row._children, [])

  return (
    <PageShell title="Drilldown Report (Tree)" fillHeight>
      <DrilldownToolbar
        onApply={handleApply}
        isLoading={drilldownMutation.isPending}
        viewType="tree"
        paging={{ start: page * pageSize, length: pageSize }}
      />

      {report ? (
        <DataTable
          data={treeData}
          columns={columnDefs}
          loading={drilldownMutation.isPending}
          getRowId={(row) => row._id}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          manualSorting
          treeMode
          getSubRows={getSubRows}
          onExpandRow={handleExpandRow}
          expanded={expanded}
          onExpandedChange={setExpanded}
          pinnedBottomRows={pinnedBottomRows}
          tableRef={tableRef}
          noPagination
        />
      ) : (
        !drilldownMutation.isPending && (
          <EmptyState message="Select your groupings and date range, then click Apply to generate a report." />
        )
      )}
    </PageShell>
  )
}
