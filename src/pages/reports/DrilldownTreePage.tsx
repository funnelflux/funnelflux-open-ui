import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import type { ColumnDef, SortingState, ExpandedState, Table } from "@tanstack/react-table"
import { PageShell, EmptyState } from "@/components/ui-kit"
import { DataTable } from "@/components/ui-kit/data-table"
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
import { useDrilldownReportQuery } from "@/api/hooks"
import { api } from "@/api/client"
import { drilldownSortParamFromReport } from "@/lib/drilldownTableSort"
import { useTableConfigStore, selectTableConfig, DEFAULT_TABLE_SORTING } from "@/store/tableConfig"
import { reportRowToCells } from "@/lib/reportRowCells"
import { metricsForColumnIds, visibleMetricColumnIdsFromHidden, withSortingMetricIds } from "@/lib/drilldownMetrics"
import { getErrorMessage } from "@/lib/utils"
import type {
  DrilldownRequest,
  Grouping,
  Report,
  ReportCell,
  ReportRow,
} from "@/types/stats"
import { isLastDrilldownGroupingDepth } from "@/pages/reports/drilldownTreeDepth"

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
  /** Lazy expand failed for this branch — surfaced in the tree instead of silent failure. */
  expandError?: string
  _loadMore?: {
    parentTreePath: string
    parentKey: string
    nextOffset: number
    groupings: Grouping[]
    depth: number
    ancestorKeys: string[]
  }
}

function drilldownTreeRowId(row: TreeRowData): string {
  return row._id
}

/** Stable string form of a cell raw for matching parent/child in nested drilldown trees. */
function groupingRawForMatch(raw: ReportCell["raw"] | undefined): string {
  if (raw === undefined || raw === null) return ""
  return typeof raw === "string" ? raw.trim() : String(raw)
}

/** Extract a non-empty, non-rollup grouping id from a row's first cell. */
function groupingKeyFromRaw(raw: ReportCell["raw"] | undefined): string | undefined {
  const s = groupingRawForMatch(raw)
  if (s === "" || s === "0") return undefined
  return s
}

function groupingMatchValues(value: ReportCell["raw"] | undefined): string[] {
  const normalized = groupingRawForMatch(value)
  if (normalized === "") return []
  const values = [normalized]
  const [, trackingValue] = normalized.split("$@$")
  if (trackingValue) {
    values.push(trackingValue)
    values.push(trackingValue.startsWith("$") ? trackingValue.slice(1) : trackingValue)
  }
  return values
}

function trackingFieldNameFromRaw(raw: ReportCell["raw"] | undefined): string | undefined {
  const normalized = groupingRawForMatch(raw)
  const separatorIndex = normalized.indexOf("$@$")
  if (separatorIndex <= 0) return undefined
  return normalized.slice(0, separatorIndex)
}

function trackingFieldIdForGrouping(
  request: DrilldownRequest | null,
  grouping: Grouping | undefined,
): string | undefined {
  if (!request || !grouping) return undefined
  return request.trackingFieldMappings?.[grouping.groupBy]?.id
}

function isFinalTrackingFieldRow(
  row: TreeRowData,
  request: DrilldownRequest | null,
  plan: Grouping[],
): boolean {
  const finalTrackingFieldId = trackingFieldIdForGrouping(request, plan[plan.length - 1])
  if (!finalTrackingFieldId) return false
  return trackingFieldNameFromRaw(row.cells[0]?.raw) === finalTrackingFieldId
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
    const childAncestorKeys = key ? [...ancestorKeys, key] : ancestorKeys
    const children = row.children?.length
      ? reportRowsToTreeRows(row.children, columnCount, depth + 1, treePath, childAncestorKeys)
      : undefined
    return {
      _id: `tr-${treePath}`,
      treePath,
      cells,
      depth,
      loaded: Boolean(children?.length),
      ancestorKeys,
      ...(children ? { children } : {}),
      ...(key ? { groupIds: [key] } : {}),
    }
  })
}

/** `cells[0]` identifies the node; tracking-field raws may differ before `$@$`. */
function firstGroupingCellMatchesKey(
  row: ReportRow,
  key: string,
  colCount: number,
): boolean {
  const keyValues = groupingMatchValues(key)
  if (keyValues.length === 0) return false
  const c = reportRowToCells(row, colCount)[0]
  if (!c) return false
  const cellValues = [
    ...groupingMatchValues(c.raw),
    ...(typeof c.formatted === "string" ? groupingMatchValues(c.formatted) : []),
  ]
  return keyValues.some((value) => cellValues.includes(value))
}

function nodeAtPath(
  roots: ReportRow[],
  path: string[],
  colCount: number,
): ReportRow | null {
  if (path.length === 0) return null

  let level = roots
  let matched: ReportRow | undefined
  for (let i = 0; i < path.length; i++) {
    const key = path[i]
    matched = level.find((r) => firstGroupingCellMatchesKey(r, key, colCount))
    if (!matched) return null
    if (i < path.length - 1) {
      level = matched.children ?? []
      if (level.length === 0) return null
    }
  }

  return matched ?? null
}

function nodeByKey(
  roots: ReportRow[],
  key: string,
  colCount: number,
): ReportRow | null {
  if (key === "") return null
  const queue: ReportRow[] = [...roots]
  for (let i = 0; i < queue.length; i++) {
    const r = queue[i]
    if (firstGroupingCellMatchesKey(r, key, colCount)) {
      return r
    }
    if (r.children?.length) queue.push(...r.children)
  }
  return null
}

/**
 * Rows to render under an expanded node. The API may return either:
 * - a nested tree containing the expanded node, or
 * - flat leaf rows for the next level.
 * Never return a nested response root as the child rows; that duplicates the parent label.
 */
function leafRowsForLazyExpand(report: Report, pathKeys: string[]): ReportRow[] {
  const colCount = report.columns.length
  const path = pathKeys.map((k) => groupingRawForMatch(k)).filter((k) => k !== "")
  if (path.length === 0) {
    return report.rows
  }

  for (let skip = 0; skip < path.length; skip++) {
    const suffix = path.slice(skip)
    const node = nodeAtPath(report.rows, suffix, colCount)
    if (node) {
      return node.children ?? []
    }
  }

  const lastKey = path[path.length - 1]
  const node = nodeByKey(report.rows, lastKey, colCount)
  if (node) {
    return node.children ?? []
  }

  const isFlatLeafResponse = report.rows.every((row) => !row.children?.length)
  return isFlatLeafResponse ? report.rows : []
}

function deepestRows(rows: ReportRow[]): ReportRow[] {
  const result: ReportRow[] = []
  rows.forEach((row) => {
    if (row.children?.length) {
      result.push(...deepestRows(row.children))
      return
    }
    result.push(row)
  })
  return result
}

function setRowExpandError(rows: TreeRowData[], treePath: string, message: string | null): TreeRowData[] {
  return rows.map((r) => {
    if (r.treePath === treePath) {
      if (!message) {
        const { expandError, ...rest } = r
        void expandError
        return rest as TreeRowData
      }
      return { ...r, expandError: message }
    }
    if (r.children?.length) {
      return { ...r, children: setRowExpandError(r.children, treePath, message) }
    }
    return r
  })
}

export function DrilldownTreePage() {
  const setTableSorting = useTableConfigStore((s) => s.setSorting)
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
  const expandRequestId = useRef(0)

  const {
    data: report,
    isLoading: reportLoading,
  } = useDrilldownReportQuery(lastRequest, Boolean(lastRequest))

  useEffect(() => {
    if (!lastRequest) {
      setTreeData([])
      setExpanded({})
      return
    }
    if (!report) return
    setTreeData(reportRowsToTreeRows(report.rows, report.columns.length, 0, "", []))
    setExpanded({})
  }, [lastRequest, report])

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      setPage(0)
      const full = request.groupings ?? []
      setPlanGroupings(full)
      /** Lazy load: fetch only the first grouping level; deeper levels load on expand. */
      const initialGroupings: Grouping[] = full.length > 0 ? [full[0]] : []
      const metrics = metricsForColumnIds(withSortingMetricIds(
        visibleMetricColumnIdsFromHidden(DRILLDOWN_TREE_TABLE_KEY, { defaultVisibleColumnIds: defaultColIds }),
        sorting,
      ))
      setLastRequest({
        ...request,
        options: { ...(request.options ?? {}), viewType: "tree" },
        groupings: initialGroupings,
        topLevelFilters: [],
        paging: { start: 0, length: pageSize },
        sorting: drilldownSortParamFromReport(sorting, report?.columns),
        ...(metrics ? { metrics } : {}),
      })
    },
    [pageSize, sorting, report?.columns],
  )

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      setTableSorting(DRILLDOWN_TREE_TABLE_KEY, newSorting)
      setPage(0)

      if (!lastRequest) return

      setLastRequest({
        ...lastRequest,
        sorting: drilldownSortParamFromReport(newSorting, report?.columns),
        paging: { start: 0, length: pageSize },
        ...(metricsForColumnIds(withSortingMetricIds(
          visibleMetricColumnIdsFromHidden(DRILLDOWN_TREE_TABLE_KEY, { defaultVisibleColumnIds: defaultColIds }),
          newSorting,
        )) ? {
          metrics: metricsForColumnIds(withSortingMetricIds(
            visibleMetricColumnIdsFromHidden(DRILLDOWN_TREE_TABLE_KEY, { defaultVisibleColumnIds: defaultColIds }),
            newSorting,
          )),
        } : { metrics: undefined }),
      })
    },
    [lastRequest, pageSize, report?.columns, setTableSorting],
  )

  const handleApplyColumns = useCallback((nextSelected: Set<string>) => {
    if (!lastRequest) return
    const metrics = metricsForColumnIds(withSortingMetricIds([...nextSelected], sorting))
    setLastRequest({
      ...lastRequest,
      paging: { start: 0, length: pageSize },
      ...(metrics ? { metrics } : { metrics: undefined }),
    })
  }, [lastRequest, pageSize, sorting])

  const handleExpandRow = useCallback(
    async (row: TreeRowData) => {
      if (!lastRequest) return

      if (row._loadMore) {
        const token = ++expandRequestId.current
        const { parentTreePath, parentKey, nextOffset, groupings, depth, ancestorKeys } = row._loadMore
        setTreeData((prev) => setRowExpandError(prev, parentTreePath, null))
        try {
          const childReport = await api.postDrilldown<Report>({
            ...lastRequest,
            groupings,
            topLevelFilters: [],
            paging: { start: nextOffset, length: CHILD_PAGE_SIZE },
          })
          if (token !== expandRequestId.current) return

          const leafRows = leafRowsForLazyExpand(childReport, ancestorKeys)
          const childTreeRows = reportRowsToTreeRows(
            leafRows,
            childReport.columns.length,
            depth,
            parentTreePath,
            ancestorKeys,
          )

          const hasMore = leafRows.length >= CHILD_PAGE_SIZE
          const loadMoreRow: TreeRowData | null = hasMore
            ? {
                _id: `load-more-${parentTreePath}-${nextOffset + CHILD_PAGE_SIZE}`,
                treePath: `${parentTreePath}-loadmore`,
                cells: [{ raw: '', formatted: `Load more rows...` }],
                depth,
                ancestorKeys,
                _loadMore: {
                  parentTreePath,
                  parentKey,
                  nextOffset: nextOffset + CHILD_PAGE_SIZE,
                  groupings,
                  depth,
                  ancestorKeys,
                },
              }
            : null

          setTreeData((prev) => {
            const appendChildren = (rows: TreeRowData[]): TreeRowData[] =>
              rows.map((r) => {
                if (r.treePath === parentTreePath) {
                  const { expandError, ...rest } = r
                  void expandError
                  const existingChildren = (rest.children ?? []).filter((c) => !c._loadMore)
                  const newChildren = [...existingChildren, ...childTreeRows]
                  if (loadMoreRow) newChildren.push(loadMoreRow)
                  return { ...rest, children: newChildren, loaded: !hasMore }
                }
                if (r.children?.length) {
                  return { ...r, children: appendChildren(r.children) }
                }
                return r
              })
            return appendChildren(prev)
          })
        } catch (err) {
          if (token !== expandRequestId.current) return
          setTreeData((prev) => setRowExpandError(prev, parentTreePath, getErrorMessage(err)))
        }
        return
      }

      if (row.children?.length) {
        setExpanded((prev) => {
          const base: Record<string, boolean> =
            prev === true || !prev ? {} : { ...(prev as Record<string, boolean>) }
          base[row._id] = true
          return base
        })
        return
      }
      if (row.loaded) return
      const plan = planGroupings
      if (plan.length === 0) return
      if (isFinalTrackingFieldRow(row, lastRequest, plan)) return
      const nextDepth = row.depth + 1
      if (isLastDrilldownGroupingDepth(row.depth, plan.length)) return
      const parentKey = row.groupIds?.[0]
      if (!parentKey) return

      const levelKeys: (string | undefined)[] = [...row.ancestorKeys, parentKey]
      const groupings: Grouping[] = plan.slice(0, nextDepth + 1).map((g, idx) => {
        const levelKey = levelKeys[idx]
        return {
          groupBy: g.groupBy,
          whitelistFilters: levelKey ? [levelKey] : [...(g.whitelistFilters ?? [])],
          blacklistFilters: [...(g.blacklistFilters ?? [])],
        }
      })

      const token = ++expandRequestId.current
      setTreeData((prev) => setRowExpandError(prev, row.treePath, null))
      try {
        const childReport = await api.postDrilldown<Report>({
          ...lastRequest,
          groupings,
          topLevelFilters: [],
          paging: { start: 0, length: CHILD_PAGE_SIZE },
        })
        if (token !== expandRequestId.current) return

        let leafRows = leafRowsForLazyExpand(childReport, [...row.ancestorKeys, parentKey])
        if (leafRows.length === 0 && isLastDrilldownGroupingDepth(nextDepth, plan.length)) {
          leafRows = deepestRows(childReport.rows)
        }
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
            _loadMore: {
              parentTreePath: row.treePath,
              parentKey,
              nextOffset: CHILD_PAGE_SIZE,
              groupings,
              depth: nextDepth,
              ancestorKeys: newAncestorKeys,
            },
          })
        }

        setTreeData((prev) => {
          const updateChildren = (rows: TreeRowData[]): TreeRowData[] =>
            rows.map((r) => {
              if (r.treePath === row.treePath) {
                const { expandError, ...rest } = r
                void expandError
                return { ...rest, children: childTreeRows, loaded: !hasMore }
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
      } catch (err) {
        if (token !== expandRequestId.current) return
        setTreeData((prev) => setRowExpandError(prev, row.treePath, getErrorMessage(err)))
      }
    },
    [lastRequest, planGroupings],
  )

  const canLazyExpandRow = useCallback(
    (row: TreeRowData) => {
      if (row._loadMore) return true
      if (planGroupings.length === 0) return false
      if (isFinalTrackingFieldRow(row, lastRequest, planGroupings)) return false
      if (isLastDrilldownGroupingDepth(row.depth, planGroupings.length)) return false
      if (row.loaded) return false
      if (row.children?.length) return false
      return Boolean(row.groupIds?.[0])
    },
    [lastRequest, planGroupings],
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
        if (row.expandError) {
          return <span className="text-xs text-destructive">{row.expandError}</span>
        }
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
      isLoading={reportLoading}
      viewType="tree"
      paging={{ start: page * pageSize, length: pageSize }}
    >
      <PageShell
        title="Drilldown Report (Tree)"
        fillHeight
        density="dense"
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
              onApply={handleApplyColumns}
            />
          ) : null}
          <DrilldownToolbarGroupings />
        </div>
        {report ? (
          <DataTable
            data={treeData}
            columns={columnDefs}
            loading={reportLoading}
            getRowId={drilldownTreeRowId}
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
          !reportLoading && (
            <EmptyState message="Select your groupings and date range, then click Apply to generate a report." />
          )
        )}
      </PageShell>
    </DrilldownToolbarProvider>
  )
}
