import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ENTITY_GRID_LIST_KEY } from '@/lib/entityGridQueryCache'
import { toApiDateTimeRange } from '@/types/stats'
import type { DrilldownRequest, ReportCell } from '@/types/stats'
import { buildMergedRows, buildTotalsRow } from '@/lib/entityGridUtils'
import type { ListEntity, EntityGridRow } from '@/lib/entityGridUtils'
import { api } from '@/api/client'
import { fetchAllFlatDrilldownRows } from '@/api/drilldown'

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
  enabled?: boolean
}

export function useEntityGrid(options: UseEntityGridOptions) {
  const {
    queryKeyPrefix, listEndpoint, listParams, groupBy,
    dateFrom, dateTo, timezone, mapListToEntities, enabled = true,
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
  })

  const statsQuery = useQuery({
    queryKey: [
      ...queryKeyPrefix,
      'entityGridStats',
      groupBy,
      dateFrom.toISOString(),
      dateTo.toISOString(),
      timezone,
    ],
    queryFn: () => {
      const request: DrilldownRequest = {
        timeRange: toApiDateTimeRange(dateFrom, dateTo),
        timeZone: { name: timezone },
        groupings: [{ groupBy, whitelistFilters: [], blacklistFilters: [] }],
        options: { viewType: 'flat' },
      }
      return fetchAllFlatDrilldownRows(request)
    },
    enabled,
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

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeyPrefix })
  }, [queryClient, queryKeyPrefix])

  return {
    entities,
    mergedRows,
    reportColumns,
    totalsCells,
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    isFetching: listQuery.isFetching || statsQuery.isFetching,
    error: listQuery.error || statsQuery.error,
    refetch,
  }
}
