import { useMemo } from 'react'
import { useEntityGrid } from '@/api/hooks/useEntityGrid'
import type { ListEntity, EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import { visibleMetricColumnIdsFromHidden } from '@/lib/drilldownMetrics'
import type { MetricScope } from '@/components/ui-kit/data-table'
import { filterEntityTableRows, useEntityTableState } from '@/lib/entity-table/engine/useEntityTableState'

export interface UseEntityPageOptions {
  queryKeyPrefix: readonly unknown[]
  listEndpoint: string
  /** Base query params (always sent, e.g. pageType for pages). */
  listParams?: Record<string, string>
  /**
   * Server-side archive tab filtering (no longer filtered client-side).
   * - `trafficsource`: GET `archived=true|false`; omit param when tab is All.
   * - `status`: GET `status=active|archived|all` (page find/byStatus, offersource find/byStatus).
   */
  archiveListFilter?: 'trafficsource' | 'status'
  groupBy: string
  groupings?: readonly string[]
  mapListToEntities?: (items: unknown[]) => ListEntity[]
  metricStorageKey?: string
  defaultVisibleColumnIds?: readonly string[]
  metricHideScopes?: Set<MetricScope>
  /** When false, list/stats queries do not run (used when composing multiple engines behind one facade). */
  enabled?: boolean
}

export function useEntityPage(options: UseEntityPageOptions) {
  const {
    archiveListFilter,
    listParams: staticListParams,
    queryKeyPrefix,
    listEndpoint,
    groupBy,
    groupings,
    mapListToEntities,
    metricStorageKey,
    defaultVisibleColumnIds,
    metricHideScopes,
    enabled = true,
  } = options

  const tableState = useEntityTableState({
    rows: [],
    archiveListFilter,
    staticListParams,
  })

  const metricColumnIds = metricStorageKey
    ? visibleMetricColumnIdsFromHidden(metricStorageKey, { defaultVisibleColumnIds, hideScopes: metricHideScopes })
    : undefined

  const grid = useEntityGrid({
    queryKeyPrefix,
    listEndpoint,
    groupBy,
    groupings,
    mapListToEntities,
    listParams: tableState.listParamsForQuery,
    dateFrom: tableState.dateRange.from,
    dateTo: tableState.dateRange.to,
    timezone: tableState.tz,
    metricColumnIds,
    includeMissingAssets: true,
    assetStatus: tableState.archiveStatus,
    enabled,
  })

  const filtered = useMemo(
    () =>
      filterEntityTableRows(
        grid.mergedRows as EntityGridRow[],
        tableState.search,
        tableState.selectedCategoryId,
        tableState.archiveStatus,
        tableState.skipArchiveFilter,
      ),
    [
      grid.mergedRows,
      tableState.search,
      tableState.selectedCategoryId,
      tableState.archiveStatus,
      tableState.skipArchiveFilter,
    ],
  )

  return {
    ...grid,
    filtered,
    search: tableState.search,
    setSearch: tableState.setSearch,
    archiveStatus: tableState.archiveStatus,
    setArchiveStatus: tableState.setArchiveStatus,
    selectedCategoryId: tableState.selectedCategoryId,
    setSelectedCategoryId: tableState.setSelectedCategoryId,
    rowSelection: tableState.rowSelection,
    setRowSelection: tableState.setRowSelection,
    tz: tableState.tz,
    setTz: tableState.setTz,
    dateRange: tableState.dateRange,
    setDateRange: tableState.setDateRange,
    sheetOpen: tableState.sheetOpen,
    setSheetOpen: tableState.setSheetOpen,
    editId: tableState.editId,
    setEditId: tableState.setEditId,
    deleteId: tableState.deleteId,
    setDeleteId: tableState.setDeleteId,
    selectedIds: tableState.selectedIds,
    handleCreate: tableState.handleCreate,
    handleEdit: tableState.handleEdit,
  }
}
