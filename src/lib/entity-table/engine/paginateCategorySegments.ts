/**
 * Paginate a list of entity rows where optional "category strip" header rows may appear
 * before each group. Pagination counts only `segment.items` rows; when a page starts
 * mid-group, the segment `header` row is repeated at the top of that page.
 */
export interface CategorySegment<TRow> {
  header: TRow | null
  items: TRow[]
}

export function paginateCategorySegments<TRow>(
  segments: CategorySegment<TRow>[],
  pageIndex: number,
  pageSize: number,
): { pageRows: TRow[]; totalDataCount: number; pageCount: number } {
  const totalDataCount = segments.reduce((n, s) => n + s.items.length, 0)
  const pageCount = Math.max(1, Math.ceil(totalDataCount / pageSize))

  if (totalDataCount === 0) {
    return { pageRows: [], totalDataCount: 0, pageCount: 1 }
  }

  const safePageIndex = Math.min(Math.max(0, pageIndex), pageCount - 1)
  const pageStart = safePageIndex * pageSize
  const pageEnd = Math.min(pageStart + pageSize, totalDataCount)

  const pageRows: TRow[] = []
  let dataOffset = 0

  for (const segment of segments) {
    const { header, items } = segment
    const segStart = dataOffset
    const segEnd = dataOffset + items.length

    const takeStart = Math.max(segStart, pageStart)
    const takeEnd = Math.min(segEnd, pageEnd)

    if (takeStart < takeEnd) {
      const slice = items.slice(takeStart - segStart, takeEnd - segStart)
      if (header != null && slice.length > 0) {
        pageRows.push(header)
      }
      pageRows.push(...slice)
    }

    dataOffset = segEnd
  }

  return { pageRows, totalDataCount, pageCount }
}

/** 0-based data-row offset of `entityId` in segment item order (headers excluded). */
export function dataRowOffsetForEntityInCategorySegments<TRow extends { id: string }>(
  segments: CategorySegment<TRow>[],
  entityId: string,
): number | null {
  let dataOffset = 0
  for (const segment of segments) {
    for (const item of segment.items) {
      if (item.id === entityId) return dataOffset
      dataOffset += 1
    }
  }
  return null
}

/** Page index that contains `entityId`, or null when the row is not in the current segments. */
export function pageIndexForEntityInCategorySegments<TRow extends { id: string }>(
  segments: CategorySegment<TRow>[],
  entityId: string,
  pageSize: number,
): number | null {
  if (pageSize <= 0) return null
  const offset = dataRowOffsetForEntityInCategorySegments(segments, entityId)
  if (offset == null) return null
  return Math.floor(offset / pageSize)
}
