/**
 * Shared column dictionary for drilldown / entity grids.
 * Registry ids are stable UI keys; drilldownMetrics.ts maps them to API display names.
 * Only metrics supported by POST /admin/api/v2/stats/reporting/drilldown belong here.
 */

export type MetricScope = 'lander' | 'offer'

export interface ColumnMeta {
  id: string
  label: string
  abbr: string
  defaultVisible: boolean
  size: number
  minSize: number
  colorize?: boolean
  symbol?: string
  fractionDigits?: number
  scope?: MetricScope
}

export interface ColumnGroupSection {
  sectionId: string
  sectionLabel: string
  columns: ColumnMeta[]
}

export interface ColumnGroupDef {
  groupId: string
  groupLabel: string
  columns?: ColumnMeta[]
  sections?: ColumnGroupSection[]
}

const TRAFFIC_BASE: ColumnMeta[] = [
  { id: 'visits', label: 'Entrances', abbr: 'Entrances', defaultVisible: true, size: 90, minSize: 75 },
  { id: 'visitors', label: 'Unique Entrances', abbr: 'u|Entrances', defaultVisible: false, size: 90, minSize: 75 },
  { id: 'nodeViews', label: 'Node Views', abbr: 'Node Views', defaultVisible: false, size: 90, minSize: 75 },
  { id: 'nodeViewsUnique', label: 'Unique Node Views', abbr: 'u|Node Views', defaultVisible: false, size: 110, minSize: 90 },
]

const LANDER_ACTIVITY: ColumnMeta[] = [
  { id: 'landerViews', label: 'Lander Views', abbr: 'L-Views', defaultVisible: true, size: 90, minSize: 75, scope: 'lander' },
  { id: 'landerViewsUnique', label: 'Unique Lander Views', abbr: 'u|L-Views', defaultVisible: false, size: 110, minSize: 90, scope: 'lander' },
  { id: 'landerClicks', label: 'Lander Clicks', abbr: 'L-Clicks', defaultVisible: true, size: 100, minSize: 75, scope: 'lander' },
  { id: 'landerClicksUnique', label: 'Unique Lander Clicks', abbr: 'u|L-Clicks', defaultVisible: false, size: 110, minSize: 90, scope: 'lander' },
]

const OFFER_ACTIVITY: ColumnMeta[] = [
  { id: 'offerViews', label: 'Offer Views', abbr: 'O-Views', defaultVisible: true, size: 100, minSize: 75, scope: 'offer' },
  { id: 'offerViewsUnique', label: 'Unique Offer Views', abbr: 'u|O-Views', defaultVisible: false, size: 110, minSize: 90, scope: 'offer' },
  { id: 'offerClicks', label: 'Offer Clicks', abbr: 'O-Clicks', defaultVisible: false, size: 100, minSize: 75, scope: 'offer' },
  { id: 'offerClicksUnique', label: 'Unique Offer Clicks', abbr: 'u|O-Clicks', defaultVisible: false, size: 110, minSize: 90, scope: 'offer' },
]

const CONVERSION_COLUMNS: ColumnMeta[] = [
  { id: 'conversions', label: 'Conversions', abbr: 'Conv.', defaultVisible: true, size: 90, minSize: 75 },
  { id: 'indirectConversions', label: 'Indirect Conversions', abbr: 'i|Conv.', defaultVisible: false, size: 90, minSize: 80 },
  { id: 'conversionsLifetime', label: 'Lifetime Conversions', abbr: 'L|Conv.', defaultVisible: false, size: 90, minSize: 90 },
]

const REVENUE_COST_COLUMNS: ColumnMeta[] = [
  { id: 'revenue', label: 'Revenue', abbr: 'Revenue', defaultVisible: true, size: 100, minSize: 75, symbol: '$', fractionDigits: 2 },
  { id: 'revenueIndirect', label: 'Indirect Revenue', abbr: 'i|Revenue', defaultVisible: false, size: 90, minSize: 80, symbol: '$', fractionDigits: 2 },
  { id: 'revenueLifetime', label: 'Lifetime Revenue', abbr: 'L|Revenue', defaultVisible: false, size: 90, minSize: 80, symbol: '$', fractionDigits: 2 },
  { id: 'cost', label: 'Cost', abbr: 'Cost', defaultVisible: true, size: 90, minSize: 75, symbol: '$', fractionDigits: 2 },
  { id: 'profitAndLoss', label: 'Profit & Loss', abbr: 'P/L', defaultVisible: true, size: 100, minSize: 75, colorize: true, symbol: '$', fractionDigits: 2 },
  { id: 'returnOnInvestment', label: 'Return on Investment', abbr: 'ROI', defaultVisible: true, size: 90, minSize: 75, colorize: true, symbol: '%', fractionDigits: 2 },
]

const DERIVED_CLICKTHROUGH: ColumnMeta[] = [
  { id: 'landerClickthroughRate', label: 'Lander CTR', abbr: 'Lander CTR', defaultVisible: true, size: 90, minSize: 75, symbol: '%', fractionDigits: 2, scope: 'lander' },
  { id: 'landerClickthroughRateUnique', label: 'Unique Lander CTR', abbr: 'u|Lander CTR', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 2, scope: 'lander' },
  { id: 'offerClickthroughRate', label: 'Offer CTR', abbr: 'Offer CTR', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 2, scope: 'offer' },
  { id: 'offerClickthroughRateUnique', label: 'Unique Offer CTR', abbr: 'u|Offer CTR', defaultVisible: false, size: 100, minSize: 90, symbol: '%', fractionDigits: 2, scope: 'offer' },
]

const DERIVED_CONVERSION_RATES: ColumnMeta[] = [
  { id: 'conversionPerVisit', label: 'Conversion Rate (Entrances)', abbr: 'CVRe', defaultVisible: true, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerUniqueVisitor', label: 'Conversion Rate (Unique Entrances)', abbr: 'u|CVRe', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerLanderView', label: 'Conversion Rate (Lander Views)', abbr: 'CVRlv', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4, scope: 'lander' },
  { id: 'conversionPerUniqueLanderView', label: 'Conversion Rate (Unique Lander Views)', abbr: 'u|CVRlv', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4, scope: 'lander' },
  { id: 'conversionPerOfferView', label: 'Conversion Rate (Offer Views)', abbr: 'CVRov', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4, scope: 'offer' },
  { id: 'conversionPerUniqueOfferView', label: 'Conversion Rate (Unique Offer Views)', abbr: 'u|CVRov', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4, scope: 'offer' },
  { id: 'conversionRateNodeViews', label: 'Conversion Rate (Node Views)', abbr: 'CVRnv', defaultVisible: false, size: 90, minSize: 80, symbol: '%', fractionDigits: 4 },
  { id: 'conversionRateNodeViewsUnique', label: 'Conversion Rate (Unique Node Views)', abbr: 'u|CVRnv', defaultVisible: false, size: 100, minSize: 90, symbol: '%', fractionDigits: 4 },
]

const DERIVED_REVENUES: ColumnMeta[] = [
  { id: 'revenuePerVisit', label: 'Earning per Entrance', abbr: 'EPe', defaultVisible: true, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerUniqueVisitor', label: 'Earning per Unique Entrance', abbr: 'u|EPe', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerLanderView', label: 'Earning per Lander View', abbr: 'EPlv', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'revenuePerUniqueLanderView', label: 'Earning per Unique Lander View', abbr: 'u|EPlv', defaultVisible: false, size: 110, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'revenuePerOfferView', label: 'Earning per Offer View', abbr: 'EPov', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'revenuePerUniqueOfferView', label: 'Earning per Unique Offer View', abbr: 'u|EPov', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'revenuePerNodeView', label: 'Earning per Node View', abbr: 'EPnv', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerUniqueNodeView', label: 'Earning per Unique Node View', abbr: 'u|EPnv', defaultVisible: false, size: 100, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerConversion', label: 'Earning per Conversion', abbr: 'EPa', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
]

const DERIVED_OTHER: ColumnMeta[] = [
  { id: 'costPerVisit', label: 'Cost per Entrance', abbr: 'CPe', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerUniqueVisitor', label: 'Cost per Unique Entrance', abbr: 'u|CPe', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerLanderView', label: 'Cost per Lander View', abbr: 'CPlv', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'costPerUniqueLanderView', label: 'Cost per Unique Lander View', abbr: 'u|CPlv', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'costPerOfferView', label: 'Cost per Offer View', abbr: 'CPov', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'costPerUniqueOfferView', label: 'Cost per Unique Offer View', abbr: 'u|CPov', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'costPerNodeView', label: 'Cost per Node View', abbr: 'CPnv', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerUniqueNodeView', label: 'Cost per Unique Node View', abbr: 'u|CPnv', defaultVisible: false, size: 100, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'costPerConversion', label: 'Cost per Conversion', abbr: 'CPa', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
]

/** Column picker groups aligned with drilldown API metricNames.php */
export const ALL_COLUMN_GROUPS: ColumnGroupDef[] = [
  {
    groupId: 'trafficConversions',
    groupLabel: 'Traffic & conversions',
    columns: [...TRAFFIC_BASE, ...CONVERSION_COLUMNS],
  },
  { groupId: 'lander', groupLabel: 'Lander', columns: LANDER_ACTIVITY },
  { groupId: 'offer', groupLabel: 'Offer', columns: OFFER_ACTIVITY },
  { groupId: 'financials', groupLabel: 'Financials', columns: REVENUE_COST_COLUMNS },
  {
    groupId: 'derived',
    groupLabel: 'Derived metrics',
    sections: [
      { sectionId: 'derivedCtr', sectionLabel: 'Clickthrough rates', columns: DERIVED_CLICKTHROUGH },
      { sectionId: 'derivedCvr', sectionLabel: 'Conversion rates', columns: DERIVED_CONVERSION_RATES },
      { sectionId: 'derivedRev', sectionLabel: 'Revenues', columns: DERIVED_REVENUES },
      { sectionId: 'derivedOther', sectionLabel: 'Other', columns: DERIVED_OTHER },
    ],
  },
]

/** Entity ID column — UI-only, not a drilldown metric */
export const ENTITY_ID_COLUMN_META: ColumnMeta = {
  id: 'id',
  label: 'Entity ID',
  abbr: 'ID',
  defaultVisible: false,
  size: 170,
  minSize: 100,
}

export const COLUMN_CHOOSER_OTHER_GROUP: ColumnGroupDef = {
  groupId: 'other',
  groupLabel: 'Other columns',
  columns: [ENTITY_ID_COLUMN_META],
}

export function flatColumnsFromGroup(group: ColumnGroupDef): ColumnMeta[] {
  if (group.sections?.length) {
    return group.sections.flatMap((section) => section.columns)
  }
  return group.columns ?? []
}

export function flatColumnsFromGroups(groups: ColumnGroupDef[]): ColumnMeta[] {
  return groups.flatMap(flatColumnsFromGroup)
}

const ALL_COLUMNS_FLAT = flatColumnsFromGroups(ALL_COLUMN_GROUPS)

export function getColumnMeta(id: string): ColumnMeta | undefined {
  if (id === 'id') return ENTITY_ID_COLUMN_META
  return ALL_COLUMNS_FLAT.find((c) => c.id === id)
}

export function getDefaultVisibleIds(): string[] {
  return ALL_COLUMNS_FLAT.filter((c) => c.defaultVisible).map((c) => c.id)
}

function filterColumnsByScope(columns: ColumnMeta[], hideScopes?: Set<MetricScope>): ColumnMeta[] {
  if (!hideScopes?.size) return columns
  return columns.filter((c) => !c.scope || !hideScopes.has(c.scope))
}

export function filterColumnGroupsByScope(
  groups: ColumnGroupDef[],
  hideScopes?: Set<MetricScope>,
): ColumnGroupDef[] {
  if (!hideScopes?.size) return groups

  const filtered: ColumnGroupDef[] = []

  for (const group of groups) {
    if (group.sections?.length) {
      const sections = group.sections
        .map((section) => ({
          ...section,
          columns: filterColumnsByScope(section.columns, hideScopes),
        }))
        .filter((section) => section.columns.length > 0)
      if (sections.length === 0) continue
      filtered.push({ groupId: group.groupId, groupLabel: group.groupLabel, sections })
      continue
    }

    const columns = filterColumnsByScope(group.columns ?? [], hideScopes)
    if (columns.length === 0) continue
    filtered.push({ groupId: group.groupId, groupLabel: group.groupLabel, columns })
  }

  return filtered
}

export function buildChooserGroupsForPage(hideScopes?: Set<MetricScope>): ColumnGroupDef[] {
  return [...filterColumnGroupsByScope(ALL_COLUMN_GROUPS, hideScopes), COLUMN_CHOOSER_OTHER_GROUP]
}
