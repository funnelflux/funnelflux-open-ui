import { getColumnMeta, getDefaultVisibleIds, buildChooserGroupsForPage, type MetricScope } from '@/components/ui-kit/data-table/columnRegistry'
import type { SortingState, VisibilityState } from '@tanstack/react-table'
import { readHiddenColumnIds } from '@/lib/entity-table/columns/storage'

const NON_METRIC_COLUMN_IDS = new Set(['name', 'select', 'id'])

const COLUMN_ID_TO_API_METRIC: Record<string, string> = {
  visits: 'Entrances',
  visitors: 'Unique Entrances',
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
  Uniqueness: 'uniqueness',
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
  'Conv. Revenue': 'conversionRevenue',
  'Revenue (Indirect)': 'revenueIndirect',
  'Indirect Revenue': 'revenueIndirect',
  'Revenue (Lifetime)': 'revenueLifetime',
  'Lifetime Revenue': 'revenueLifetime',
  Cost: 'cost',
  'Traffic Cost': 'cost',
  'P/L': 'profitAndLoss',
  'Profit/Loss': 'profitAndLoss',
  ROI: 'returnOnInvestment',
  'Cv %': 'conversionPerVisit',
  'Cv% (Visit)': 'conversionPerVisit',
  'u|Cv %': 'conversionPerUniqueVisitor',
  CPVi: 'costPerVisit',
  'Cost/Visit': 'costPerVisit',
  'u|CPV': 'costPerUniqueVisitor',
  RPVi: 'revenuePerVisit',
  'Rev/Visit': 'revenuePerVisit',
  'u|RPV': 'revenuePerUniqueVisitor',
  CPCv: 'costPerConversion',
  'Cost/Conv': 'costPerConversion',
  RPCv: 'revenuePerConversion',
  'Rev/Conv': 'revenuePerConversion',
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
  CPLV: 'costPerLanderView',
  CPLC: 'costPerLanderClick',
  'u|CPLV': 'costPerUniqueLanderView',
  'u|CPLC': 'costPerUniqueLanderClick',
  RPLV: 'revenuePerLanderView',
  RPLC: 'revenuePerLanderClick',
  'u|RPLV': 'revenuePerUniqueLanderView',
  'u|RPLC': 'revenuePerUniqueLanderClick',
  CPOV: 'costPerOfferView',
  CPOC: 'costPerOfferClick',
  'u|CPOV': 'costPerUniqueOfferView',
  'u|CPOC': 'costPerUniqueOfferClick',
  RPOV: 'revenuePerOfferView',
  RPOC: 'revenuePerOfferClick',
  'u|RPOV': 'revenuePerUniqueOfferView',
  'u|RPOC': 'revenuePerUniqueOfferClick',
  CvOV: 'conversionPerOfferView',
  CvOC: 'conversionPerOfferClick',
  'u|CvOV': 'conversionPerUniqueOfferView',
  'u|CvOC': 'conversionPerUniqueOfferClick',
  CvLV: 'conversionPerLanderView',
  CvLC: 'conversionPerLanderClick',
  'u|CvLV': 'conversionPerUniqueLanderView',
  'u|CvLC': 'conversionPerUniqueLanderClick',
  'top|V%': 'visitPercentVsTopLevel',
  'rel|V%': 'visitPercentVsParent',
  'top|Cv%': 'conversionPercentVsTopLevel',
  'rel|Cv%': 'conversionPercentVsParent',
  Payout: 'offerPayout',
  'Offer URL': 'offerURL',
  'Lander URL': 'landerURL',
  'Resource ID': 'resourceId',
}

export function resolveApiColumnId(apiName: string): string | undefined {
  if (API_NAME_TO_ID[apiName]) return API_NAME_TO_ID[apiName]

  let m: RegExpMatchArray | null
  m = apiName.match(/^CE(\d+)$/)
  if (m) return `customEvent${m[1]}Count`
  m = apiName.match(/^CE(\d+)\s*Rev/)
  if (m) return `customEvent${m[1]}Revenue`
  m = apiName.match(/^CE(\d+)\s*%/)
  if (m) return `customEvent${m[1]}PerVisit`
  m = apiName.match(/^CPCE(\d+)/)
  if (m) return `costPerEvent${m[1]}`
  m = apiName.match(/^RPCE(\d+)/)
  if (m) return `revenuePerEvent${m[1]}`

  return undefined
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
  return buildChooserGroupsForPage(hideScopes)
    .flatMap((group) => group.columns)
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
