import { flexRender, type CellContext, type ColumnDef } from '@tanstack/react-table'
import type { EntityGridRow } from '@/api/hooks/useEntityGrid'
import { aggregateChildCells } from '@/lib/entity-table/data/aggregateChildCells'
import type { CategorySegment } from '@/lib/entity-table/engine/paginateCategorySegments'
import type { ReportCell, ReportColumn } from '@/types/stats'

/**
 * Group flat entity rows by display category name and build segments for
 * {@link paginateCategorySegments} (strip headers + data rows).
 */
export function buildCategorySegmentsFromRows<T extends EntityGridRow>(
  listFiltered: T[],
  categoryMap: Map<string, string>,
  reportColumns: ReportColumn[] = [],
): CategorySegment<T>[] {
  const grouped = new Map<string, T[]>()
  for (const row of listFiltered) {
    const catId = (row.categoryId as string) ?? ''
    const catName = catId ? (categoryMap.get(catId) ?? 'Unknown') : 'Uncategorized'
    if (!grouped.has(catName)) grouped.set(catName, [])
    grouped.get(catName)!.push(row)
  }

  const out: CategorySegment<T>[] = []
  for (const [catName, catRows] of grouped) {
    const first = catRows[0]
    const cid = (first?.categoryId as string) ?? ''
    const groupingCell: ReportCell = { raw: cid || 'uncat', formatted: catName }
    const header = {
      id: `cat:${cid || 'uncat'}`,
      name: catName,
      cells: reportColumns.length > 0
        ? aggregateChildCells(catRows, reportColumns, groupingCell)
        : ([] as ReportCell[]),
      _isCategoryHeader: true,
      _categoryId: cid,
      categoryId: cid,
    } as unknown as T
    out.push({ header, items: catRows })
  }
  return out
}

function renderCategoryStripMetricPlaceholder() {
  return <span className="text-muted-foreground">—</span>
}

function renderOriginalCell<T>(col: ColumnDef<T, unknown>, info: CellContext<T, unknown>) {
  return col.cell != null ? flexRender(col.cell as never, info) : String(info.getValue() ?? '')
}

function categoryHeaderHasMetricCells(row: { cells?: ReportCell[] }): boolean {
  return (row.cells?.length ?? 0) > 1
}

function withCategoryStripCell<T extends { _isCategoryHeader?: boolean; cells?: ReportCell[] }>(
  col: ColumnDef<T, unknown>,
): ColumnDef<T, unknown> {
  return {
    ...col,
    cell: (info) => {
      if (info.row.original._isCategoryHeader && !categoryHeaderHasMetricCells(info.row.original)) {
        return renderCategoryStripMetricPlaceholder()
      }
      return renderOriginalCell(col, info)
    },
  }
}

/** Metric cells on category strip rows show child totals when present, otherwise em dash. */
export function mapStatColsForCategoryStrip<T extends { _isCategoryHeader?: boolean; cells?: ReportCell[] }>(
  cols: ColumnDef<T, unknown>[],
): ColumnDef<T, unknown>[] {
  return cols.map(withCategoryStripCell)
}
