import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { toApiDateTimeRange } from '@/types/stats'
import type { Report, ReportCell } from '@/types/stats'
import { buildMergedRows, buildTotalsRow } from '@/lib/entityGridUtils'
import type { ListEntity, EntityGridRow } from '@/lib/entityGridUtils'

export type { ListEntity, EntityGridRow }
export { buildTotalsRow }

interface UseEntityGridOptions {
  entityKey: string
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
    entityKey, listEndpoint, listParams, groupBy,
    dateFrom, dateTo, timezone, mapListToEntities, enabled = true,
  } = options

  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: [entityKey, 'list', listParams],
    queryFn: async () => {
      const raw = await api.get<unknown>(listEndpoint, listParams)
      const arr = Array.isArray(raw) ? raw : []
      return mapListToEntities ? mapListToEntities(arr) : (arr as ListEntity[])
    },
    enabled,
  })

  const statsQuery = useQuery({
    queryKey: [entityKey, 'stats', groupBy, dateFrom.toISOString(), dateTo.toISOString(), timezone],
    queryFn: () =>
      api.post<Report>('/stats/reporting/drilldown/', {
        timeRange: toApiDateTimeRange(dateFrom, dateTo),
        timeZone: { name: timezone },
        groupings: [{ groupBy, whitelistFilters: [], blacklistFilters: [] }],
        paging: { start: 0, length: 5000 },
        options: { viewType: 'flat' },
      }),
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
    queryClient.invalidateQueries({ queryKey: [entityKey] })
  }, [queryClient, entityKey])

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
