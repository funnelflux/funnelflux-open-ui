import { useCallback, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ENTITY_GRID_LIST_KEY, ENTITY_GRID_STATS_KEY } from '@/lib/entity-table/data/queryCache'
import type { ReportCell } from '@/types/stats'
import {
  buildMergedRows,
  buildTotalsRow,
  entityCellIndexForReportColumns,
} from '@/lib/entity-table/data/mergedRows'
import type { ListEntity, EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import { api } from '@/api/client'
import { defaultApiMetricNames, metricsForColumnIds } from '@/lib/drilldownMetrics'
import { dateRangeQueryKey } from '@/lib/statsDateRange'
import { fetchFlatAssetDrilldownReport } from '@/lib/entity-table/data/fetchFlatAssetDrilldown'
import type { ArchiveStatus } from '@/components/shared/ArchiveToggle'

export type { ListEntity, EntityGridRow }
export { buildTotalsRow }

interface UseEntityGridOptions {
  queryKeyPrefix: readonly unknown[]
  listEndpoint?: string
  listParams?: Record<string, string>
  /** When set, replaces the default api.get(listEndpoint) list fetch. */
  listQueryFn?: () => Promise<ListEntity[]>
  groupBy: string
  groupings?: readonly string[]
  dateFrom: Date
  dateTo: Date
  timezone: string
  mapListToEntities?: (items: unknown[]) => ListEntity[]
  metricColumnIds?: readonly string[]
  includeMissingAssets?: boolean
  assetStatus?: ArchiveStatus
  enabled?: boolean
}

export function useEntityGrid(options: UseEntityGridOptions) {
  const {
    queryKeyPrefix, listEndpoint, listParams, listQueryFn, groupBy, groupings,
    dateFrom, dateTo, timezone, mapListToEntities, metricColumnIds, includeMissingAssets = false,
    assetStatus = 'active', enabled = true,
  } = options

  const queryClient = useQueryClient()
  const statsFetchGenerationRef = useRef(0)
  const hasCustomListQuery = listQueryFn != null

  const listQueryKey = useMemo(
    () => [...queryKeyPrefix, ENTITY_GRID_LIST_KEY, listEndpoint, listParams, hasCustomListQuery] as const,
    [queryKeyPrefix, listEndpoint, listParams, hasCustomListQuery],
  )

  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: async () => {
      if (listQueryFn) {
        return listQueryFn()
      }
      const raw = await api.get<unknown>(listEndpoint!, listParams)
      const arr = Array.isArray(raw) ? raw : []
      return mapListToEntities ? mapListToEntities(arr) : (arr as ListEntity[])
    },
    enabled: enabled && (listQueryFn != null || Boolean(listEndpoint)),
    placeholderData: (previousData) => previousData,
  })

  const metrics = useMemo(
    () => metricsForColumnIds(metricColumnIds ?? []) ?? defaultApiMetricNames(),
    [metricColumnIds],
  )

  const statsDateKey = useMemo(
    () => dateRangeQueryKey(dateFrom, dateTo, timezone),
    [dateFrom, dateTo, timezone],
  )

  const statsQueryKey = useMemo(
    () =>
      [
        ...queryKeyPrefix,
        ENTITY_GRID_STATS_KEY,
        groupBy,
        groupings,
        statsDateKey,
        metrics,
        includeMissingAssets,
        assetStatus,
      ] as const,
    [
      queryKeyPrefix,
      groupBy,
      groupings,
      statsDateKey,
      metrics,
      includeMissingAssets,
      assetStatus,
    ],
  )

  const statsQuery = useQuery({
    queryKey: statsQueryKey,
    queryFn: () => {
      const generation = ++statsFetchGenerationRef.current
      const isStale = () => statsFetchGenerationRef.current !== generation

      return fetchFlatAssetDrilldownReport(
        {
          dateFrom,
          dateTo,
          timezone,
          groupBy,
          groupings,
          metrics,
          includeMissingAssets,
          assetStatus,
        },
        {
          isStale,
          onFirstPage: (partial) => {
            if (!isStale()) {
              queryClient.setQueryData(statsQueryKey, partial)
            }
          },
        },
      )
    },
    enabled,
    placeholderData: (previousData) => previousData,
  })

  const entities = useMemo(
    () => listQuery.data ?? [],
    [listQuery.data],
  )

  const statsData = statsQuery.data

  const statsById = useMemo(() => {
    const report = statsData
    if (!report?.rows) return {}
    const entityCellIndex = entityCellIndexForReportColumns(report.columns ?? [])
    const entityIds = new Set(entities.map((e) => String(e.id)))
    const result: Record<string, ReportCell[]> = {}
    for (const row of report.rows) {
      const cells = row.cells ?? []
      const id = String(cells[entityCellIndex]?.raw ?? '')
      if (id && entityIds.has(id)) {
        result[id] = cells
      }
    }
    return result
  }, [statsData, entities])

  const reportColumns = useMemo(
    () => statsData?.columns ?? [],
    [statsData],
  )
  const totalsCells = useMemo(
    () => statsData?.totals?.cells ?? null,
    [statsData],
  )

  const mergedRows = useMemo(
    () => buildMergedRows(entities, statsById, reportColumns),
    [reportColumns, entities, statsById],
  )

  const isLoadingMore = Boolean(
    statsData && statsData.isComplete === false && statsQuery.isFetching,
  )

  const prefixLen = queryKeyPrefix.length

  const refetchLists = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: queryKeyPrefix,
        predicate: (q) => {
          const k = q.queryKey as unknown[]
          return Array.isArray(k) && k[prefixLen] === ENTITY_GRID_LIST_KEY
        },
      }),
    [queryClient, queryKeyPrefix, prefixLen],
  )

  const refetchStats = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: queryKeyPrefix,
        predicate: (q) => {
          const k = q.queryKey as unknown[]
          return Array.isArray(k) && k[prefixLen] === ENTITY_GRID_STATS_KEY
        },
      }),
    [queryClient, queryKeyPrefix, prefixLen],
  )

  const refetch = useCallback(() => {
    void Promise.all([refetchLists(), refetchStats()])
  }, [refetchLists, refetchStats])

  return {
    entities,
    mergedRows,
    reportColumns,
    totalsCells,
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    isFetching: listQuery.isFetching || statsQuery.isFetching,
    isLoadingMore,
    error: listQuery.error || statsQuery.error,
    refetch,
    refetchLists,
    refetchStats,
  }
}
