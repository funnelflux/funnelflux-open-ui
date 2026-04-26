import type { ReportCell, ReportColumn } from '@/types/stats'
import type { OfferSource, Page } from '@/types/entities'
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

function zeroFormattedLike(sample: string): string | null {
  const trimmed = sample.trim()
  if (!trimmed || trimmed === '—') return null

  const numericMatch = trimmed.match(/^([^0-9+\-.,]*)([+\-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)([^0-9.,]*)$/)
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

export function offerSourcesToListEntities(items: OfferSource[]): ListEntity[] {
  return items.map((os) => ({
    id: os.idOfferSource,
    name: os.offerSourceName,
    isArchived: os.isArchived === true,
  }))
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
