/**
 * Human-readable labels for dashboard drilldown groupings and grouping column headers.
 */

const GROUP_BY_TITLE: Readonly<Record<string, string>> = {
  'Element: Funnel': 'Funnels',
  'Third Parties: Traffic Source': 'Traffic Sources',
  'Element: Lander': 'Landers',
  'Element: Offer': 'Offers',
}

/** Normalize API grouping column names such as `element:funnel` → "Funnel". */
export function friendlyDashboardGroupingColumnHeader(
  apiColumnName: string | undefined,
  groupBy: string,
): string {
  if (!apiColumnName) {
    return groupingWidgetTitleFromGroupBy(groupBy)
  }
  const key = apiColumnName.trim().toLowerCase()
  if (key.includes('funnel')) return 'Funnel'
  if (key.includes('traffic') && key.includes('source')) return 'Traffic Source'
  if (key.includes('lander')) return 'Lander'
  if (key.includes('offer')) return 'Offer'
  if (key.includes('campaign')) return 'Campaign'
  return GROUP_BY_TITLE[groupBy] ?? apiColumnName
}

export function groupingWidgetTitleFromGroupBy(groupBy: string): string {
  return GROUP_BY_TITLE[groupBy] ?? 'Breakdown'
}

/** Friendly table header for numeric columns from API labels (when not using registry id). */
export function friendlyDashboardMetricHeader(apiName: string | undefined): string {
  if (!apiName) return ''
  const n = apiName.trim()
  const map: Record<string, string> = {
    entrances: 'Visits',
    visits: 'Visits',
    landerclicks: 'Lander Clicks',
    offerclicks: 'Offer Clicks',
    conversions: 'Conversions',
    revenue: 'Revenue',
    cost: 'Cost',
    roi: 'ROI',
  }
  const k = n.replace(/\s+/g, '').toLowerCase()
  for (const [slug, label] of Object.entries(map)) {
    if (k.includes(slug)) return label
  }
  return n
}
