/**
 * Shared column dictionary for drilldown / entity grids.
 * Each metric: id (API/registry), label (full name), abbr (short header / selector hint).
 * Optional scope hides lander-tied metrics on Offers/Offer Sources, or offer-tied on Landers.
 */

export type MetricScope = 'lander' | 'offer'

export interface ColumnMeta {
  /** Stable id / registry key; aligns with resolveApiColumnId() where applicable */
  id: string
  /** Full display name (column picker, tooltips) */
  label: string
  /** Short table header (FunnelFlux Pro–style) */
  abbr: string
  defaultVisible: boolean
  size: number
  minSize: number
  colorize?: boolean
  symbol?: string
  fractionDigits?: number
  /** When set, this metric is omitted on pages that hide the given scope */
  scope?: MetricScope
}

export interface ColumnGroupDef {
  groupId: string
  groupLabel: string
  columns: ColumnMeta[]
}

const TRAFFIC_BASE: ColumnMeta[] = [
  { id: 'visits', label: 'Visits', abbr: 'Visits', defaultVisible: true, size: 90, minSize: 75 },
  { id: 'visitors', label: 'Unique Visitors', abbr: 'Visitors', defaultVisible: false, size: 90, minSize: 75 },
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
  { id: 'offerPayout', label: 'Offer Payout', abbr: 'Payout', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 2, scope: 'offer' },
  { id: 'offerURL', label: 'Offer URL', abbr: 'Offer URL', defaultVisible: false, size: 150, minSize: 75, scope: 'offer' },
]

const CONVERSION_COLUMNS: ColumnMeta[] = [
  { id: 'conversions', label: 'Conversions', abbr: 'Conv', defaultVisible: true, size: 90, minSize: 75 },
  { id: 'indirectConversions', label: 'Conversions (Indirect)', abbr: 'i|Conv', defaultVisible: false, size: 90, minSize: 80 },
  { id: 'conversionsLifetime', label: 'Conversions (Lifetime)', abbr: 'L|Conv', defaultVisible: false, size: 90, minSize: 90 },
]

const REVENUE_COST_COLUMNS: ColumnMeta[] = [
  { id: 'revenue', label: 'Revenue', abbr: 'Revenue', defaultVisible: true, size: 100, minSize: 75, symbol: '$', fractionDigits: 2 },
  { id: 'conversionRevenue', label: 'Conversion Revenue', abbr: 'Conv Rev', defaultVisible: false, size: 100, minSize: 75, symbol: '$', fractionDigits: 2 },
  { id: 'revenueIndirect', label: 'Revenue (Indirect)', abbr: 'i|Rev', defaultVisible: false, size: 90, minSize: 80, symbol: '$', fractionDigits: 2 },
  { id: 'revenueLifetime', label: 'Revenue (Lifetime)', abbr: 'L|Rev', defaultVisible: false, size: 90, minSize: 80, symbol: '$', fractionDigits: 2 },
  { id: 'cost', label: 'Traffic Cost', abbr: 'Cost', defaultVisible: true, size: 90, minSize: 75, symbol: '$', fractionDigits: 2 },
  { id: 'profitAndLoss', label: 'Profit & Loss', abbr: 'P/L', defaultVisible: true, size: 100, minSize: 75, colorize: true, symbol: '$', fractionDigits: 2 },
  { id: 'returnOnInvestment', label: 'Return on Investment', abbr: 'ROI', defaultVisible: true, size: 90, minSize: 75, colorize: true, symbol: '%', fractionDigits: 2 },
]

const RESOURCE_COLUMNS: ColumnMeta[] = [
  { id: 'resourceId', label: 'Resource ID', abbr: 'Res ID', defaultVisible: false, size: 120, minSize: 75 },
  { id: 'landerURL', label: 'Lander URL', abbr: 'Lander URL', defaultVisible: false, size: 150, minSize: 75, scope: 'lander' },
]

function makeCustomEventRawColumns(): ColumnMeta[] {
  const cols: ColumnMeta[] = []
  for (let i = 1; i <= 10; i++) {
    cols.push(
      { id: `customEvent${i}Count`, label: `Custom Event ${i} Count`, abbr: `CE${i}`, defaultVisible: false, size: 90, minSize: 75 },
      { id: `customEvent${i}Revenue`, label: `Custom Event ${i} Revenue`, abbr: `CE${i} Rev`, defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 2 },
    )
  }
  return cols
}

const CUSTOM_EVENT_RAW = makeCustomEventRawColumns()

/** Derived ratios, per-unit metrics, CTRs — FunnelFlux “Calculated metrics” */
const CALCULATED_COLUMNS: ColumnMeta[] = [
  { id: 'uniqueness', label: 'Uniqueness %', abbr: 'Uniq %', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 2 },
  { id: 'costPerVisit', label: 'Cost per Visit', abbr: 'CPVi', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerVisitor', label: 'Cost per Visitor', abbr: 'CPVu', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'costPerUniqueVisitor', label: 'Cost per Unique Visitor', abbr: 'u|CPV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerVisit', label: 'Revenue per Visit', abbr: 'RPVi', defaultVisible: true, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerVisitor', label: 'Revenue per Visitor', abbr: 'RPVu', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerUniqueVisitor', label: 'Revenue per Unique Visitor', abbr: 'u|RPV', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4 },
  { id: 'conversionPerVisit', label: 'Conversion per Visit', abbr: 'Cv %', defaultVisible: true, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerVisitor', label: 'Conversion per Visitor', abbr: 'CvVu', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerUniqueVisitor', label: 'Conversion per Unique Visitor', abbr: 'u|Cv %', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'visitPercentVsTopLevel', label: 'Visit % vs Top Level', abbr: 'top|V%', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 2 },
  { id: 'visitPercentVsParent', label: 'Visit % vs Parent', abbr: 'rel|V%', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 2 },
  { id: 'conversionPercentVsTopLevel', label: 'Conversion % vs Top Level', abbr: 'top|Cv%', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPercentVsParent', label: 'Conversion % vs Parent', abbr: 'rel|Cv%', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerParentVisit', label: 'Conversion per Parent Visit', abbr: 'CvPV', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'conversionPerParentVisitUnique', label: 'Conversion per Unique Parent Visit', abbr: 'u|CvPV', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
  { id: 'landerClickthroughRate', label: 'Lander CTR', abbr: 'L-CTR', defaultVisible: true, size: 90, minSize: 75, symbol: '%', fractionDigits: 2, scope: 'lander' },
  { id: 'landerClickthroughRateUnique', label: 'Unique Lander CTR', abbr: 'u|L-CTR', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 2, scope: 'lander' },
  { id: 'costPerLanderView', label: 'Cost per Lander View', abbr: 'CPLV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'costPerLanderClick', label: 'Cost per Lander Click', abbr: 'CPLC', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'costPerUniqueLanderView', label: 'Cost per Unique Lander View', abbr: 'u|CPLV', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'costPerUniqueLanderClick', label: 'Cost per Unique Lander Click', abbr: 'u|CPLC', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'revenuePerLanderView', label: 'Revenue per Lander View', abbr: 'RPLV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'revenuePerLanderClick', label: 'Revenue per Lander Click', abbr: 'RPLC', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'revenuePerUniqueLanderView', label: 'Revenue per Unique Lander View', abbr: 'u|RPLV', defaultVisible: false, size: 110, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'revenuePerUniqueLanderClick', label: 'Revenue per Unique Lander Click', abbr: 'u|RPLC', defaultVisible: false, size: 100, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'lander' },
  { id: 'conversionPerLanderView', label: 'Conversion per Lander View', abbr: 'CvLV', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4, scope: 'lander' },
  { id: 'conversionPerLanderClick', label: 'Conversion per Lander Click', abbr: 'CvLC', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4, scope: 'lander' },
  { id: 'conversionPerUniqueLanderView', label: 'Conversion per Unique Lander View', abbr: 'u|CvLV', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4, scope: 'lander' },
  { id: 'conversionPerUniqueLanderClick', label: 'Conversion per Unique Lander Click', abbr: 'u|CvLC', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4, scope: 'lander' },
  { id: 'offerClickthroughRate', label: 'Offer CTR', abbr: 'O-CTR', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 2, scope: 'offer' },
  { id: 'offerClickthroughRateUnique', label: 'Unique Offer CTR', abbr: 'u|O-CTR', defaultVisible: false, size: 100, minSize: 90, symbol: '%', fractionDigits: 2, scope: 'offer' },
  { id: 'costPerOfferView', label: 'Cost per Offer View', abbr: 'CPOV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'costPerOfferClick', label: 'Cost per Offer Click', abbr: 'CPOC', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'costPerUniqueOfferView', label: 'Cost per Unique Offer View', abbr: 'u|CPOV', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'costPerUniqueOfferClick', label: 'Cost per Unique Offer Click', abbr: 'u|CPOC', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'revenuePerOfferView', label: 'Revenue per Offer View', abbr: 'RPOV', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'revenuePerOfferClick', label: 'Revenue per Offer Click', abbr: 'RPOC', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'revenuePerUniqueOfferView', label: 'Revenue per Unique Offer View', abbr: 'u|RPOV', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'revenuePerUniqueOfferClick', label: 'Revenue per Unique Offer Click', abbr: 'u|RPOC', defaultVisible: false, size: 90, minSize: 90, symbol: '$', fractionDigits: 4, scope: 'offer' },
  { id: 'conversionPerOfferView', label: 'Conversion per Offer View', abbr: 'CvOV', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4, scope: 'offer' },
  { id: 'conversionPerOfferClick', label: 'Conversion per Offer Click', abbr: 'CvOC', defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4, scope: 'offer' },
  { id: 'conversionPerUniqueOfferView', label: 'Conversion per Unique Offer View', abbr: 'u|CvOV', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4, scope: 'offer' },
  { id: 'conversionPerUniqueOfferClick', label: 'Conversion per Unique Offer Click', abbr: 'u|CvOC', defaultVisible: false, size: 90, minSize: 90, symbol: '%', fractionDigits: 4, scope: 'offer' },
  { id: 'costPerConversion', label: 'Cost per Conversion', abbr: 'CPCv', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
  { id: 'revenuePerConversion', label: 'Revenue per Conversion', abbr: 'RPCv', defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
]

function makeCustomEventCalculatedColumns(): ColumnMeta[] {
  const cols: ColumnMeta[] = []
  for (let i = 1; i <= 10; i++) {
    cols.push(
      { id: `customEvent${i}PerVisit`, label: `Custom Event ${i} per Visit`, abbr: `CE${i} %`, defaultVisible: false, size: 90, minSize: 75, symbol: '%', fractionDigits: 4 },
      { id: `costPerEvent${i}`, label: `Cost per Event ${i}`, abbr: `CPCE${i}`, defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
      { id: `revenuePerEvent${i}`, label: `Revenue per Event ${i}`, abbr: `RPCE${i}`, defaultVisible: false, size: 90, minSize: 75, symbol: '$', fractionDigits: 4 },
    )
  }
  return cols
}

const CUSTOM_EVENT_CALCULATED = makeCustomEventCalculatedColumns()

const CALCULATED_ALL = [...CALCULATED_COLUMNS, ...CUSTOM_EVENT_CALCULATED]

/** Column picker groups (order matches FunnelFlux-style workflow) */
export const ALL_COLUMN_GROUPS: ColumnGroupDef[] = [
  { groupId: 'traffic', groupLabel: 'Traffic', columns: TRAFFIC_BASE },
  { groupId: 'lander', groupLabel: 'Lander', columns: LANDER_ACTIVITY },
  { groupId: 'offer', groupLabel: 'Offer', columns: OFFER_ACTIVITY },
  { groupId: 'conversions', groupLabel: 'Conversions', columns: CONVERSION_COLUMNS },
  { groupId: 'revenueCost', groupLabel: 'Revenue & Cost', columns: REVENUE_COST_COLUMNS },
  { groupId: 'calculated', groupLabel: 'Calculated metrics', columns: CALCULATED_ALL },
  { groupId: 'customEvents', groupLabel: 'Custom events', columns: CUSTOM_EVENT_RAW },
  { groupId: 'resource', groupLabel: 'Resource info', columns: RESOURCE_COLUMNS },
]

/** Entity ID column — not from drilldown API; listed under “Other” in the picker */
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

const ALL_COLUMNS_FLAT = ALL_COLUMN_GROUPS.flatMap((g) => g.columns)

export function getColumnMeta(id: string): ColumnMeta | undefined {
  if (id === 'id') return ENTITY_ID_COLUMN_META
  return ALL_COLUMNS_FLAT.find((c) => c.id === id)
}

export function getDefaultVisibleIds(): string[] {
  return ALL_COLUMNS_FLAT.filter((c) => c.defaultVisible).map((c) => c.id)
}

export function filterColumnGroupsByScope(
  groups: ColumnGroupDef[],
  hideScopes?: Set<MetricScope>,
): ColumnGroupDef[] {
  if (!hideScopes?.size) return groups
  return groups
    .map((g) => ({
      ...g,
      columns: g.columns.filter((c) => !c.scope || !hideScopes.has(c.scope)),
    }))
    .filter((g) => g.columns.length > 0)
}

export function buildChooserGroupsForPage(hideScopes?: Set<MetricScope>): ColumnGroupDef[] {
  return [...filterColumnGroupsByScope(ALL_COLUMN_GROUPS, hideScopes), COLUMN_CHOOSER_OTHER_GROUP]
}
