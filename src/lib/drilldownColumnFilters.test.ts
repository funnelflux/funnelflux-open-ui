import { describe, expect, it } from 'vitest'
import {
  buildColumnFiltersParam,
  buildColumnIdToApiNameMap,
  encodeNumericColumnFilterString,
  encodeTextColumnFilterString,
} from '@/lib/drilldownColumnFilters'

describe('encodeNumericColumnFilterString', () => {
  it('prefixes equality with =', () => {
    expect(encodeNumericColumnFilterString('=', '20')).toBe('=20')
  })

  it('concatenates comparison operators', () => {
    expect(encodeNumericColumnFilterString('>=', '2')).toBe('>=2')
    expect(encodeNumericColumnFilterString('>', '20')).toBe('>20')
  })
})

describe('encodeTextColumnFilterString', () => {
  it('wraps text with wildcards for contains/starts/ends', () => {
    expect(encodeTextColumnFilterString('contains', 'funnel')).toBe('*funnel*')
    expect(encodeTextColumnFilterString('startsWith', 'fun')).toBe('fun*')
    expect(encodeTextColumnFilterString('endsWith', 'nel')).toBe('*nel')
    expect(encodeTextColumnFilterString('equals', 'My Funnel')).toBe('My Funnel')
  })
})

describe('buildColumnIdToApiNameMap', () => {
  it('maps grouping and metric column ids to API names', () => {
    const map = buildColumnIdToApiNameMap([
      { name: 'Element: Funnel', type: 'grouping' },
      { name: 'Entrances', type: 'metric' },
      { name: 'Revenue', type: 'metric' },
    ])

    expect(map.get('grouping-0')).toBe('Element: Funnel')
    expect(map.get('visits')).toBe('Entrances')
    expect(map.get('revenue')).toBe('Revenue')
  })
})

describe('buildColumnFiltersParam', () => {
  it('builds filterColumns for metric and grouping column ids', () => {
    const reportColumns = [
      { name: 'Element: Funnel', type: 'grouping' },
      { name: 'Revenue', type: 'metric' },
      { name: 'Entrances', type: 'metric' },
    ]

    const result = buildColumnFiltersParam(
      {
        'grouping-0': { kind: 'text', operator: 'contains', value: 'test' },
        revenue: { kind: 'numeric', operator: '>', value: '20' },
        visits: { kind: 'numeric', operator: '>=', value: '2' },
      },
      reportColumns,
    )

    expect(result).toEqual({
      filterColumns: [
        { columnName: 'Element: Funnel', filter: '*test*' },
        { columnName: 'Revenue', filter: '>20' },
        { columnName: 'Entrances', filter: '>=2' },
      ],
    })
  })

  it('returns undefined when no filters are set', () => {
    expect(buildColumnFiltersParam({}, [{ name: 'Revenue', type: 'metric' }])).toBeUndefined()
  })
})
