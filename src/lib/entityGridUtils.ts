import type { ReportCell, ReportColumn } from '@/types/stats'
import type { Page } from '@/types/entities'

export interface ListEntity {
  id: string
  name: string
  [key: string]: unknown
}

export interface EntityGridRow {
  id: string
  name: string
  cells: ReportCell[]
  [key: string]: unknown
}

export function buildMergedRows(
  entities: ListEntity[],
  statsById: Record<string, ReportCell[]>,
  reportColumns: ReportColumn[],
): EntityGridRow[] {
  const colCount = reportColumns.length
  return entities.map((entity) => {
    const stats = statsById[entity.id]
    if (stats) {
      return { ...entity, cells: stats }
    }
    const cells: ReportCell[] = [{ raw: entity.id, formatted: entity.name }]
    for (let i = 1; i < colCount; i++) {
      cells.push({ raw: 0, formatted: '0' })
    }
    return { ...entity, cells }
  })
}

export function buildTotalsRow(totalsCells: ReportCell[] | null): EntityGridRow | null {
  if (!totalsCells) return null
  return { id: '__totals__', name: 'Totals', cells: totalsCells }
}

export function pagesToListEntities(pages: Page[]): ListEntity[] {
  return pages.map((page) => {
    const entity: ListEntity = {
      id: page.idPage,
      name: page.pageName,
      isArchived: page.isArchived === true,
    }
    if (page.categoryId != null && page.categoryId !== '') {
      entity.categoryId = page.categoryId
    }
    return entity
  })
}
