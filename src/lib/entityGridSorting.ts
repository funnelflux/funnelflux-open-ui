import type { SortingState } from '@tanstack/react-table'
import { cellRaw, resolveApiColumnId } from '@/components/ui-kit/data-table'
import type { EntityGridRow } from '@/lib/entityGridUtils'
import type { ReportColumn } from '@/types/stats'

type SortValue = number | string

function buildMetricColumnIndex(reportColumns: ReportColumn[]): Map<string, number> {
  const indexById = new Map<string, number>()
  for (let i = 1; i < reportColumns.length; i++) {
    const apiName = reportColumns[i]?.name
    if (!apiName) continue
    const columnId = resolveApiColumnId(apiName) ?? `col-${i}`
    if (!indexById.has(columnId)) {
      indexById.set(columnId, i)
    }
  }
  return indexById
}

function sortValueForRow(row: EntityGridRow, columnId: string, metricColumnIndex: Map<string, number>): SortValue {
  if (columnId === 'name') return row.name
  if (columnId === 'id') return row.id

  const cellIndex = metricColumnIndex.get(columnId)
  if (cellIndex != null) {
    return cellRaw(row.cells[cellIndex])
  }

  const value = row[columnId]
  if (typeof value === 'number') return value
  if (typeof value === 'string') return value
  return ''
}

function compareSortValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export function sortEntityGridRows<T extends EntityGridRow>(
  rows: T[],
  reportColumns: ReportColumn[],
  sorting: SortingState,
): T[] {
  if (sorting.length === 0 || rows.length < 2) return rows

  const metricColumnIndex = buildMetricColumnIndex(reportColumns)
  return rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .sort((a, b) => {
      for (const sort of sorting) {
        const result = compareSortValues(
          sortValueForRow(a.row, sort.id, metricColumnIndex),
          sortValueForRow(b.row, sort.id, metricColumnIndex),
        )
        if (result !== 0) return sort.desc ? -result : result
      }
      return a.originalIndex - b.originalIndex
    })
    .map(({ row }) => row)
}
