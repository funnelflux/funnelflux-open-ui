import { describe, expect, it } from 'vitest'
import { extractDashboardChartData } from '@/lib/dashboard/summaryReport'
import type { Report, ReportCell } from '@/types/stats'

function cell(value: string | number): ReportCell {
  return { raw: value, formatted: String(value) }
}

function report(rows: Array<Array<string | number>>): Report {
  return {
    columns: [
      { name: 'Time: Date', type: 'grouping' },
      { name: 'Time: HH:MM', type: 'grouping' },
      { name: 'Entrances', type: 'metric' },
      { name: 'Lander Clicks', type: 'metric' },
      { name: 'Offer Clicks', type: 'metric' },
      { name: 'Conv.', type: 'metric' },
      { name: 'Revenue', type: 'metric' },
      { name: 'Cost', type: 'metric' },
      { name: 'ROI', type: 'metric' },
    ],
    rows: rows.map((row, index) => ({
      rowId: String(index),
      cells: row.map(cell),
    })),
    totals: { cells: [] },
    rowsReturned: rows.length,
    rowsTotal: rows.length,
  }
}

describe('extractChartData', () => {
  it('sorts daily chart points oldest to newest', () => {
    const points = extractDashboardChartData(report([
      ['2026-06-04', '', 40, 0, 0, 0, 0, 0, 0],
      ['2026-06-02', '', 20, 0, 0, 0, 0, 0, 0],
      ['2026-06-03', '', 30, 0, 0, 0, 0, 0, 0],
    ]), 'daily')

    expect(points.map((point) => point.date)).toEqual(['06-02', '06-03', '06-04'])
    expect(points.map((point) => point.visits)).toEqual([20, 30, 40])
  })

  it('sorts hourly chart points by date and hour', () => {
    const points = extractDashboardChartData(report([
      ['2026-06-04', '12:00', 12, 0, 0, 0, 0, 0, 0],
      ['2026-06-04', '08:00', 8, 0, 0, 0, 0, 0, 0],
      ['2026-06-03', '23:00', 23, 0, 0, 0, 0, 0, 0],
    ]), 'hourly')

    expect(points.map((point) => point.date)).toEqual(['06-03 23:00', '06-04 08:00', '06-04 12:00'])
    expect(points.map((point) => point.visits)).toEqual([23, 8, 12])
  })
})
