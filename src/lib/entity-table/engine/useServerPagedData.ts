import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import { DEFAULT_TABLE_SORTING, selectTableConfig, useTableConfigStore } from '@/store/tableConfig'
import { sortAssetTableRows } from '@/lib/entity-table/data/sorting'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import type { ReportCell, ReportColumn } from '@/types/stats'

export type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'

export interface AssetTableEnginePageData<TRow extends EntityGridRow> {
  rows: TRow[]
  columns: ReportColumn[]
  totalsCells: ReportCell[] | null
  totalRows: number
}

export interface AssetTableEngineLoadArgs {
  dateFrom: Date
  dateTo: Date
  timezone: string
  pageIndex: number
  pageSize: number
  reportMetrics?: string[]
}

export interface UseAssetTableEngineOptions<TRow extends EntityGridRow> {
  tableKey: string
  queryKeyPrefix: readonly unknown[]
  queryScopeKey: string
  dateFrom: Date
  dateTo: Date
  timezone: string
  pageIndex: number
  pageSize: number
  search: string
  reportMetrics?: string[]
  loadPageData: (args: AssetTableEngineLoadArgs) => Promise<AssetTableEnginePageData<TRow>>
  filterRows?: (rows: TRow[], searchLower: string) => TRow[]
  sortRows?: (rows: TRow[], columns: ReportColumn[], sorting: SortingState) => TRow[]
  /** When false, the page query does not run (used when composing multiple engines behind one facade). */
  enabled?: boolean
}

/**
 * One entry-point data engine for asset-table pages.
 * You pass request-shaping inputs + a page adapter (`loadPageData`) and receive table-ready state.
 */
export function useAssetTableEngine<TRow extends EntityGridRow>(
  options: UseAssetTableEngineOptions<TRow>,
) {
  const {
    tableKey,
    queryKeyPrefix,
    queryScopeKey,
    dateFrom,
    dateTo,
    timezone,
    pageIndex,
    pageSize,
    search,
    reportMetrics,
    loadPageData,
    filterRows,
    sortRows,
    enabled = true,
  } = options

  const queryClient = useQueryClient()
  const setTableSorting = useTableConfigStore((state) => state.setSorting)
  const [sorting, setSorting] = useState<SortingState>(() => {
    const saved = selectTableConfig(tableKey)(useTableConfigStore.getState()).sorting
    return saved.length > 0 ? saved : DEFAULT_TABLE_SORTING
  })

  const queryKey = useMemo(
    () =>
      [
        ...queryKeyPrefix,
        queryScopeKey,
        dateFrom.toISOString(),
        dateTo.toISOString(),
        timezone,
        pageIndex,
        pageSize,
        reportMetrics ?? 'allMetrics',
      ] as const,
    [
      queryKeyPrefix,
      queryScopeKey,
      dateFrom,
      dateTo,
      timezone,
      pageIndex,
      pageSize,
      reportMetrics,
    ],
  )

  const query = useQuery({
    queryKey,
    queryFn: () => loadPageData({
      dateFrom,
      dateTo,
      timezone,
      pageIndex,
      pageSize,
      reportMetrics,
    }),
    placeholderData: (previousData) => previousData,
    enabled,
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data?.rows])
  const columns = useMemo(() => query.data?.columns ?? [], [query.data?.columns])
  const totalsCells = query.data?.totalsCells ?? null
  const totalRows = query.data?.totalRows ?? 0
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))

  const filteredRows = useMemo(() => {
    const searchLower = search.trim().toLowerCase()
    if (!searchLower) return rows
    if (filterRows) return filterRows(rows, searchLower)
    return rows.filter((row) => row.name.toLowerCase().includes(searchLower))
  }, [rows, search, filterRows])

  const tableRows = useMemo(
    () => (sortRows ? sortRows(filteredRows, columns, sorting) : sortAssetTableRows(filteredRows, columns, sorting)),
    [filteredRows, columns, sorting, sortRows],
  )

  const handleSortingChange = useCallback((nextSorting: SortingState) => {
    setSorting(nextSorting)
    setTableSorting(tableKey, nextSorting)
  }, [setTableSorting, tableKey])

  const setCachedPage = useCallback((
    updater: (previous: AssetTableEnginePageData<TRow> | undefined) => AssetTableEnginePageData<TRow> | undefined,
  ) => {
    queryClient.setQueryData<AssetTableEnginePageData<TRow>>(queryKey, updater)
  }, [queryClient, queryKey])

  return {
    rows: tableRows,
    columns,
    totalsCells,
    totalRows,
    pageCount,
    sorting,
    handleSortingChange,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    reload: query.refetch,
    setCachedPage,
  }
}
