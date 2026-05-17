import { flexRender, type CellContext, type ColumnDef } from '@tanstack/react-table'
import type { EntityGridRow } from '@/api/hooks/useEntityGrid'
import type { CategorySegment } from '@/lib/entity-table/engine/paginateCategorySegments'
import type { ReportCell } from '@/types/stats'

/**
 * Group flat entity rows by display category name and build segments for
 * {@link paginateCategorySegments} (strip headers + data rows).
 */
export function buildCategorySegmentsFromRows<T extends EntityGridRow>(
  listFiltered: T[],
  categoryMap: Map<string, string>,
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
    const header = {
      id: `cat:${cid || 'uncat'}`,
      name: catName,
      cells: [] as ReportCell[],
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

function withCategoryStripCell<T extends { _isCategoryHeader?: boolean }>(
  col: ColumnDef<T, unknown>,
): ColumnDef<T, unknown> {
  return {
    ...col,
    cell: (info) => {
      if (info.row.original._isCategoryHeader) {
        return renderCategoryStripMetricPlaceholder()
      }
      return renderOriginalCell(col, info)
    },
  }
}

/** Metric cells show em dash on category strip rows (no aggregates in v1). */
export function mapStatColsForCategoryStrip<T extends { _isCategoryHeader?: boolean }>(
  cols: ColumnDef<T, unknown>[],
): ColumnDef<T, unknown>[] {
  return cols.map(withCategoryStripCell)
}
