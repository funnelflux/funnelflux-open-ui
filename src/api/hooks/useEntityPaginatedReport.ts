import { useState, useEffect, useCallback, useMemo } from 'react'
import { type PaginationState, type SortingState, type OnChangeFn } from '@tanstack/react-table'
import { api } from '@/api/client'
import { toApiDateTimeRange } from '@/types/stats'
import type { Report, ReportCell } from '@/types/stats'

export interface EntityRow {
  id: string
  name: string
  cells: ReportCell[]
}

export interface UseEntityPaginatedReportOptions {
  groupBy: string
  dateFrom: Date
  dateTo: Date
  timezone: string
  /** Metadata endpoint, e.g. '/data/page/list/' */
  metaEndpoint: string
  /** Query params for metadata endpoint, e.g. { pageType: 'lander' } */
  metaParams?: Record<string, string>
  /** Key used to index metadata by ID, e.g. 'idPage' */
  metaIdKey: string
}

export interface UseEntityPaginatedReportResult<TMeta> {
  rows: EntityRow[]
  columns: { name: string; type: string }[]
  metaById: Record<string, TMeta>
  totalRows: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  isLoading: boolean
  reload: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEntityPaginatedReport<TMeta extends Record<string, any>>({
  groupBy,
  dateFrom,
  dateTo,
  timezone,
  metaEndpoint,
  metaParams,
  metaIdKey,
}: UseEntityPaginatedReportOptions): UseEntityPaginatedReportResult<TMeta> {
  const [rows, setRows] = useState<EntityRow[]>([])
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([])
  const [metaById, setMetaById] = useState<Record<string, TMeta>>({})
  const [totalRows, setTotalRows] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchReport = useCallback(
    (pag: PaginationState, sort: SortingState) => {
      setIsLoading(true)

      const sortParam = sort[0]
        ? {
            column: Number(String(sort[0].id).replace('col-', '')),
            direction: sort[0].desc ? ('desc' as const) : ('asc' as const),
          }
        : undefined

      const drilldownPromise = api.post<Report>('/stats/reporting/drilldown/', {
        timeRange: toApiDateTimeRange(dateFrom, dateTo),
        timeZone: { name: timezone },
        groupings: [
          { groupBy, whitelistFilters: [], blacklistFilters: [] },
        ],
        paging: {
          start: pag.pageIndex * pag.pageSize,
          length: pag.pageSize,
        },
        sorting: sortParam,
        options: { viewType: 'flat' },
      })

      const metaPromise = api.get<TMeta[]>(metaEndpoint, metaParams)

      Promise.all([drilldownPromise, metaPromise])
        .then(([report, metaList]) => {
          setColumns(report.columns ?? [])
          setTotalRows(report.paging?.totalRecords ?? (report.rows ?? []).length)
          setRows(
            (report.rows ?? []).map((row) => {
              const cells = row.cells ?? []
              return {
                id: String(cells[0]?.raw ?? ''),
                name: cells[0]?.formatted ?? '',
                cells,
              }
            }),
          )
          setMetaById(
            Object.fromEntries(
              metaList.map((item) => [String(item[metaIdKey] ?? ''), item]),
            ),
          )
          setIsLoading(false)
        })
        .catch(() => {
          setRows([])
          setMetaById({})
          setTotalRows(0)
          setIsLoading(false)
        })
    },
    [groupBy, dateFrom, dateTo, timezone, metaEndpoint, metaParams, metaIdKey],
  )

  // Load on mount and when date/tz/groupBy changes — reset to page 0
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    fetchReport({ pageIndex: 0, pageSize: pagination.pageSize }, sorting)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch on param changes
  }, [groupBy, dateFrom, dateTo, timezone, metaEndpoint])

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      setPagination(next)
      fetchReport(next, sorting)
    },
    [fetchReport, pagination, sorting],
  )

  const onSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(next)
      const resetPag = { ...pagination, pageIndex: 0 }
      setPagination(resetPag)
      fetchReport(resetPag, next)
    },
    [fetchReport, pagination, sorting],
  )

  const reload = useCallback(() => {
    fetchReport(pagination, sorting)
  }, [fetchReport, pagination, sorting])

  return useMemo(
    () => ({
      rows,
      columns,
      metaById,
      totalRows,
      pagination,
      onPaginationChange,
      sorting,
      onSortingChange,
      isLoading,
      reload,
    }),
    [rows, columns, metaById, totalRows, pagination, onPaginationChange, sorting, onSortingChange, isLoading, reload],
  )
}
