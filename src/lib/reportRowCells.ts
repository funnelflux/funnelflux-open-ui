import type { ReportCell, ReportRow } from '@/types/stats'

const EMPTY: ReportCell = { raw: '', formatted: '' }

/**
 * Normalize a stats API row to a dense `cells` array.
 * V2 JSON uses `row.cells[]`; older responses used numeric keys `"0"`, `"1"`, … on the row object.
 */
export function reportRowToCells(row: ReportRow, columnCount: number): ReportCell[] {
  if (Array.isArray(row.cells)) {
    const cells: ReportCell[] = []
    for (let i = 0; i < columnCount; i++) {
      cells.push(row.cells[i] ?? EMPTY)
    }
    return cells
  }

  const cells: ReportCell[] = []
  for (let i = 0; i < columnCount; i++) {
    const cell = row[String(i)] as ReportCell | undefined
    cells.push(cell ?? EMPTY)
  }
  return cells
}
