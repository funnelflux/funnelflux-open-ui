import { describe, expect, it } from 'vitest'
import { aggregateChildCells } from '@/lib/entity-table/data/aggregateChildCells'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import type { ReportColumn } from '@/types/stats'

function child(id: string, visits: number, revenue: number, cost: number): EntityGridRow {
  return {
    id,
    name: id,
    cells: [
      { raw: id, formatted: id },
      { raw: visits, formatted: String(visits) },
      { raw: revenue, formatted: `$${revenue.toFixed(2)}` },
      { raw: cost, formatted: `$${cost.toFixed(2)}` },
    ],
  }
}

describe('aggregateChildCells', () => {
  const columns: ReportColumn[] = [
    { name: 'Element: Funnel', type: 'grouping' },
    { name: 'Entrances', type: 'metric' },
    { name: 'Revenue', type: 'metric' },
    { name: 'Cost', type: 'metric' },
    { name: 'P/L', type: 'metric' },
    { name: 'ROI', type: 'metric' },
  ]

  it('sums additive metrics and recomputes P/L and ROI', () => {
    const cells = aggregateChildCells(
      [child('a', 10, 100, 40), child('b', 5, 50, 10)],
      columns,
      { raw: 'camp', formatted: 'Campaign' },
    )

    expect(cells[1]).toMatchObject({ raw: 15 })
    expect(cells[2]).toMatchObject({ raw: 150 })
    expect(cells[3]).toMatchObject({ raw: 50 })
    expect(cells[4]).toMatchObject({ raw: 100 })
    expect(cells[5]).toMatchObject({ raw: 200 })
  })
})
