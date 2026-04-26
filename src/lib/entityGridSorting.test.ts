import { describe, expect, it } from 'vitest'
import { sortEntityGridRows } from './entityGridSorting'
import type { EntityGridRow } from './entityGridUtils'
import type { ReportColumn } from '@/types/stats'

const columns = [
  { name: 'Lander', type: 'grouping' },
  { name: 'Visits' },
  { name: 'ROI' },
] as ReportColumn[]

function row(id: string, name: string, visits: number, roi: number): EntityGridRow {
  return {
    id,
    name,
    cells: [
      { raw: id, formatted: name },
      { raw: visits, formatted: String(visits) },
      { raw: roi, formatted: `${roi}%` },
    ],
  }
}

describe('sortEntityGridRows', () => {
  it('sorts metric columns across the full row set', () => {
    const rows = [
      row('a', 'Zero A', 0, 0),
      row('b', 'Top', 449, -100),
      row('c', 'Mid', 131, -100),
    ]

    const sorted = sortEntityGridRows(rows, columns, [{ id: 'visits', desc: true }])

    expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })

  it('keeps stable order for equal metric values', () => {
    const rows = [
      row('a', 'First', 0, 0),
      row('b', 'Second', 0, 0),
    ]

    const sorted = sortEntityGridRows(rows, columns, [{ id: 'visits', desc: true }])

    expect(sorted.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('sorts entity names as strings', () => {
    const rows = [
      row('2', 'Lander 10', 0, 0),
      row('1', 'Lander 2', 0, 0),
    ]

    const sorted = sortEntityGridRows(rows, columns, [{ id: 'name', desc: false }])

    expect(sorted.map((r) => r.id)).toEqual(['1', '2'])
  })
})
