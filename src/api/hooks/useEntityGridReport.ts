import { useState, useEffect, useCallback, useMemo } from 'react'
import type { SortModelItem } from 'ag-grid-community'
import { api } from '@/api/client'
import { toApiDateTimeRange } from '@/types/stats'
import type { Report, ReportCell } from '@/types/stats'

export interface EntityGridRow {
  id: string
  name: string
  cells: ReportCell[]
}

export interface UseEntityGridReportOptions {
  groupBy: string
  dateFrom: Date
  dateTo: Date
  timezone: string
  /** Metadata endpoint, e.g. '/data/page/list/' */
  metaEndpoint: string
  /** Query params for metadata endpoint */
  metaParams?: Record<string, string>
  /** Key used to index metadata by ID, e.g. 'idPage' */
  metaIdKey: string
  pageSize?: number
}

export interface UseEntityGridReportResult<TMeta> {
  rows: EntityGridRow[]
  columns: { name: string; type: string }[]
  metaById: Record<string, TMeta>
  totalRows: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  sortModel: SortModelItem[]
  onSortChange: (sortModel: SortModelItem[]) => void
  isLoading: boolean
  reload: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEntityGridReport<TMeta extends Record<string, any>>({
  groupBy,
  dateFrom,
  dateTo,
  timezone,
  metaEndpoint,
  metaParams,
  metaIdKey,
  pageSize: initialPageSize = 50,
}: UseEntityGridReportOptions): UseEntityGridReportResult<TMeta> {
  const [rows, setRows] = useState<EntityGridRow[]>([])
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([])
  const [metaById, setMetaById] = useState<Record<string, TMeta>>({})
  const [totalRows, setTotalRows] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [sortModel, setSortModel] = useState<SortModelItem[]>([])

  const fetchReport = useCallback(
    (currentPage: number, currentPageSize: number, sort: SortModelItem[]) => {
      setIsLoading(true)

      const sortParam = sort[0]
        ? {
            column: Number(String(sort[0].colId).replace('col-', '')),
            direction: sort[0].sort === 'desc' ? ('desc' as const) : ('asc' as const),
          }
        : undefined

      const drilldownPromise = api.post<Report>('/stats/reporting/drilldown/', {
        timeRange: toApiDateTimeRange(dateFrom, dateTo),
        timeZone: { name: timezone },
        groupings: [
          { groupBy, whitelistFilters: [], blacklistFilters: [] },
        ],
        paging: {
          start: currentPage * currentPageSize,
          length: currentPageSize,
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
    setPage(0)
    fetchReport(0, pageSize, sortModel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, dateFrom, dateTo, timezone, metaEndpoint])

  const onPageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      fetchReport(newPage, pageSize, sortModel)
    },
    [fetchReport, pageSize, sortModel],
  )

  const onPageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize)
      setPage(0)
      fetchReport(0, newPageSize, sortModel)
    },
    [fetchReport, sortModel],
  )

  const onSortChange = useCallback(
    (newSort: SortModelItem[]) => {
      setSortModel(newSort)
      setPage(0)
      fetchReport(0, pageSize, newSort)
    },
    [fetchReport, pageSize],
  )

  const reload = useCallback(() => {
    fetchReport(page, pageSize, sortModel)
  }, [fetchReport, page, pageSize, sortModel])

  return useMemo(
    () => ({
      rows,
      columns,
      metaById,
      totalRows,
      page,
      pageSize,
      onPageChange,
      onPageSizeChange,
      sortModel,
      onSortChange,
      isLoading,
      reload,
    }),
    [rows, columns, metaById, totalRows, page, pageSize, onPageChange, onPageSizeChange, sortModel, onSortChange, isLoading, reload],
  )
}
