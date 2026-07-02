import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import type { ColumnDef, SortingState, Table } from "@tanstack/react-table"
import { Alert, Button, PageShell, EmptyState } from "@/components/ui-kit"
import { DataTable } from "@/components/ui-kit/data-table"
import { buildColumnsFromReport, countLeadingGroupingColumns } from "@/components/ui-kit/data-table"
import { ColumnChooser } from "@/components/shared/ColumnChooser"
import { defaultColIds } from "@/lib/entity-table/columns/defaultColIds"
import { useEntityGridColumnVisibility } from "@/lib/entity-table/columns/visibility"
import { usePersistedColumnSizing } from "@/lib/entity-table/usePersistedColumnSizing"
import { usePersistedColumnOrder } from "@/lib/entity-table/usePersistedColumnOrder"
import {
  DrilldownToolbarProvider,
  DrilldownToolbarReportActions,
  DrilldownToolbarConfigPanel,
} from "@/components/drilldown/DrilldownToolbar"
import { useDrilldownToolbarContext } from "@/components/drilldown/DrilldownToolbar/useDrilldownToolbarContext"
import { useDrilldownReportQuery } from "@/api/hooks"
import { drilldownSortParamFromReport } from "@/lib/drilldownTableSort"
import { useTableConfigStore, selectTableConfig, DEFAULT_TABLE_SORTING } from "@/store/tableConfig"
import { useDrilldownStore } from "@/store/drilldown"
import { metricColumnIdsForScope } from "@/lib/drilldownMetrics"
import { writeHiddenColumnIds } from "@/lib/entity-table/columns/storage"
import { reportRowToCells } from "@/lib/reportRowCells"
import { drilldownGroupingShortLabel } from "@/lib/drilldownGroupings"
import { getErrorMessage } from "@/lib/utils"
import type { ColumnFilterValue } from "@/lib/drilldownColumnFilters"
import { resolveColumnsForFilters, withReportColumnFilters } from "@/pages/reports/drilldownReportRequest"
import { metricsForColumnIds, visibleMetricColumnIdsFromHidden, withSortingMetricIds } from "@/lib/drilldownMetrics"
import {
  DRILLDOWN_URL_STATE_PARAM,
  decodeDrilldownUrlState,
  encodeDrilldownUrlState,
  type DrilldownUrlState,
} from "@/lib/drilldownUrlState"
import type { DrilldownRequest, Report, ReportCell } from "@/types/stats"

const DRILLDOWN_FLAT_TABLE_KEY = "reports-drilldown-flat"
const DRILLDOWN_FLAT_PAGE_SIZE = 100

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

/** Visible metric column ids for the flat table, derived from persisted/default column visibility. */
function readVisibleMetricColumnIds(): string[] {
  return visibleMetricColumnIdsFromHidden(DRILLDOWN_FLAT_TABLE_KEY, {
    defaultVisibleColumnIds: defaultColIds,
  })
}

/**
 * Persist the URL-supplied visible-metric set as the table's hidden-column set so the existing
 * `useEntityGridColumnVisibility` hook (which reads `ff_columns_*`) reflects the shared link.
 * Hydration only — never invoked from a store/render reaction, so it cannot drive a loop.
 */
function applyVisibleMetricColumnIds(visibleIds: string[]): void {
  if (visibleIds.length === 0) return
  const allIds = metricColumnIdsForScope()
  const visible = new Set(visibleIds)
  const hidden = allIds.filter((id) => !visible.has(id))
  writeHiddenColumnIds(DRILLDOWN_FLAT_TABLE_KEY, hidden)
}

interface FlatReportUrlSyncProps {
  initialUrlState: DrilldownUrlState | null
}

/**
 * One-shot hydration of Flat Table report state from the shared URL.
 *
 * Lives inside the toolbar provider so it can fire `handleApply()` after seeding the drilldown
 * store, loading the report immediately for a bookmarked/shared link. Guarded by a ref so it runs
 * exactly once on mount and never reacts to later store changes (no URL<->store loop). Local UI
 * state (sorting, column filters, page size) is already seeded from the same URL state in the page's
 * `useState` initializers; this effect handles the pieces that must mutate the Zustand store or
 * localStorage (not safe to do during render). When the URL carries no valid report state this
 * renders nothing and leaves saved-view/default behaviour intact.
 */
function FlatReportUrlSync({ initialUrlState }: FlatReportUrlSyncProps) {
  const { handleApply } = useDrilldownToolbarContext()
  const hydratedRef = useRef(false)
  // Always-latest `handleApply`. The store writes during seeding rebuild it against the hydrated
  // values; reading through this ref in the deferred timer guarantees we fire the closure built from
  // the post-hydration store, never the stale pre-hydration one.
  const handleApplyRef = useRef(handleApply)
  useEffect(() => {
    handleApplyRef.current = handleApply
  }, [handleApply])

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    if (!initialUrlState) return

    const store = useDrilldownStore.getState()
    if (initialUrlState.timezone) store.setTimezone(initialUrlState.timezone)
    if (initialUrlState.dateRange) store.setDateRange(initialUrlState.dateRange)
    if (initialUrlState.groupings.length > 0) {
      store.replaceGroupingsStack(
        initialUrlState.groupings,
        initialUrlState.groupingFilters,
        initialUrlState.urlTrackingFieldByLevel,
      )
    } else {
      store.setGroupingFilters(initialUrlState.groupingFilters)
      store.setUrlTrackingFieldByLevel(initialUrlState.urlTrackingFieldByLevel)
    }
    store.setFiltersEnabled(initialUrlState.filtersEnabled)
    store.setShowFilteredTraffic(initialUrlState.showFilteredTraffic)
    store.setTimeAttribution(initialUrlState.timeAttribution)

    applyVisibleMetricColumnIds(initialUrlState.visibleMetricColumnIds)

    if (initialUrlState.sorting.length > 0) {
      useTableConfigStore.getState().setSorting(DRILLDOWN_FLAT_TABLE_KEY, initialUrlState.sorting)
    }

    // Defer the apply to a macrotask: the store writes above schedule a re-render that rebuilds
    // `handleApply` (and thus `handleApplyRef.current`) against the hydrated values. By the time the
    // timer fires, React has committed that render, so we apply the fresh closure — not the stale
    // pre-hydration one. A single timer means exactly one auto-apply; no URL<->store loop.
    const timer = setTimeout(() => {
      handleApplyRef.current()
    }, 0)
    return () => clearTimeout(timer)
  }, [initialUrlState])

  return null
}

export function DrilldownFlatPage() {
  const setTableSorting = useTableConfigStore((s) => s.setSorting)
  const [searchParams, setSearchParams] = useSearchParams()
  // Decode the shared report state exactly once from the URL present at mount. Later URL writes are
  // `replace`-mode and driven only by user actions, so this never re-fires into a hydration loop.
  const initialUrlStateRef = useRef<DrilldownUrlState | null | undefined>(undefined)
  if (initialUrlStateRef.current === undefined) {
    initialUrlStateRef.current = decodeDrilldownUrlState(searchParams.get(DRILLDOWN_URL_STATE_PARAM))
  }
  const initialUrlState = initialUrlStateRef.current
  const [lastRequest, setLastRequest] = useState<DrilldownRequest | null>(null)
  const [applyRevision, setApplyRevision] = useState(0)
  const {
    data: report,
    isLoading: reportLoading,
    isFetching: reportFetching,
    isError: reportFailed,
    error: reportError,
    refetch: refetchReport,
  } = useDrilldownReportQuery(lastRequest, Boolean(lastRequest), applyRevision)
  const [page, setPage] = useState(0)
  const pageSize = initialUrlState?.pageSize && initialUrlState.pageSize > 0
    ? initialUrlState.pageSize
    : DRILLDOWN_FLAT_PAGE_SIZE
  // Stable paging object for the toolbar provider — an inline literal would change identity
  // every render and ripple through the provider's memoized request builder.
  const toolbarPaging = useMemo(
    () => ({ start: page * pageSize, length: pageSize }),
    [page, pageSize],
  )
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (initialUrlStateRef.current?.sorting.length) {
      return initialUrlStateRef.current.sorting
    }
    const saved = selectTableConfig(DRILLDOWN_FLAT_TABLE_KEY)(useTableConfigStore.getState()).sorting
    return saved.length > 0 ? saved : DEFAULT_TABLE_SORTING
  })
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterValue>>(
    () => initialUrlStateRef.current?.columnFilters ?? {},
  )
  const tableRef = useRef<Table<FlatRowData> | null>(null)
  const [tableForChooser, setTableForChooser] = useState<Table<FlatRowData> | null>(null)
  // Last non-empty report column shape. Header/dimension filters carry UI ids that only resolve to
  // API column names through the report columns; React Query can leave `report` transiently
  // undefined (refetch, first response). Without this snapshot a pending header filter would be
  // dropped from columnFilters on Apply/Update — the filters never reached the API.
  const lastKnownColumnsRef = useRef<Report["columns"] | null>(null)
  useEffect(() => {
    if (report?.columns?.length) {
      lastKnownColumnsRef.current = report.columns
    }
  }, [report?.columns])

  /**
   * Serialize the current shareable report configuration into the URL (replace mode, so it does not
   * grow the history stack). Driven only by user actions — never from a store-watching effect — so
   * there is no URL<->store feedback loop. Local pieces (sorting, column filters) are passed in to
   * avoid stale-closure reads; everything else is read live from the drilldown store / localStorage.
   */
  const writeUrlState = useCallback(
    (overrides?: { sorting?: SortingState; columnFilters?: Record<string, ColumnFilterValue> }) => {
      const store = useDrilldownStore.getState()
      const snapshot: DrilldownUrlState = {
        dateRange: store.dateRange,
        timezone: store.timezone,
        groupings: store.groupings,
        groupingFilters: store.groupingFilters,
        urlTrackingFieldByLevel: store.urlTrackingFieldByLevel,
        filtersEnabled: store.filtersEnabled,
        columnFilters: overrides?.columnFilters ?? columnFilters,
        sorting: overrides?.sorting ?? sorting,
        visibleMetricColumnIds: readVisibleMetricColumnIds(),
        pageSize,
        showFilteredTraffic: store.showFilteredTraffic,
        timeAttribution: store.timeAttribution,
      }
      const encoded = encodeDrilldownUrlState(snapshot)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (encoded) {
            next.set(DRILLDOWN_URL_STATE_PARAM, encoded)
          } else {
            next.delete(DRILLDOWN_URL_STATE_PARAM)
          }
          return next
        },
        { replace: true },
      )
    },
    [columnFilters, pageSize, setSearchParams, sorting],
  )

  const handleApply = useCallback(
    (request: DrilldownRequest) => {
      setApplyRevision((revision) => revision + 1)
      setPage(0)
      writeUrlState()
      const sortParam = drilldownSortParamFromReport(sorting, report?.columns)
      const metrics = metricsForColumnIds(withSortingMetricIds(
        visibleMetricColumnIdsFromHidden(DRILLDOWN_FLAT_TABLE_KEY, { defaultVisibleColumnIds: defaultColIds }),
        sorting,
      ))
      const paginatedRequest = withReportColumnFilters(
        {
          ...request,
          options: { ...(request.options ?? {}), viewType: "flat" },
          paging: { start: 0, length: pageSize },
          sorting: sortParam,
          ...(metrics ? { metrics } : {}),
        },
        resolveColumnsForFilters(report?.columns, lastKnownColumnsRef.current),
        columnFilters,
      )
      setLastRequest(paginatedRequest)
    },
    [columnFilters, pageSize, sorting, report?.columns, writeUrlState],
  )

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      setTableSorting(DRILLDOWN_FLAT_TABLE_KEY, newSorting)
      setPage(0)

      if (!lastRequest) return
      writeUrlState({ sorting: newSorting })

      const nextRequest = withReportColumnFilters(
        {
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
        },
        resolveColumnsForFilters(report?.columns, lastKnownColumnsRef.current),
        columnFilters,
      )
      setLastRequest(nextRequest)
    },
    [columnFilters, lastRequest, pageSize, report?.columns, setTableSorting, writeUrlState],
  )

  const handleApplyColumns = useCallback((nextSelected: Set<string>) => {
    if (!lastRequest) return
    const metrics = metricsForColumnIds(withSortingMetricIds([...nextSelected], sorting))
    const nextRequest = withReportColumnFilters(
      {
        ...lastRequest,
        paging: { start: 0, length: pageSize },
        ...(metrics ? { metrics } : { metrics: undefined }),
      },
      resolveColumnsForFilters(report?.columns, lastKnownColumnsRef.current),
      columnFilters,
    )
    setLastRequest(nextRequest)
    // Column visibility (`ff_columns_*`) is already persisted by the ColumnChooser before this runs,
    // so `readVisibleMetricColumnIds()` inside writeUrlState reflects the new selection.
    writeUrlState()
  }, [columnFilters, lastRequest, pageSize, report?.columns, sorting, writeUrlState])

  const handleColumnFilterChange = useCallback(
    (columnId: string, value: ColumnFilterValue | null) => {
      setPage(0)
      // Compute the next filter set from the current state, then run all side
      // effects OUTSIDE the state-updater (updaters must be pure; queuing other
      // setters inside one double-fires under StrictMode). Pass BOTH columnFilters
      // and the live `sorting` to writeUrlState so the URL never encodes a stale
      // sort when a filter change and a sort change land close together.
      const next = { ...columnFilters }
      if (value) {
        next[columnId] = value
      } else {
        delete next[columnId]
      }
      setColumnFilters(next)
      setLastRequest((request) => (
        request
          ? withReportColumnFilters(
              request,
              resolveColumnsForFilters(report?.columns, lastKnownColumnsRef.current),
              next,
            )
          : request
      ))
      writeUrlState({ columnFilters: next, sorting })
    },
    [columnFilters, report?.columns, sorting, writeUrlState],
  )

  // Retry the last failed report request in place (refetch from react-query is identity-stable).
  const handleRetryReport = useCallback(() => {
    void refetchReport()
  }, [refetchReport])

  const flatData = useMemo(
    () => (report ? reportRowsToFlatData(report) : []),
    [report],
  )

  const columnDefs: ColumnDef<FlatRowData, unknown>[] = useMemo(() => {
    if (!report) return []
    const leading = countLeadingGroupingColumns(report.columns)
    const groupingCols: ColumnDef<FlatRowData, unknown>[] = []
    for (let i = 0; i < leading; i++) {
      const isPrimaryGrouping = i === leading - 1
      // Grouping cells hold long text (names, URLs, referrers, tracking-field values).
      // Open at readable widths; the primary (last) grouping flexes to fill spare space
      // up to maxSize, and any overflow scrolls horizontally (metric columns stay compact,
      // never compress). Persisted user widths win over these defaults (see DataTable
      // columnWidths: flex/base sizing only applies when columnSizing[col.id] == null).
      groupingCols.push({
        id: `grouping-${i}`,
        header: drilldownGroupingShortLabel(report.columns[i]?.name ?? ""),
        accessorFn: (row: FlatRowData) => row.cells[i]?.formatted ?? "",
        enableSorting: true,
        size: isPrimaryGrouping ? 320 : 240,
        minSize: isPrimaryGrouping ? 160 : 140,
        maxSize: isPrimaryGrouping ? 480 : undefined,
        meta: {
          textFilterable: true,
          ...(isPrimaryGrouping ? { flex: 1 } : {}),
        },
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
  const { columnOrder, onColumnOrderChange } = usePersistedColumnOrder(DRILLDOWN_FLAT_TABLE_KEY)
  const tableLoading = reportFetching && Boolean(lastRequest)

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
      paging={toolbarPaging}
    >
      <FlatReportUrlSync initialUrlState={initialUrlState} />
      <PageShell
        title="Drilldown (Flat)"
        fillHeight
        density="dense"
      >
        <DrilldownToolbarReportActions>
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
        </DrilldownToolbarReportActions>
        <DrilldownToolbarConfigPanel />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {reportFailed ? (
            // Surface failed Apply/refetch explicitly — without this alert a failure
            // would be invisible (the table unmounts once the errored key has no data).
            <Alert
              type="error"
              showIcon
              title="Report failed to load"
              description={getErrorMessage(reportError)}
              className="mb-3 shrink-0"
              action={
                <Button size="small" onClick={handleRetryReport}>
                  Retry
                </Button>
              }
            />
          ) : null}
          {report ? (
            <DataTable
              data={flatData}
              columns={columnDefs}
              loading={tableLoading}
              getRowId={drilldownFlatRowId}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              manualSorting
              columnFilters={columnFilters}
              onColumnFilterChange={handleColumnFilterChange}
              pinnedBottomRows={pinnedBottomRows}
              tableRef={tableRef}
              onTableInstance={setTableForChooser}
              columnVisibility={gridColumnVisibility.columnVisibility}
              onColumnVisibilityChange={gridColumnVisibility.onColumnVisibilityChange}
              columnSizing={columnSizing}
              onColumnSizingChange={onColumnSizingChange}
              columnOrder={columnOrder}
              onColumnOrderChange={onColumnOrderChange}
            />
          ) : (
            !reportLoading && !reportFailed && (
              <EmptyState message="Choose groupings above, then click Apply to generate a report." />
            )
          )}
        </div>
      </PageShell>
    </DrilldownToolbarProvider>
  )
}
