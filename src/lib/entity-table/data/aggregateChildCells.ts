import { cellRaw, resolveApiColumnId } from '@/components/ui-kit/data-table'
import { getColumnMeta } from '@/components/ui-kit/data-table/columnRegistry'
import type { EntityGridRow } from '@/lib/entity-table/data/mergedRows'
import type { ReportCell, ReportColumn } from '@/types/stats'

function columnIdAt(reportColumns: ReportColumn[], index: number): string | null {
  return resolveApiColumnId(reportColumns[index]?.name ?? '') ?? null
}

function indexForColumnId(reportColumns: ReportColumn[], columnId: string): number | null {
  for (let i = 0; i < reportColumns.length; i++) {
    if (columnIdAt(reportColumns, i) === columnId) return i
  }
  return null
}

function formatMetricValue(value: number, columnId: string | null): string {
  const meta = columnId ? getColumnMeta(columnId) : undefined
  const digits = meta?.fractionDigits ?? (Number.isInteger(value) ? 0 : 2)
  const fixed = value.toFixed(digits)
  if (meta?.symbol === '$') {
    return value < 0 ? `-$${Math.abs(value).toFixed(digits)}` : `$${fixed}`
  }
  if (meta?.symbol === '%') {
    return `${fixed}%`
  }
  return fixed
}

function metricRecord(reportColumns: ReportColumn[], sumsByIndex: number[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = 0; i < reportColumns.length; i++) {
    const id = columnIdAt(reportColumns, i)
    if (id) out[id] = sumsByIndex[i] ?? 0
  }
  return out
}

function setMetric(
  reportColumns: ReportColumn[],
  sumsByIndex: number[],
  metrics: Record<string, number>,
  columnId: string,
  value: number,
): void {
  metrics[columnId] = value
  const index = indexForColumnId(reportColumns, columnId)
  if (index != null) sumsByIndex[index] = value
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : (numerator / denominator) * 100
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

/** Recompute derived metrics from summed base metrics (matches drilldown rollup semantics). */
function applyDerivedMetrics(reportColumns: ReportColumn[], sumsByIndex: number[]): void {
  const metrics = metricRecord(reportColumns, sumsByIndex)

  const profitAndLoss = metrics.revenue - metrics.cost
  setMetric(reportColumns, sumsByIndex, metrics, 'profitAndLoss', profitAndLoss)

  setMetric(
    reportColumns,
    sumsByIndex,
    metrics,
    'returnOnInvestment',
    metrics.cost !== 0 ? (profitAndLoss / metrics.cost) * 100 : 0,
  )

  setMetric(reportColumns, sumsByIndex, metrics, 'conversionPerVisit', rate(metrics.conversions, metrics.visits))
  setMetric(reportColumns, sumsByIndex, metrics, 'conversionPerUniqueVisitor', rate(metrics.conversions, metrics.visitors))
  setMetric(reportColumns, sumsByIndex, metrics, 'conversionPerLanderView', rate(metrics.conversions, metrics.landerViews))
  setMetric(
    reportColumns,
    sumsByIndex,
    metrics,
    'conversionPerUniqueLanderView',
    rate(metrics.conversions, metrics.landerViewsUnique),
  )
  setMetric(reportColumns, sumsByIndex, metrics, 'conversionPerOfferView', rate(metrics.conversions, metrics.offerViews))
  setMetric(
    reportColumns,
    sumsByIndex,
    metrics,
    'conversionPerUniqueOfferView',
    rate(metrics.conversions, metrics.offerViewsUnique),
  )
  setMetric(reportColumns, sumsByIndex, metrics, 'conversionRateNodeViews', rate(metrics.conversions, metrics.nodeViews))
  setMetric(
    reportColumns,
    sumsByIndex,
    metrics,
    'conversionRateNodeViewsUnique',
    rate(metrics.conversions, metrics.nodeViewsUnique),
  )

  setMetric(reportColumns, sumsByIndex, metrics, 'landerClickthroughRate', rate(metrics.landerClicks, metrics.landerViews))
  setMetric(
    reportColumns,
    sumsByIndex,
    metrics,
    'landerClickthroughRateUnique',
    rate(metrics.landerClicksUnique, metrics.landerViewsUnique),
  )
  setMetric(reportColumns, sumsByIndex, metrics, 'offerClickthroughRate', rate(metrics.offerClicks, metrics.offerViews))
  setMetric(
    reportColumns,
    sumsByIndex,
    metrics,
    'offerClickthroughRateUnique',
    rate(metrics.offerClicksUnique, metrics.offerViewsUnique),
  )

  setMetric(reportColumns, sumsByIndex, metrics, 'revenuePerVisit', ratio(metrics.revenue, metrics.visits))
  setMetric(reportColumns, sumsByIndex, metrics, 'revenuePerUniqueVisitor', ratio(metrics.revenue, metrics.visitors))
  setMetric(reportColumns, sumsByIndex, metrics, 'revenuePerLanderView', ratio(metrics.revenue, metrics.landerViews))
  setMetric(reportColumns, sumsByIndex, metrics, 'revenuePerUniqueLanderView', ratio(metrics.revenue, metrics.landerViewsUnique))
  setMetric(reportColumns, sumsByIndex, metrics, 'revenuePerOfferView', ratio(metrics.revenue, metrics.offerViews))
  setMetric(reportColumns, sumsByIndex, metrics, 'revenuePerUniqueOfferView', ratio(metrics.revenue, metrics.offerViewsUnique))
  setMetric(reportColumns, sumsByIndex, metrics, 'revenuePerNodeView', ratio(metrics.revenue, metrics.nodeViews))
  setMetric(reportColumns, sumsByIndex, metrics, 'revenuePerUniqueNodeView', ratio(metrics.revenue, metrics.nodeViewsUnique))
  setMetric(reportColumns, sumsByIndex, metrics, 'revenuePerConversion', ratio(metrics.revenue, metrics.conversions))

  setMetric(reportColumns, sumsByIndex, metrics, 'costPerVisit', ratio(metrics.cost, metrics.visits))
  setMetric(reportColumns, sumsByIndex, metrics, 'costPerUniqueVisitor', ratio(metrics.cost, metrics.visitors))
  setMetric(reportColumns, sumsByIndex, metrics, 'costPerLanderView', ratio(metrics.cost, metrics.landerViews))
  setMetric(reportColumns, sumsByIndex, metrics, 'costPerUniqueLanderView', ratio(metrics.cost, metrics.landerViewsUnique))
  setMetric(reportColumns, sumsByIndex, metrics, 'costPerOfferView', ratio(metrics.cost, metrics.offerViews))
  setMetric(reportColumns, sumsByIndex, metrics, 'costPerUniqueOfferView', ratio(metrics.cost, metrics.offerViewsUnique))
  setMetric(reportColumns, sumsByIndex, metrics, 'costPerNodeView', ratio(metrics.cost, metrics.nodeViews))
  setMetric(reportColumns, sumsByIndex, metrics, 'costPerUniqueNodeView', ratio(metrics.cost, metrics.nodeViewsUnique))
  setMetric(reportColumns, sumsByIndex, metrics, 'costPerConversion', ratio(metrics.cost, metrics.conversions))
}

/**
 * Sum child row metrics into one cell array for a category/campaign header row.
 * Grouping column 0 is supplied by the caller; metrics are summed then derived columns recomputed.
 */
export function aggregateChildCells(
  children: EntityGridRow[],
  reportColumns: ReportColumn[],
  groupingCell: ReportCell,
): ReportCell[] {
  const colCount = reportColumns.length
  if (colCount === 0 || children.length === 0) {
    return [groupingCell]
  }

  const sumsByIndex = new Array<number>(colCount).fill(0)
  sumsByIndex[0] = cellRaw(groupingCell)

  for (const child of children) {
    for (let i = 1; i < colCount; i++) {
      if (reportColumns[i]?.type === 'grouping') continue
      sumsByIndex[i] += cellRaw(child.cells[i])
    }
  }

  applyDerivedMetrics(reportColumns, sumsByIndex)

  const cells: ReportCell[] = [groupingCell]
  for (let i = 1; i < colCount; i++) {
    if (reportColumns[i]?.type === 'grouping') {
      cells.push(children[0]?.cells[i] ?? { raw: '', formatted: '' })
      continue
    }
    const columnId = columnIdAt(reportColumns, i)
    const raw = sumsByIndex[i] ?? 0
    cells.push({ raw, formatted: formatMetricValue(raw, columnId) })
  }

  return cells
}
