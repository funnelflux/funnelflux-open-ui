import { useMemo, useState } from 'react'
import { selectedRowIds } from '@/lib/utils'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEntityGrid } from '@/api/hooks/useEntityGrid'
import type { ListEntity, EntityGridRow } from '@/lib/entityGridUtils'
import { visibleMetricColumnIdsFromHidden } from '@/lib/drilldownMetrics'
import type { MetricScope } from '@/components/ui-kit/data-table'
import { useEntityArchiveTab } from '@/hooks/entity-page/useEntityArchiveTab'
import { useEntityDateRange } from '@/hooks/entity-page/useEntityDateRange'
import { useEntityModals } from '@/hooks/entity-page/useEntityModals'
import { useEntitySearch } from '@/hooks/entity-page/useEntitySearch'

interface UseEntityPageOptions {
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
  mapListToEntities?: (items: unknown[]) => ListEntity[]
  metricStorageKey?: string
  defaultVisibleColumnIds?: readonly string[]
  metricHideScopes?: Set<MetricScope>
}

export function useEntityPage(options: UseEntityPageOptions) {
  const {
    archiveListFilter,
    listParams: staticListParams,
    queryKeyPrefix,
    listEndpoint,
    groupBy,
    mapListToEntities,
    metricStorageKey,
    defaultVisibleColumnIds,
    metricHideScopes,
  } = options

  const {
    archiveStatus,
    setArchiveStatus,
    listParamsForQuery,
    skipArchiveFilter,
  } = useEntityArchiveTab({
    archiveListFilter,
    staticListParams,
  })
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const { tz, setTz, dateRange, setDateRange } = useEntityDateRange()
  const {
    sheetOpen,
    setSheetOpen,
    editId,
    setEditId,
    deleteId,
    setDeleteId,
    handleCreate,
    handleEdit,
  } = useEntityModals()

  const metricColumnIds = metricStorageKey
    ? visibleMetricColumnIdsFromHidden(metricStorageKey, { defaultVisibleColumnIds, hideScopes: metricHideScopes })
    : undefined

  const grid = useEntityGrid({
    queryKeyPrefix,
    listEndpoint,
    groupBy,
    mapListToEntities,
    listParams: listParamsForQuery,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    timezone: tz,
    metricColumnIds,
  })

  const { search, setSearch, filtered } = useEntitySearch({
    rows: grid.mergedRows as EntityGridRow[],
    selectedCategoryId,
    archiveStatus,
    skipArchiveFilter,
  })

  const selectedIds = useMemo(() => selectedRowIds(rowSelection), [rowSelection])

  return {
    ...grid,
    filtered,
    search, setSearch,
    archiveStatus, setArchiveStatus,
    selectedCategoryId, setSelectedCategoryId,
    rowSelection, setRowSelection,
    tz, setTz,
    dateRange, setDateRange,
    sheetOpen, setSheetOpen,
    editId, setEditId,
    deleteId, setDeleteId,
    selectedIds,
    handleCreate,
    handleEdit,
  }
}
