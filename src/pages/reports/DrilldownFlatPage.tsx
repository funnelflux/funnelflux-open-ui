import { useState, useMemo, useCallback, useRef } from "react"
import type { ColumnDef, SortingState, Table } from "@tanstack/react-table"
import { PageShell, EmptyState } from "@/components/ui-kit"
import { DataTable } from "@/components/ui-kit/data-table"
import { buildColumnsFromReport, countLeadingGroupingColumns } from "@/components/ui-kit/data-table"
import { ColumnChooser } from "@/components/shared/ColumnChooser"
import { defaultColIds } from "@/lib/entity-table/columns/defaultColIds"
import { useEntityGridColumnVisibility } from "@/lib/entity-table/columns/visibility"
import { usePersistedColumnSizing } from "@/lib/entity-table/usePersistedColumnSizing"
import {
  DrilldownToolbarProvider,
  DrilldownToolbarHeaderFilters,
  DrilldownToolbarReportActions,
  DrilldownToolbarConfigPanel,
} from "@/components/drilldown/DrilldownToolbar"
import { useDrilldownReportQuery } from "@/api/hooks"
import { drilldownSortParamFromReport } from "@/lib/drilldownTableSort"
import { useTableConfigStore, selectTableConfig, DEFAULT_TABLE_SORTING } from "@/store/tableConfig"
import { reportRowToCells } from "@/lib/reportRowCells"
import { drilldownGroupingShortLabel } from "@/lib/drilldownGroupings"
import { metricsForColumnIds, visibleMetricColumnIdsFromHidden, withSortingMetricIds } from "@/lib/drilldownMetrics"
import type { DrilldownRequest, Report, ReportCell } from "@/types/stats"

const DRILLDOWN_FLAT_TABLE_KEY = "reports-drilldown-flat"

interface FlatRowData {
  _id: string
  cells: ReportCell[]
}

function drilldownFlatRowId(row: FlatRowData): string {
  return row._id
}

function drilldownFlatGroupingCell(info: { getValue: () => unknown }) {
  return <span className="font-medium">{String(info.getValue())}</span>
}

function reportRowsToFlatData(report: Report): FlatRowData[] {
  const leading = countLeadingGroupingColumns(report.columns)
  return report.rows.map((row, index) => {
    const cells = reportRowToCells(row, report.columns.length)
    const fallbackKey = cells
      .slice(0, Math.max(leading, 1))
      .map((c) => String(c?.raw ?? ""))
      .join("|")
    return {
      _id: row.rowId || `row-${index}-${fallbackKey}`,
      cells,
    }
  })
}

export function DrilldownFlatPage() {
  const setTableSorting = useTableConfigStore((s) => s.setSorting)
  const [lastRequest, setLastRequest] = useState<DrilldownRequest | null>(null)
  const {
    data: report,
    isLoading: reportLoading,
  } = useDrilldownReportQuery(lastRequest, Boolean(lastRequest))
  const [page, setPage] = useState(0)
  const pageSize = 100
  const [sorting, setSorting] = useState<SortingState>(() => {
    const saved = selectTableConfig(DRILLDOWN_FLAT_TABLE_KEY)(useTableConfigStore.getState()).sorting
    return saved.length > 0 ? saved : DEFAULT_TABLE_SORTING
  })
  const tableRef = useRef<Table<FlatRowData> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<FlatRowData> | null>(null)

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      setPage(0)
      const sortParam = drilldownSortParamFromReport(sorting, report?.columns)
      const metrics = metricsForColumnIds(withSortingMetricIds(
        visibleMetricColumnIdsFromHidden(DRILLDOWN_FLAT_TABLE_KEY, { defaultVisibleColumnIds: defaultColIds }),
        sorting,
      ))
      const paginatedRequest: DrilldownRequest = {
        ...request,
        options: { ...(request.options ?? {}), viewType: "flat" },
        paging: { start: 0, length: pageSize },
        sorting: sortParam,
        ...(metrics ? { metrics } : {}),
      }
      setLastRequest(paginatedRequest)
    },
    [pageSize, sorting, report?.columns],
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
        ...(metricsForColumnIds(withSortingMetricIds(
          visibleMetricColumnIdsFromHidden(DRILLDOWN_FLAT_TABLE_KEY, { defaultVisibleColumnIds: defaultColIds }),
          newSorting,
        )) ? {
          metrics: metricsForColumnIds(withSortingMetricIds(
            visibleMetricColumnIdsFromHidden(DRILLDOWN_FLAT_TABLE_KEY, { defaultVisibleColumnIds: defaultColIds }),
            newSorting,
          )),
        } : { metrics: undefined }),
      }
      setLastRequest(nextRequest)
    },
    [lastRequest, pageSize, report?.columns, setTableSorting],
  )

  const handleApplyColumns = useCallback((nextSelected: Set<string>) => {
    if (!lastRequest) return
    const metrics = metricsForColumnIds(withSortingMetricIds([...nextSelected], sorting))
    const nextRequest: DrilldownRequest = {
      ...lastRequest,
      paging: { start: 0, length: pageSize },
      ...(metrics ? { metrics } : { metrics: undefined }),
    }
    setLastRequest(nextRequest)
  }, [lastRequest, pageSize, sorting])

  const flatData = useMemo(
    () => (report ? reportRowsToFlatData(report) : []),
    [report],
  )

  const columnDefs: ColumnDef<FlatRowData, unknown>[] = useMemo(() => {
    if (!report) return []
    const leading = countLeadingGroupingColumns(report.columns)
    const groupingCols: ColumnDef<FlatRowData, unknown>[] = []
    for (let i = 0; i < leading; i++) {
      groupingCols.push({
        id: `grouping-${i}`,
        header: drilldownGroupingShortLabel(report.columns[i]?.name ?? ""),
        accessorFn: (row: FlatRowData) => row.cells[i]?.formatted ?? "",
        enableSorting: true,
        size: i === leading - 1 ? 280 : 200,
        minSize: 120,
        meta: i === leading - 1 ? { flex: 1 } : {},
        cell: drilldownFlatGroupingCell,
      })
    }
    return [...groupingCols, ...buildColumnsFromReport<FlatRowData>(report.columns)]
  }, [report])

  const gridColumnVisibility = useEntityGridColumnVisibility(
    columnDefs as ColumnDef<unknown, unknown>[],
    DRILLDOWN_FLAT_TABLE_KEY,
    { defaultVisibleColumnIds: defaultColIds },
  )
  const { columnSizing, onColumnSizingChange } = usePersistedColumnSizing(DRILLDOWN_FLAT_TABLE_KEY)

  const pinnedBottomRows = useMemo(() => {
    if (!report?.totals?.cells) return undefined
    return [{
      _id: "totals",
      cells: report.totals.cells,
    }]
  }, [report])

  return (
    <DrilldownToolbarProvider
      onApply={handleApply}
      isLoading={reportLoading}
      viewType="flat"
      paging={{ start: page * pageSize, length: pageSize }}
    >
      <PageShell
        title="Drilldown Report (Flat)"
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
              storageKey={DRILLDOWN_FLAT_TABLE_KEY}
              defaultVisibleColumnIds={defaultColIds}
              selectedCols={gridColumnVisibility.selectedCols}
              onColumnsChange={gridColumnVisibility.onColumnsChange}
              onApply={handleApplyColumns}
            />
          ) : null}
        </div>
        <DrilldownToolbarConfigPanel />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {report ? (
            <DataTable
              data={flatData}
              columns={columnDefs}
              loading={reportLoading}
              getRowId={drilldownFlatRowId}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              manualSorting
              pinnedBottomRows={pinnedBottomRows}
              tableRef={tableRef}
              onTableInstance={setTableForChooser}
              columnVisibility={gridColumnVisibility.columnVisibility}
              onColumnVisibilityChange={gridColumnVisibility.onColumnVisibilityChange}
              columnSizing={columnSizing}
              onColumnSizingChange={onColumnSizingChange}
            />
          ) : (
            !reportLoading && (
              <EmptyState message="Choose groupings above, then click Apply to generate a report." />
            )
          )}
        </div>
      </PageShell>
    </DrilldownToolbarProvider>
  )
}
