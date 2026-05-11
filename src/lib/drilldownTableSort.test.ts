import { describe, expect, it } from 'vitest'
import type { SortingState } from '@tanstack/react-table'
import type { ReportColumn } from '@/types/stats'
import { drilldownSortParamFromReport } from './drilldownTableSort'

function sort(id: string, desc = false): SortingState {
  return [{ id, desc }]
}

describe('drilldownSortParamFromReport', () => {
  const reportColumns = [
    { name: 'Campaign', type: 'grouping' },
    { name: 'Traffic Source', type: 'grouping' },
    { name: 'Entrances', type: 'metric' },
    { name: 'CPCE1', type: 'metric' },
    { name: 'Unmapped Metric', type: 'metric' },
  ] as ReportColumn[]

  it('maps the name column to the first grouping column', () => {
    expect(drilldownSortParamFromReport(sort('name'), reportColumns)).toEqual({
      sortingColumns: [{ columnName: 'Campaign', order: 'asc' }],
    })
  })

  it('maps grouping column ids to matching report columns', () => {
    expect(drilldownSortParamFromReport(sort('grouping-1', true), reportColumns)).toEqual({
      sortingColumns: [{ columnName: 'Traffic Source', order: 'desc' }],
    })
  })

  it('maps known API metric aliases back to their report column name', () => {
    expect(drilldownSortParamFromReport(sort('visits', true), reportColumns)).toEqual({
      sortingColumns: [{ columnName: 'Entrances', order: 'desc' }],
    })
  })

  it('maps custom event metric aliases back to their report column name', () => {
    expect(drilldownSortParamFromReport(sort('costPerEvent1'), reportColumns)).toEqual({
      sortingColumns: [{ columnName: 'CPCE1', order: 'asc' }],
    })
  })

  it('falls back to col-N ids for unmapped report columns', () => {
    expect(drilldownSortParamFromReport(sort('col-4', true), reportColumns)).toEqual({
      sortingColumns: [{ columnName: 'Unmapped Metric', order: 'desc' }],
    })
  })

  it('returns undefined when no sorting is active', () => {
    expect(drilldownSortParamFromReport([], reportColumns)).toBeUndefined()
  })
})
