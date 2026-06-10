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

export interface FetchAllFlatDrilldownOptions {
  pageSize?: number
  /** When true, stop paging and throw so a superseded fetch cannot overwrite cache. */
  isStale?: () => boolean
  /** Called once with the first page when additional pages will be fetched. */
  onFirstPage?: (partial: Report) => void
}

function assertNotStale(isStale?: () => boolean): void {
  if (isStale?.()) {
    throw new DOMException('Stale', 'AbortError')
  }
}

export async function fetchAllFlatDrilldownRows(
  request: DrilldownRequest,
  options?: FetchAllFlatDrilldownOptions,
): Promise<Report> {
  const pageSize = options?.pageSize ?? DEFAULT_DRILLDOWN_PAGE_SIZE
  const isStale = options?.isStale
  const initialStart = request.paging?.start ?? 0
  assertNotStale(isStale)
  const firstPage = await api.postDrilldown<Report>(
    withPaging(request, initialStart, pageSize),
  )
  parseDrilldownReport(firstPage)
  const normalizedFirstPage = request.responseFormat === 'compact-v1' ? normalizeCompactReport(firstPage) : firstPage

  const rows = [...(normalizedFirstPage.rows ?? [])]
  let rowsTotal = effectiveRowsTotal(normalizedFirstPage)
  let lastPageSize = rows.length
  let nextStart = initialStart + lastPageSize

  const needsMorePages =
    lastPageSize === pageSize &&
    (rowsTotal === undefined || rows.length < rowsTotal)

  if (needsMorePages) {
    assertNotStale(isStale)
    options?.onFirstPage?.({
      ...normalizedFirstPage,
      rows: [...rows],
      rowsReturned: rows.length,
      rowsTotal: rowsTotal ?? rows.length,
      isComplete: false,
    })
  }

  while (
    lastPageSize === pageSize &&
    (rowsTotal === undefined || rows.length < rowsTotal)
  ) {
    assertNotStale(isStale)
    const page = await api.postDrilldown<Report>(
      withPaging(request, nextStart, pageSize),
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
    isComplete: true,
    paging: firstPage.paging
      ? {
          start: initialStart,
          length: rows.length,
          totalRecords: totalRows,
        }
      : undefined,
  }
}
