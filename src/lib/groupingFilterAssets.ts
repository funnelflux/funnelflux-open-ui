/**
 * Drilldown grouping `groupBy` values that accept entity IDs in whitelist/blacklist
 * and should use the asset picker (virtualized multi-select) in the filter popover.
 */
export type GroupingFilterAssetKind =
  | 'campaign'
  | 'funnel'
  | 'lander'
  | 'offer'
  | 'pageCategory'
  | 'trafficSource'
  | 'offerSource'

const GROUPING_ASSET_KIND: Partial<Record<string, GroupingFilterAssetKind>> = {
  'Element: Campaign': 'campaign',
  'Element: Funnel': 'funnel',
  'Element: Lander': 'lander',
  'Element: Offer': 'offer',
  'Element: Lander-Offer Category': 'pageCategory',
  'Third Parties: Traffic Source': 'trafficSource',
  'Third Parties: Offer Source': 'offerSource',
}

export function getGroupingFilterAssetKind(groupBy: string): GroupingFilterAssetKind | null {
  if (!groupBy.trim()) return null
  return GROUPING_ASSET_KIND[groupBy] ?? null
}
