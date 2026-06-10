import type { SortingState } from '@tanstack/react-table'
import { sortAssetTableRows } from '@/lib/entity-table/data/sorting'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import type { CategorySegment } from '@/lib/entity-table/engine/paginateCategorySegments'
import type { ReportColumn } from '@/types/stats'

function compareSegmentHeaders<T extends EntityGridRow>(
  headerA: T,
  headerB: T,
  reportColumns: ReportColumn[],
  sorting: SortingState,
): number {
  const ordered = sortAssetTableRows([headerA, headerB], reportColumns, sorting)
  if (ordered[0] === headerA && ordered[1] === headerB) return -1
  if (ordered[0] === headerB && ordered[1] === headerA) return 1
  return 0
}

/** Sort items within each segment, then order segments by aggregated header metrics. */
export function sortCategorySegments<T extends EntityGridRow>(
  segments: CategorySegment<T>[],
  reportColumns: ReportColumn[],
  sorting: SortingState,
): CategorySegment<T>[] {
  const withSortedItems = segments.map((segment) => ({
    ...segment,
    items: sortAssetTableRows(segment.items, reportColumns, sorting),
  }))

  if (withSortedItems.length < 2 || sorting.length === 0) return withSortedItems

  return [...withSortedItems].sort((segA, segB) => {
    if (!segA.header || !segB.header) return 0
    return compareSegmentHeaders(segA.header, segB.header, reportColumns, sorting)
  })
}
