import { countLeadingGroupingColumns } from '@/components/ui-kit/data-table/columnDefs'
import { resolveApiColumnId } from '@/lib/drilldownMetrics'
import type { RequestColumnFilters } from '@/types/stats'

export type ColumnFilterOperator = '>' | '>=' | '<' | '<=' | '=' | '!='

export type TextColumnFilterOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith'

export type ColumnFilterValue =
  | {
      kind: 'numeric'
      operator: ColumnFilterOperator
      value: string
    }
  | {
      kind: 'text'
      operator: TextColumnFilterOperator
      value: string
    }

export const COLUMN_FILTER_OPERATOR_OPTIONS: ReadonlyArray<{
  label: string
  value: ColumnFilterOperator
}> = [
  { label: '>', value: '>' },
  { label: '>=', value: '>=' },
  { label: '<', value: '<' },
  { label: '<=', value: '<=' },
  { label: '=', value: '=' },
  { label: '!=', value: '!=' },
]

export const TEXT_COLUMN_FILTER_OPERATOR_OPTIONS: ReadonlyArray<{
  label: string
  value: TextColumnFilterOperator
}> = [
  { label: 'Contains', value: 'contains' },
  { label: 'Equals', value: 'equals' },
  { label: 'Starts with', value: 'startsWith' },
  { label: 'Ends with', value: 'endsWith' },
]

export function encodeNumericColumnFilterString(
  operator: ColumnFilterOperator,
  value: string,
): string {
  const trimmed = value.trim()
  if (operator === '=') {
    return `=${trimmed}`
  }
  return `${operator}${trimmed}`
}

export function encodeTextColumnFilterString(
  operator: TextColumnFilterOperator,
  value: string,
): string {
  const trimmed = value.trim().replace(/\*/g, '')
  if (!trimmed) {
    return ''
  }
  switch (operator) {
    case 'contains':
      return `*${trimmed}*`
    case 'startsWith':
      return `${trimmed}*`
    case 'endsWith':
      return `*${trimmed}`
    case 'equals':
    default:
      return trimmed
  }
}

export function buildColumnIdToApiNameMap(
  reportColumns: { name: string; type?: string }[],
): Map<string, string> {
  const leading = countLeadingGroupingColumns(reportColumns)
  const map = new Map<string, string>()

  for (let index = 0; index < leading; index++) {
    map.set(`grouping-${index}`, reportColumns[index]!.name)
  }

  for (let index = leading; index < reportColumns.length; index++) {
    const column = reportColumns[index]!
    const columnId = resolveApiColumnId(column.name) ?? `col-${index}`
    map.set(columnId, column.name)
  }

  return map
}

/** @deprecated Use {@link buildColumnIdToApiNameMap}. */
export function buildMetricColumnIdToApiNameMap(
  reportColumns: { name: string; type?: string }[],
): Map<string, string> {
  return buildColumnIdToApiNameMap(reportColumns)
}

export function buildColumnFiltersParam(
  filtersByColumnId: Record<string, ColumnFilterValue>,
  reportColumns: { name: string; type?: string }[] | null | undefined,
): RequestColumnFilters | undefined {
  if (!reportColumns?.length) {
    return undefined
  }

  const idToApiName = buildColumnIdToApiNameMap(reportColumns)
  const filterColumns = Object.entries(filtersByColumnId)
    .map(([columnId, filterValue]) => {
      if (!filterValue.value.trim()) {
        return null
      }
      const columnName = idToApiName.get(columnId)
      if (!columnName) {
        return null
      }

      const filter =
        filterValue.kind === 'text'
          ? encodeTextColumnFilterString(filterValue.operator, filterValue.value)
          : encodeNumericColumnFilterString(filterValue.operator, filterValue.value)

      if (!filter) {
        return null
      }

      return { columnName, filter }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  if (filterColumns.length === 0) {
    return undefined
  }

  return { filterColumns }
}

export function isValidColumnFilterValue(value: ColumnFilterValue): boolean {
  const trimmed = value.value.trim()
  if (!trimmed) {
    return false
  }
  if (value.kind === 'text') {
    return true
  }
  const numeric = Number(trimmed)
  return Number.isFinite(numeric)
}

export function normalizeColumnFilterValue(
  value: ColumnFilterValue | undefined,
  kind: ColumnFilterValue['kind'],
): ColumnFilterValue | undefined {
  if (!value || value.kind !== kind) {
    return undefined
  }
  return value
}
