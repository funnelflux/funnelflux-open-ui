import {
  buildChooserGroupsForPage,
  flatColumnsFromGroups,
  getColumnMeta,
  getDefaultVisibleIds,
  type MetricScope,
} from '@/components/ui-kit/data-table/columnRegistry'
import type { SortingState, VisibilityState } from '@tanstack/react-table'
import { readHiddenColumnIds } from '@/lib/entity-table/columns/storage'

const NON_METRIC_COLUMN_IDS = new Set(['name', 'select', 'id'])

/** Registry id → drilldown API metric display name (MetricNames.php). */
const COLUMN_ID_TO_API_METRIC: Record<string, string> = {
  visits: 'Entrances',
  visitors: 'Unique Entrances',
  nodeViews: 'Node Views',
  nodeViewsUnique: 'Unique Node Views',
  landerViews: 'Lander Views',
  landerViewsUnique: 'Unique Lander Views',
  landerClicks: 'Lander Clicks',
  landerClicksUnique: 'Unique Lander Clicks',
  landerClickthroughRate: 'Lander CTR',
  landerClickthroughRateUnique: 'Unique Lander CTR',
  offerViews: 'Offer Views',
  offerViewsUnique: 'Unique Offer Views',
  offerClicks: 'Offer Clicks',
  offerClicksUnique: 'Unique Offer Clicks',
  offerClickthroughRate: 'Offer CTR',
  offerClickthroughRateUnique: 'Unique Offer CTR',
  conversions: 'Conv.',
  indirectConversions: 'Indirect Conv.',
  conversionsLifetime: 'Lifetime Conv.',
  revenue: 'Revenue',
  revenueIndirect: 'Indirect Revenue',
  revenueLifetime: 'Lifetime Revenue',
  cost: 'Cost',
  profitAndLoss: 'P/L',
  returnOnInvestment: 'ROI',
  revenuePerConversion: 'EPa',
  costPerConversion: 'CPa',
  conversionPerVisit: 'CVRe',
  revenuePerVisit: 'EPe',
  costPerVisit: 'CPe',
  conversionPerOfferView: 'CVRov',
  revenuePerOfferView: 'EPov',
  costPerOfferView: 'CPov',
  conversionPerLanderView: 'CVRlv',
  revenuePerLanderView: 'EPlv',
  costPerLanderView: 'CPlv',
  conversionRateNodeViews: 'CVRnv',
  revenuePerNodeView: 'EPnv',
  costPerNodeView: 'CPnv',
  conversionPerUniqueVisitor: 'Unique CVRe',
  revenuePerUniqueVisitor: 'Unique EPe',
  costPerUniqueVisitor: 'Unique CPe',
  conversionPerUniqueOfferView: 'Unique CVRov',
  revenuePerUniqueOfferView: 'Unique EPov',
  costPerUniqueOfferView: 'Unique CPov',
  conversionPerUniqueLanderView: 'Unique CVRlv',
  revenuePerUniqueLanderView: 'Unique EPlv',
  costPerUniqueLanderView: 'Unique CPlv',
  conversionRateNodeViewsUnique: 'Unique CVRnv',
  revenuePerUniqueNodeView: 'Unique EPnv',
  costPerUniqueNodeView: 'Unique CPnv',
}

const API_NAME_TO_ID: Record<string, string> = {
  Entrances: 'visits',
  Visits: 'visits',
  'Unique Entrances': 'visitors',
  Visitors: 'visitors',
  'Node Views': 'nodeViews',
  'Unique Node Views': 'nodeViewsUnique',
  'Lander Views': 'landerViews',
  'Lander Views (Unique)': 'landerViewsUnique',
  'Unique Lander Views': 'landerViewsUnique',
  'Lander Clicks': 'landerClicks',
  'Lander Clicks (Unique)': 'landerClicksUnique',
  'Unique Lander Clicks': 'landerClicksUnique',
  'Lander CTR': 'landerClickthroughRate',
  'Lander CTR (Unique)': 'landerClickthroughRateUnique',
  'Unique Lander CTR': 'landerClickthroughRateUnique',
  'Offer Views': 'offerViews',
  'Offer Views (Unique)': 'offerViewsUnique',
  'Unique Offer Views': 'offerViewsUnique',
  'Offer Clicks': 'offerClicks',
  'Offer Clicks (Unique)': 'offerClicksUnique',
  'Unique Offer Clicks': 'offerClicksUnique',
  'Offer CTR': 'offerClickthroughRate',
  'Offer CTR (Unique)': 'offerClickthroughRateUnique',
  'Unique Offer CTR': 'offerClickthroughRateUnique',
  'Conv.': 'conversions',
  Conversions: 'conversions',
  'Conv. (Indirect)': 'indirectConversions',
  'Indirect Conv.': 'indirectConversions',
  'Conv. (Lifetime)': 'conversionsLifetime',
  'Lifetime Conv.': 'conversionsLifetime',
  Revenue: 'revenue',
  'Total Revenue': 'revenue',
  'Revenue (Indirect)': 'revenueIndirect',
  'Indirect Revenue': 'revenueIndirect',
  'Revenue (Lifetime)': 'revenueLifetime',
  'Lifetime Revenue': 'revenueLifetime',
  Cost: 'cost',
  'Traffic Cost': 'cost',
  'P/L': 'profitAndLoss',
  'Profit/Loss': 'profitAndLoss',
  ROI: 'returnOnInvestment',
  EPa: 'revenuePerConversion',
  CPa: 'costPerConversion',
  CVRe: 'conversionPerVisit',
  EPe: 'revenuePerVisit',
  CPe: 'costPerVisit',
  CVRov: 'conversionPerOfferView',
  EPov: 'revenuePerOfferView',
  CPov: 'costPerOfferView',
  CVRlv: 'conversionPerLanderView',
  EPlv: 'revenuePerLanderView',
  CPlv: 'costPerLanderView',
  CVRnv: 'conversionRateNodeViews',
  EPnv: 'revenuePerNodeView',
  CPnv: 'costPerNodeView',
  'Unique CVRe': 'conversionPerUniqueVisitor',
  'Unique EPe': 'revenuePerUniqueVisitor',
  'Unique CPe': 'costPerUniqueVisitor',
  'Unique CVRov': 'conversionPerUniqueOfferView',
  'Unique EPov': 'revenuePerUniqueOfferView',
  'Unique CPov': 'costPerUniqueOfferView',
  'Unique CVRlv': 'conversionPerUniqueLanderView',
  'Unique EPlv': 'revenuePerUniqueLanderView',
  'Unique CPlv': 'costPerUniqueLanderView',
  'Unique CVRnv': 'conversionRateNodeViewsUnique',
  'Unique EPnv': 'revenuePerUniqueNodeView',
  'Unique CPnv': 'costPerUniqueNodeView',
}

export function resolveApiColumnId(apiName: string): string | undefined {
  return API_NAME_TO_ID[apiName]
}

export function isNonMetricColumnId(columnId: string): boolean {
  return NON_METRIC_COLUMN_IDS.has(columnId) || columnId.startsWith('btn_')
}

export function apiMetricNameForColumnId(columnId: string): string | undefined {
  return COLUMN_ID_TO_API_METRIC[columnId]
}

export function apiMetricNamesForColumnIds(columnIds: Iterable<string>): string[] | undefined {
  const metrics: string[] = []
  const seen = new Set<string>()

  for (const columnId of columnIds) {
    if (isNonMetricColumnId(columnId)) continue
    const apiName = apiMetricNameForColumnId(columnId)
    if (!apiName) {
      if (getColumnMeta(columnId)) return undefined
      continue
    }
    if (!seen.has(apiName)) {
      seen.add(apiName)
      metrics.push(apiName)
    }
  }

  return metrics.length > 0 ? metrics : undefined
}

export function defaultApiMetricNames(): string[] {
  return apiMetricNamesForColumnIds(getDefaultVisibleIds()) ?? []
}

export function metricColumnIdsForScope(hideScopes?: Set<MetricScope>): string[] {
  return flatColumnsFromGroups(buildChooserGroupsForPage(hideScopes))
    .filter((column) => column.id !== 'id')
    .map((column) => column.id)
}

export function visibleMetricColumnIdsFromHidden(
  storageKey: string,
  options?: { defaultVisibleColumnIds?: readonly string[]; hideScopes?: Set<MetricScope> },
): string[] {
  const allIds = metricColumnIdsForScope(options?.hideScopes)
  const defaultVisible = new Set(options?.defaultVisibleColumnIds ?? getDefaultVisibleIds())
  const hidden = readHiddenColumnIds(storageKey)

  return allIds.filter((id) => hidden ? !hidden.has(id) : defaultVisible.has(id))
}

export function visibleMetricColumnIdsFromVisibility(
  visibility: VisibilityState,
  options?: { defaultVisibleColumnIds?: readonly string[]; hideScopes?: Set<MetricScope> },
): string[] {
  const allIds = metricColumnIdsForScope(options?.hideScopes)
  const defaultVisible = new Set(options?.defaultVisibleColumnIds ?? getDefaultVisibleIds())
  return allIds.filter((id) => visibility[id] ?? defaultVisible.has(id))
}

export function withSortingMetricIds(columnIds: readonly string[], sorting: SortingState): string[] {
  const next = [...columnIds]
  const seen = new Set(next)
  for (const sort of sorting) {
    if (!seen.has(sort.id)) {
      seen.add(sort.id)
      next.push(sort.id)
    }
  }
  return next
}

export function metricsForColumnIds(columnIds: Iterable<string>): string[] | undefined {
  return apiMetricNamesForColumnIds(columnIds)
}
