import type { SortingState } from '@tanstack/react-table'
import type { ReportColumn } from '@/types/stats'
import { drilldownSortParamFromReport } from '@/lib/drilldownTableSort'
import { sortEntityGridRows } from '@/lib/entity-table/data/querySorting'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'

export { drilldownSortParamFromReport }

/** Server-side drilldown sort payload from the current table sort + report columns. */
export function serverSortFromTableSort(
  sorting: SortingState,
  reportColumns: ReportColumn[] | null | undefined,
) {
  return drilldownSortParamFromReport(sorting, reportColumns ?? null)
}

/**
 * Client-side sort for the current row set (search-filtered chunk, tree parents, etc.).
 * Uses numeric-aware comparison on {@link EntityGridRow} cells when possible.
 */
export function sortAssetTableRows<T extends EntityGridRow>(
  rows: T[],
  reportColumns: ReportColumn[],
  sorting: SortingState,
): T[] {
  return sortEntityGridRows(rows, reportColumns, sorting) as T[]
}
