import { useState, useMemo, useCallback, useRef } from "react"
import type { ColumnDef, SortingState, ExpandedState, Table } from "@tanstack/react-table"
import { PageShell, EmptyState, DataTable } from "@/components/ui-kit"
import { buildColumnsFromReport } from "@/components/ui-kit/data-table"
import { ColumnChooser } from "@/components/shared/ColumnChooser"
import { defaultColIds } from "@/lib/entityPageDefaultColIds"
import { useEntityGridColumnVisibility } from "@/lib/entityGridColumnVisibility"
import {
  DrilldownToolbarProvider,
  DrilldownToolbarHeaderFilters,
  DrilldownToolbarReportActions,
  DrilldownToolbarGroupings,
} from "@/components/drilldown/DrilldownToolbar"
import { useDrilldownReport } from "@/api/hooks"
import { api } from "@/api/client"
import { drilldownSortParamFromReport } from "@/lib/drilldownTableSort"
import { useTableConfigStore, selectTableConfig, DEFAULT_TABLE_SORTING } from "@/store/tableConfig"
import { reportRowToCells } from "@/lib/reportRowCells"
import type {
  DrilldownRequest,
  Grouping,
  Report,
  ReportCell,
  ReportRow,
} from "@/types/stats"

const DRILLDOWN_TREE_TABLE_KEY = "reports-drilldown-tree"
const CHILD_PAGE_SIZE = 500

interface TreeRowData {
  _id: string
  treePath: string
  cells: ReportCell[]
  depth: number
  groupIds?: string[]
  ancestorKeys: string[]
  children?: TreeRowData[]
  loaded?: boolean
  _loadMore?: {
    parentTreePath: string
    parentKey: string
    nextOffset: number
    groupings: Grouping[]
    depth: number
    ancestorKeys: string[]
  }
}

/** Extract a non-empty, non-rollup grouping id from a row's first cell. */
function groupingKeyFromRaw(raw: ReportCell["raw"] | undefined): string | undefined {
  if (raw === undefined || raw === null) return undefined
  const s = typeof raw === "string" ? raw.trim() : String(raw)
  if (s === "" || s === "0") return undefined
  return s
}

function reportRowsToTreeRows(
  rows: ReportRow[],
  columnCount: number,
  depth: number,
  parentTreePath: string,
  ancestorKeys: string[],
): TreeRowData[] {
  return rows.map((row, index) => {
    const cells = reportRowToCells(row, columnCount)
    const treePath = parentTreePath === "" ? String(index) : `${parentTreePath}-${index}`
    const key = groupingKeyFromRaw(cells[0]?.raw)
    return {
      _id: `tr-${treePath}`,
      treePath,
      cells,
      depth,
      loaded: false,
      ancestorKeys,
      ...(key ? { groupIds: [key] } : {}),
    }
  })
}

/**
 * Lazy expand returns a nested tree reflecting all ancestor groupings. Walk the tree and return
 * the children of the row whose first-cell id matches `parentGroupId` (the expanded row).
 */
function leafRowsForLazyExpand(
  report: Report,
  parentGroupId: string | undefined,
): ReportRow[] {
  const colCount = report.columns.length
  const cell0 = (r: ReportRow) => {
    const raw = reportRowToCells(r, colCount)[0]?.raw
    return raw === undefined || raw === null ? "" : String(raw)
  }

  if (parentGroupId) {
    const stack: ReportRow[] = [...report.rows]
    while (stack.length) {
      const r = stack.shift()!
      if (cell0(r) === parentGroupId && r.children?.length) {
        return r.children
      }
      if (r.children?.length) stack.push(...r.children)
    }
  }

  const firstNonRollupWithKids = report.rows.find(
    (r) => r.children?.length && cell0(r) !== "" && cell0(r) !== "0",
  )
  if (firstNonRollupWithKids?.children?.length) return firstNonRollupWithKids.children

  if (report.rows.length === 1 && report.rows[0].children?.length) {
    return report.rows[0].children
  }

  /** No nested tree — assume the API returned flat leaves at the requested level. */
  return report.rows
}

export function DrilldownTreePage() {
  const drilldownMutation = useDrilldownReport()
  const setTableSorting = useTableConfigStore((s) => s.setSorting)
  const [report, setReport] = useState<Report | null>(null)
  const [treeData, setTreeData] = useState<TreeRowData[]>([])
  const [lastRequest, setLastRequest] = useState<DrilldownRequest | null>(null)
  /** Full grouping stack from the toolbar (all levels); initial request uses only the first. */
  const [planGroupings, setPlanGroupings] = useState<Grouping[]>([])
  const [page, setPage] = useState(0)
  const pageSize = 100
  const [sorting, setSorting] = useState<SortingState>(() => {
    const saved = selectTableConfig(DRILLDOWN_TREE_TABLE_KEY)(useTableConfigStore.getState()).sorting
    return saved.length > 0 ? saved : DEFAULT_TABLE_SORTING
  })
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const tableRef = useRef<Table<TreeRowData> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<TreeRowData> | null>(null)

  const runRequest = useCallback(
    (request: DrilldownRequest) => {
      setLastRequest(request)
      drilldownMutation.mutate(request, {
        onSuccess: (data) => {
          setReport(data)
          setTreeData(
            reportRowsToTreeRows(data.rows, data.columns.length, 0, "", []),
          )
          setExpanded({})
        },
      })
    },
    [drilldownMutation],
  )

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      setPage(0)
      const full = request.groupings ?? []
      setPlanGroupings(full)
      /** Lazy load: fetch only the first grouping level; deeper levels load on expand. */
      const initialGroupings: Grouping[] = full.length > 0 ? [full[0]] : []
      runRequest({
        ...request,
        options: { ...(request.options ?? {}), viewType: "tree" },
        groupings: initialGroupings,
        topLevelFilters: [],
        paging: { start: 0, length: pageSize },
        sorting: drilldownSortParamFromReport(sorting, report?.columns),
      })
    },
    [runRequest, pageSize, sorting, report?.columns],
  )

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      setTableSorting(DRILLDOWN_TREE_TABLE_KEY, newSorting)
      setPage(0)

      if (!lastRequest) return

      runRequest({
        ...lastRequest,
        sorting: drilldownSortParamFromReport(newSorting, report?.columns),
        paging: { start: 0, length: pageSize },
      })
    },
    [lastRequest, runRequest, pageSize, report?.columns, setTableSorting],
  )

  const handleExpandRow = useCallback(
    async (row: TreeRowData) => {
      if (!lastRequest) return

      if (row._loadMore) {
        const { parentTreePath, parentKey, nextOffset, groupings, depth, ancestorKeys } = row._loadMore
        const childReport = await api.post<Report>("/stats/reporting/drilldown/", {
          ...lastRequest,
          groupings,
          topLevelFilters: [],
          paging: { start: nextOffset, length: CHILD_PAGE_SIZE },
        })

        const leafRows = leafRowsForLazyExpand(childReport, parentKey)
        const childTreeRows = reportRowsToTreeRows(
          leafRows,
          childReport.columns.length,
          depth,
          parentTreePath,
          ancestorKeys,
        )

        const hasMore = leafRows.length >= CHILD_PAGE_SIZE
        const loadMoreRow: TreeRowData | null = hasMore ? {
          _id: `load-more-${parentTreePath}-${nextOffset + CHILD_PAGE_SIZE}`,
          treePath: `${parentTreePath}-loadmore`,
          cells: [{ raw: '', formatted: `Load more rows...` }],
          depth,
          ancestorKeys,
          _loadMore: { parentTreePath, parentKey, nextOffset: nextOffset + CHILD_PAGE_SIZE, groupings, depth, ancestorKeys },
        } : null

        setTreeData((prev) => {
          const appendChildren = (rows: TreeRowData[]): TreeRowData[] =>
            rows.map((r) => {
              if (r.treePath === parentTreePath) {
                const existingChildren = (r.children ?? []).filter((c) => !c._loadMore)
                const newChildren = [...existingChildren, ...childTreeRows]
                if (loadMoreRow) newChildren.push(loadMoreRow)
                return { ...r, children: newChildren, loaded: !hasMore }
              }
              if (r.children?.length) {
                return { ...r, children: appendChildren(r.children) }
              }
              return r
            })
          return appendChildren(prev)
        })
        return
      }

      if (row.loaded || row.children?.length) return
      const plan = planGroupings
      if (plan.length === 0) return
      const nextDepth = row.depth + 1
      if (nextDepth >= plan.length) return
      const parentKey = row.groupIds?.[0]
      if (!parentKey) return

      const levelKeys: (string | undefined)[] = [...row.ancestorKeys, parentKey]
      const groupings: Grouping[] = plan.slice(0, nextDepth + 1).map((g, idx) => {
        const levelKey = levelKeys[idx]
        return {
          groupBy: g.groupBy,
          whitelistFilters: levelKey
            ? [levelKey]
            : [...(g.whitelistFilters ?? [])],
          blacklistFilters: [...(g.blacklistFilters ?? [])],
        }
      })

      const childReport = await api.post<Report>("/stats/reporting/drilldown/", {
        ...lastRequest,
        groupings,
        topLevelFilters: [],
        paging: { start: 0, length: CHILD_PAGE_SIZE },
      })

      const leafRows = leafRowsForLazyExpand(childReport, parentKey)
      const newAncestorKeys = [...row.ancestorKeys, parentKey]
      const childTreeRows = reportRowsToTreeRows(
        leafRows,
        childReport.columns.length,
        nextDepth,
        row.treePath,
        newAncestorKeys,
      )

      const hasMore = leafRows.length >= CHILD_PAGE_SIZE
      if (hasMore) {
        childTreeRows.push({
          _id: `load-more-${row.treePath}-${CHILD_PAGE_SIZE}`,
          treePath: `${row.treePath}-loadmore`,
          cells: [{ raw: '', formatted: `Load more rows...` }],
          depth: nextDepth,
          ancestorKeys: newAncestorKeys,
          _loadMore: { parentTreePath: row.treePath, parentKey, nextOffset: CHILD_PAGE_SIZE, groupings, depth: nextDepth, ancestorKeys: newAncestorKeys },
        })
      }

      setTreeData((prev) => {
        const updateChildren = (rows: TreeRowData[]): TreeRowData[] =>
          rows.map((r) => {
            if (r.treePath === row.treePath) {
              return { ...r, children: childTreeRows, loaded: !hasMore }
            }
            if (r.children?.length) {
              return { ...r, children: updateChildren(r.children) }
            }
            return r
          })
        return updateChildren(prev)
      })
      setExpanded((prev) => {
        const base: Record<string, boolean> =
          prev === true || !prev ? {} : { ...(prev as Record<string, boolean>) }
        base[row._id] = true
        return base
      })
    },
    [lastRequest, planGroupings],
  )

  const canLazyExpandRow = useCallback(
    (row: TreeRowData) => {
      if (row._loadMore) return true
      if (planGroupings.length === 0) return false
      if (row.depth + 1 >= planGroupings.length) return false
      if (row.loaded) return false
      if (row.children?.length) return false
      return Boolean(row.groupIds?.[0])
    },
    [planGroupings],
  )

  const columnDefs: ColumnDef<TreeRowData, unknown>[] = useMemo(() => {
    if (!report) return []
    const groupingCol: ColumnDef<TreeRowData, unknown> = {
      id: "name",
      header: "Name",
      accessorFn: (row: TreeRowData) => row.cells[0]?.formatted ?? "",
      enableSorting: true,
      size: 300,
      meta: { flex: 1 },
      cell: (info) => {
        const row = info.row.original
        if (row._loadMore) {
          return <span className="text-primary text-xs cursor-pointer">Load more rows...</span>
        }
        return <span className="font-medium">{String(info.getValue())}</span>
      },
    }
    return [groupingCol, ...buildColumnsFromReport<TreeRowData>(report.columns)]
  }, [report])

  const gridColumnVisibility = useEntityGridColumnVisibility(
    columnDefs as ColumnDef<unknown, unknown>[],
    DRILLDOWN_TREE_TABLE_KEY,
    { defaultVisibleColumnIds: defaultColIds },
  )

  const pinnedBottomRows = useMemo(() => {
    if (!report?.totals?.cells) return undefined
    return [
      {
        _id: "totals",
        treePath: "totals",
        cells: report.totals.cells,
        depth: 0,
      },
    ] as TreeRowData[]
  }, [report])

  const getSubRows = useCallback((row: TreeRowData) => row.children, [])

  return (
    <DrilldownToolbarProvider
      onApply={handleApply}
      isLoading={drilldownMutation.isPending}
      viewType="tree"
      paging={{ start: page * pageSize, length: pageSize }}
    >
      <PageShell
        title="Drilldown Report (Tree)"
        fillHeight
        className="gap-3"
        actions={<DrilldownToolbarHeaderFilters />}
      >
        <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-2 w-full shrink-0">
          <DrilldownToolbarReportActions />
          {tableForChooser && report ? (
            <ColumnChooser
              columns={columnDefs}
              table={tableForChooser}
              storageKey={DRILLDOWN_TREE_TABLE_KEY}
              defaultVisibleColumnIds={defaultColIds}
              selectedCols={gridColumnVisibility.selectedCols}
              onColumnsChange={gridColumnVisibility.onColumnsChange}
            />
          ) : null}
          <DrilldownToolbarGroupings />
        </div>
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
            canLazyExpandRow={canLazyExpandRow}
            expanded={expanded}
            onExpandedChange={setExpanded}
            pinnedBottomRows={pinnedBottomRows}
            tableRef={tableRef}
            onTableInstance={setTableForChooser}
            columnVisibility={gridColumnVisibility.columnVisibility}
            onColumnVisibilityChange={gridColumnVisibility.onColumnVisibilityChange}
          />
        ) : (
          !drilldownMutation.isPending && (
            <EmptyState message="Select your groupings and date range, then click Apply to generate a report." />
          )
        )}
      </PageShell>
    </DrilldownToolbarProvider>
  )
}
