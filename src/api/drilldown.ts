import { api } from '@/api/client'
import type { DrilldownRequest, Report } from '@/types/stats'
import { parseDrilldownReport } from '@/schemas/apiBoundaries'

const DEFAULT_DRILLDOWN_PAGE_SIZE = 2000

/**
 * Prefer a positive rowsTotal from the report. If the API reports 0 or omits the total
 * while returning a full page, treat total as unknown so we keep paging (avoids truncating
 * large funnel lists when totals metadata is wrong or missing).
 */
function effectiveRowsTotal(report: Report): number | undefined {
  if (report.rowsTotal > 0) {
    return report.rowsTotal
  }
  const fromPaging = report.paging?.totalRecords
  if (fromPaging !== undefined && fromPaging > 0) {
    return fromPaging
  }
  return undefined
}

function withPaging(
  request: DrilldownRequest,
  start: number,
  length: number,
): DrilldownRequest {
  return {
    ...request,
    paging: {
      ...request.paging,
      start,
      length,
    },
  }
}

export async function fetchFlatDrilldownPage(
  request: DrilldownRequest,
  options?: { pageSize?: number; signal?: AbortSignal },
): Promise<Report> {
  const signal = options?.signal
  const initialStart = request.paging?.start ?? 0
  const pageSize = options?.pageSize ?? request.paging?.length ?? 200
  const report = await api.postDrilldown<Report>(
    withPaging(request, initialStart, pageSize),
    undefined,
    signal,
  )
  parseDrilldownReport(report)
  return report
}

export async function fetchAllFlatDrilldownRows(
  request: DrilldownRequest,
  options?: { pageSize?: number; signal?: AbortSignal },
): Promise<Report> {
  const pageSize = options?.pageSize ?? DEFAULT_DRILLDOWN_PAGE_SIZE
  const signal = options?.signal
  const initialStart = request.paging?.start ?? 0
  const firstPage = await api.postDrilldown<Report>(
    withPaging(request, initialStart, pageSize),
    undefined,
    signal,
  )
  parseDrilldownReport(firstPage)

  const rows = [...(firstPage.rows ?? [])]
  let rowsTotal = effectiveRowsTotal(firstPage)
  let lastPageSize = rows.length
  let nextStart = initialStart + lastPageSize

  while (
    lastPageSize === pageSize &&
    (rowsTotal === undefined || rows.length < rowsTotal)
  ) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    const page = await api.postDrilldown<Report>(
      withPaging(request, nextStart, pageSize),
      undefined,
      signal,
    )
    parseDrilldownReport(page)
    const pageRows = page.rows ?? []
    if (pageRows.length === 0) break

    rows.push(...pageRows)
    lastPageSize = pageRows.length
    nextStart += pageRows.length

    if (rowsTotal === undefined) {
      rowsTotal = effectiveRowsTotal(page)
    }
  }

  const totalRows = rowsTotal ?? rows.length

  return {
    ...firstPage,
    rows,
    rowsReturned: rows.length,
    rowsTotal: totalRows,
    paging: firstPage.paging
      ? {
          start: initialStart,
          length: rows.length,
          totalRecords: totalRows,
        }
      : undefined,
  }
}
