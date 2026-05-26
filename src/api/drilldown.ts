import { api } from '@/api/client'
import type { DrilldownRequest, Report, ReportCell, ReportRow } from '@/types/stats'
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

function normalizeCompactCell(cell: unknown): ReportCell {
  if (Array.isArray(cell)) {
    return {
      formatted: String(cell[0] ?? ''),
      raw: cell[1] == null ? '' : (cell[1] as string | number),
    }
  }
  if (cell && typeof cell === 'object') {
    const objectCell = cell as Partial<ReportCell>
    return {
      formatted: String(objectCell.formatted ?? ''),
      raw: objectCell.raw == null ? '' : objectCell.raw,
    }
  }
  return { formatted: '', raw: '' }
}

function normalizeCompactRow(row: ReportRow): ReportRow {
  return {
    ...row,
    cells: (row.cells as unknown[]).map(normalizeCompactCell),
    children: row.children?.map(normalizeCompactRow),
  }
}

function normalizeCompactReport(report: Report): Report {
  return {
    ...report,
    rows: (report.rows ?? []).map(normalizeCompactRow),
    totals: report.totals
      ? {
          ...report.totals,
          cells: (report.totals.cells as unknown[]).map(normalizeCompactCell),
        }
      : report.totals,
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
  return request.responseFormat === 'compact-v1' ? normalizeCompactReport(report) : report
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
  const normalizedFirstPage = request.responseFormat === 'compact-v1' ? normalizeCompactReport(firstPage) : firstPage

  const rows = [...(normalizedFirstPage.rows ?? [])]
  let rowsTotal = effectiveRowsTotal(normalizedFirstPage)
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
    const normalizedPage = request.responseFormat === 'compact-v1' ? normalizeCompactReport(page) : page
    const pageRows = normalizedPage.rows ?? []
    if (pageRows.length === 0) break

    rows.push(...pageRows)
    lastPageSize = pageRows.length
    nextStart += pageRows.length

    if (rowsTotal === undefined) {
      rowsTotal = effectiveRowsTotal(normalizedPage)
    }
  }

  const totalRows = rowsTotal ?? rows.length

  return {
    ...normalizedFirstPage,
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
