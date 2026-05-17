import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ENTITY_GRID_LIST_KEY, ENTITY_GRID_STATS_KEY } from '@/lib/entity-table/data/queryCache'
import type { ReportCell } from '@/types/stats'
import { buildMergedRows, buildTotalsRow } from '@/lib/entity-table/data/mergedRows'
import type { ListEntity, EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import { api } from '@/api/client'
import { metricsForColumnIds } from '@/lib/drilldownMetrics'
import { fetchFlatAssetDrilldownReport } from '@/lib/entity-table/data/fetchFlatAssetDrilldown'

export type { ListEntity, EntityGridRow }
export { buildTotalsRow }

interface UseEntityGridOptions {
  queryKeyPrefix: readonly unknown[]
  listEndpoint: string
  listParams?: Record<string, string>
  groupBy: string
  dateFrom: Date
  dateTo: Date
  timezone: string
  mapListToEntities?: (items: unknown[]) => ListEntity[]
  metricColumnIds?: readonly string[]
  enabled?: boolean
}

export function useEntityGrid(options: UseEntityGridOptions) {
  const {
    queryKeyPrefix, listEndpoint, listParams, groupBy,
    dateFrom, dateTo, timezone, mapListToEntities, metricColumnIds, enabled = true,
  } = options

  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: [...queryKeyPrefix, ENTITY_GRID_LIST_KEY, listEndpoint, listParams],
    queryFn: async () => {
      const raw = await api.get<unknown>(listEndpoint, listParams)
      const arr = Array.isArray(raw) ? raw : []
      return mapListToEntities ? mapListToEntities(arr) : (arr as ListEntity[])
    },
    enabled,
    placeholderData: (previousData) => previousData,
  })

  const statsQuery = useQuery({
    queryKey: [
      ...queryKeyPrefix,
      ENTITY_GRID_STATS_KEY,
      groupBy,
      dateFrom.toISOString(),
      dateTo.toISOString(),
      timezone,
      metricsForColumnIds(metricColumnIds ?? []) ?? 'allMetrics',
    ],
    queryFn: () => {
      const metrics = metricsForColumnIds(metricColumnIds ?? [])
      return fetchFlatAssetDrilldownReport({
        dateFrom,
        dateTo,
        timezone,
        groupBy,
        ...(metrics?.length ? { metrics } : {}),
      })
    },
    enabled,
    placeholderData: (previousData) => previousData,
  })

  const entities = useMemo(
    () => listQuery.data ?? [],
    [listQuery.data],
  )

  const statsById = useMemo(() => {
    const report = statsQuery.data
    if (!report?.rows) return {}
    const entityIds = new Set(entities.map((e) => String(e.id)))
    const result: Record<string, ReportCell[]> = {}
    for (const row of report.rows) {
      const cells = row.cells ?? []
      const id = String(cells[0]?.raw ?? '')
      if (id && entityIds.has(id)) {
        result[id] = cells
      }
    }
    return result
  }, [statsQuery.data, entities])

  const reportColumns = useMemo(
    () => statsQuery.data?.columns ?? [],
    [statsQuery.data],
  )
  const totalsCells = useMemo(
    () => statsQuery.data?.totals?.cells ?? null,
    [statsQuery.data],
  )

  const mergedRows = useMemo(
    () => buildMergedRows(entities, statsById, reportColumns),
    [entities, statsById, reportColumns],
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
    error: listQuery.error || statsQuery.error,
    refetch,
    refetchLists,
    refetchStats,
  }
}
