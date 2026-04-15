import type { SortingState } from '@tanstack/react-table'
import { resolveApiColumnId } from '@/components/ui-kit/data-table'
import type { DrilldownRequest, Report, RequestSorting } from '@/types/stats'

/** API metric key used by PHP `MetricNames::ENTRANCES` (Visits column in the UI registry maps here). */
const SORT_API_ENTRANCES = 'Entrances'

function singleSort(columnName: string, desc: boolean): RequestSorting {
  return {
    sortingColumns: [{ columnName, order: desc ? 'desc' : 'asc' }],
  }
}

/**
 * Map TanStack column ids (e.g. `visits`, `col-2`) to drilldown API sorting (`sortingColumns` with metric / grouping names).
 */
export function drilldownSortParamFromReport(
  sorting: SortingState,
  reportColumns: Report['columns'] | null | undefined,
): DrilldownRequest['sorting'] {
  const sortCol = sorting[0]
  if (!sortCol) return undefined

  const desc = !!sortCol.desc

  if (reportColumns?.length) {
    const columnIds = [
      'name',
      ...reportColumns.slice(1).map((col, i) => resolveApiColumnId(col.name) ?? `col-${i + 1}`),
    ]
    const idx = columnIds.findIndex((id) => String(id) === String(sortCol.id))
    if (idx >= 0) {
      const col = reportColumns[idx]
      if (col?.name) {
        return singleSort(col.name, desc)
      }
    }
  }

  if (String(sortCol.id) === 'visits') {
    return singleSort(SORT_API_ENTRANCES, desc)
  }

  const colMatch = /^col-(\d+)$/.exec(String(sortCol.id))
  if (colMatch && reportColumns?.length) {
    const i = Number(colMatch[1])
    const col = reportColumns[i]
    if (col?.name) {
      return singleSort(col.name, desc)
    }
  }

  return undefined
}
