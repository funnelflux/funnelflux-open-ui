import { useState, useCallback } from 'react'
import { subDays } from 'date-fns'
import { api } from '@/api/client'
import { toApiDateTimeRange } from '@/types/stats'
import type { Report, ReportCell } from '@/types/stats'

export interface EntityRow {
  id: string
  name: string
  cells: ReportCell[]
  [key: string]: unknown
}

export interface EntityReportResult {
  columns: { name: string; type: string }[]
  rows: EntityRow[]
  totals: ReportCell[]
  isLoading: boolean
  error: string | null
  reload: () => void
}

interface UseEntityReportOptions {
  groupBy: string
  dateFrom?: Date
  dateTo?: Date
  timezone?: string
}

/**
 * Loads a drilldown report for an entity page.
 * Maps the first column (grouping) to id/name and exposes the metric cells.
 */
export function useEntityReport({
  groupBy,
  dateFrom,
  dateTo,
  timezone = 'UTC',
}: UseEntityReportOptions): EntityReportResult {
  const [columns, setColumns] = useState<{ name: string; type: string }[]>([])
  const [rows, setRows] = useState<EntityRow[]>([])
  const [totals, setTotals] = useState<ReportCell[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)

    const from = dateFrom ?? subDays(new Date(), 365)
    const to = dateTo ?? new Date()

    api
      .post<Report>('/stats/reporting/drilldown/', {
        timeRange: toApiDateTimeRange(from, to),
        timeZone: { name: timezone },
        groupings: [{ groupBy, whitelistFilters: [], blacklistFilters: [] }],
        paging: { start: 0, length: 99999 },
        options: { viewType: 'flat' },
      })
      .then((report) => {
        setColumns(report.columns ?? [])
        setTotals(report.totals?.cells ?? [])
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
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load data')
        setRows([])
        setIsLoading(false)
      })
  }, [groupBy, dateFrom, dateTo, timezone])

  // Auto-load on mount / when params change
  useState(() => {
    load()
  })

  return { columns, rows, totals, isLoading, error, reload: load }
}
