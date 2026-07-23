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

  const legacyRow = row as unknown as Record<string, ReportCell | undefined>
  const cells: ReportCell[] = []
  for (let i = 0; i < columnCount; i++) {
    cells.push(legacyRow[String(i)] ?? EMPTY)
  }
  return cells
}
