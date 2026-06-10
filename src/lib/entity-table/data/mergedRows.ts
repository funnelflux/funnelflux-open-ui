import type { ReportCell, ReportColumn, ReportRow } from '@/types/stats'
import type { OfferSource, Page, TrafficSource } from '@/types/entities'
import { getColumnMeta, resolveApiColumnId } from '@/components/ui-kit/data-table'

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

/** Rows rendered in category-strip tables (landers, offers, traffic sources, …). */
export type CategoryStripGridRow = EntityGridRow & {
  _isCategoryHeader?: boolean
  _categoryId?: string
}

function zeroFormattedLike(sample: string): string | null {
  const trimmed = sample.trim()
  if (!trimmed || trimmed === '—') return null

  const numericMatch = trimmed.match(/^([^0-9+.,-]*)([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)([^0-9.,]*)$/)
  if (!numericMatch) return null

  const [, prefix = '', numericPart = '', suffix = ''] = numericMatch
  const fractionDigits = numericPart.includes('.') ? numericPart.split('.')[1]?.length ?? 0 : 0
  return `${prefix}${(0).toFixed(fractionDigits)}${suffix}`
}

function zeroFormattedFromColumn(column: ReportColumn): string {
  const sampleColumnId = resolveApiColumnId(column.name)
  const meta = sampleColumnId ? getColumnMeta(sampleColumnId) : undefined
  if (meta?.fractionDigits !== undefined) {
    const value = (0).toFixed(meta.fractionDigits)
    if (meta.symbol === '$') return `$${value}`
    if (meta.symbol === '%') return `${value}%`
    return value
  }
  return '0'
}

function buildZeroFormats(
  statsById: Record<string, ReportCell[]>,
  reportColumns: ReportColumn[],
): string[] {
  const statsRows = Object.values(statsById)
  return reportColumns.map((column, index) => {
    if (index === 0 || column.type === 'grouping') return ''

    for (const cells of statsRows) {
      const formatted = cells[index]?.formatted
      if (!formatted) continue
      const zero = zeroFormattedLike(formatted)
      if (zero != null) return zero
    }

    return zeroFormattedFromColumn(column)
  })
}

export function buildMergedRows(
  entities: ListEntity[],
  statsById: Record<string, ReportCell[]>,
  reportColumns: ReportColumn[],
): EntityGridRow[] {
  const colCount = reportColumns.length
  const zeroFormats = buildZeroFormats(statsById, reportColumns)
  return entities.map((entity) => {
    const stats = statsById[entity.id]
    if (stats) {
      return { ...entity, cells: stats }
    }
    const cells: ReportCell[] = [{ raw: entity.id, formatted: entity.name }]
    for (let i = 1; i < colCount; i++) {
      cells.push({ raw: 0, formatted: zeroFormats[i] ?? '0' })
    }
    return { ...entity, cells }
  })
}

export function buildTotalsRow(totalsCells: ReportCell[] | null): EntityGridRow | null {
  if (!totalsCells) return null
  return { id: '__totals__', name: 'Totals', cells: totalsCells }
}

export function countLeadingGroupingColumns(columns: ReportColumn[]): number {
  let count = 0
  for (const column of columns) {
    if (column.type !== 'grouping') break
    count++
  }
  return count
}

export function entityCellIndexForReportColumns(columns: ReportColumn[]): number {
  const groupingCount = countLeadingGroupingColumns(columns)
  return Math.max(0, groupingCount - 1)
}

export function reportRowsToEntityGridRows(rows: ReportRow[], reportColumns: ReportColumn[]): EntityGridRow[] {
  const entityCellIndex = entityCellIndexForReportColumns(reportColumns)
  const categoryCellIndex =
    reportColumns[0]?.type === 'grouping' && reportColumns[0]?.name === 'Element: Lander-Offer Category'
      ? 0
      : -1

  return rows.map((row, index) => {
    const entityCell = row.cells[entityCellIndex]
    const id = String(entityCell?.raw ?? row.rowId ?? index)
    const entity: EntityGridRow = {
      id,
      name: entityCell?.formatted ?? id,
      cells: row.cells,
    }
    if (categoryCellIndex >= 0) {
      const categoryId = row.cells[categoryCellIndex]?.raw
      if (categoryId != null && String(categoryId) !== '') {
        entity.categoryId = String(categoryId)
      }
    }
    return entity
  })
}

type PageListEntity = Pick<Page, 'idPage' | 'pageName'> & {
  isArchived?: boolean
  categoryId?: string
  url?: string
  payout?: number
}

export function pagesToListEntities(pages: PageListEntity[]): ListEntity[] {
  return pages.map((page) => {
    const entity: ListEntity = {
      id: page.idPage,
      name: page.pageName,
      isArchived: page.isArchived === true,
    }
    if (page.categoryId != null && page.categoryId !== '') {
      entity.categoryId = page.categoryId
    }
    if (page.url != null && page.url !== '') {
      entity.url = page.url
    }
    if (page.payout != null) {
      entity.payout = page.payout
    }
    return entity
  })
}

export function offerSourcesToListEntities(items: OfferSource[]): ListEntity[] {
  return items.map((os) => ({
    id: os.idOfferSource,
    name: os.offerSourceName,
    isArchived: os.isArchived === true,
  }))
}

/** Map a saved traffic source (v2 shape) to a grid {@link ListEntity}. */
export function trafficSourceToListEntity(trafficSource: TrafficSource): ListEntity {
  const entity: ListEntity = {
    id: trafficSource.idTrafficSource,
    name: trafficSource.trafficSourceName,
    isArchived: trafficSource.isArchived === true,
  }
  const categoryId = trafficSource.idCategory
  if (categoryId != null && String(categoryId) !== '') {
    entity.categoryId = String(categoryId)
  }
  return entity
}

/** Map v2 GET /data/trafficsource/list/ rows to grid entities (includes optional categoryId). */
export function trafficSourceListToListEntities(items: unknown[]): ListEntity[] {
  return (items as Array<Record<string, unknown>>).map((row) => {
    const entity: ListEntity = {
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      isArchived: row.isArchived === true,
    }
    const cat = row.categoryId
    if (cat != null && String(cat) !== '') {
      entity.categoryId = String(cat)
    }
    return entity
  })
}
