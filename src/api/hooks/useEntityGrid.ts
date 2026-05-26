import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ENTITY_GRID_LIST_KEY, ENTITY_GRID_STATS_KEY } from '@/lib/entity-table/data/queryCache'
import type { ReportCell } from '@/types/stats'
import { buildMergedRows, buildTotalsRow, reportRowsToEntityGridRows } from '@/lib/entity-table/data/mergedRows'
import type { ListEntity, EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import { api } from '@/api/client'
import { defaultApiMetricNames, metricsForColumnIds } from '@/lib/drilldownMetrics'
import { fetchFlatAssetDrilldownReport } from '@/lib/entity-table/data/fetchFlatAssetDrilldown'
import type { ArchiveStatus } from '@/components/shared/ArchiveToggle'

export type { ListEntity, EntityGridRow }
export { buildTotalsRow }

interface UseEntityGridOptions {
  queryKeyPrefix: readonly unknown[]
  listEndpoint: string
  listParams?: Record<string, string>
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
    queryKeyPrefix, listEndpoint, listParams, groupBy, groupings,
    dateFrom, dateTo, timezone, mapListToEntities, metricColumnIds, includeMissingAssets = false,
    assetStatus = 'active', enabled = true,
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

  const metrics = useMemo(
    () => metricsForColumnIds(metricColumnIds ?? []) ?? defaultApiMetricNames(),
    [metricColumnIds],
  )

  const statsQuery = useQuery({
    queryKey: [
      ...queryKeyPrefix,
      ENTITY_GRID_STATS_KEY,
      groupBy,
      groupings,
      dateFrom.toISOString(),
      dateTo.toISOString(),
      timezone,
      metrics,
      includeMissingAssets,
      assetStatus,
    ],
    queryFn: () => {
      return fetchFlatAssetDrilldownReport({
        dateFrom,
        dateTo,
        timezone,
        groupBy,
        groupings,
        metrics,
        includeMissingAssets,
        assetStatus,
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
    () => {
      if (includeMissingAssets) {
        const rows = reportRowsToEntityGridRows(statsQuery.data?.rows ?? [], reportColumns)
        const entityMetaById = new Map(entities.map((entity) => [String(entity.id), entity]))

        return rows.map((row) => {
          const meta = entityMetaById.get(String(row.id))
          return meta ? { ...meta, ...row, categoryId: row.categoryId ?? meta.categoryId } : row
        })
      }
      return buildMergedRows(entities, statsById, reportColumns)
    },
    [includeMissingAssets, statsQuery.data?.rows, reportColumns, entities, statsById],
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
