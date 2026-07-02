/**
 * Funnel Quick Stats — request builders aligned with legacy admin
 * `statsQuickviewRecomputeTableContent` + `/ui/quickstats/load/` where applicable.
 */

import type { ApiTimeZone, DrilldownRequest, Grouping, Report, ReportCell, ReportRow } from '@/types/stats'
import { toApiDateTimeRangeForReporting } from '@/lib/statsDateRange'
import { trackingFieldConstantForSlot } from '@/lib/urlTrackingFieldGrouping'

/**
 * V2 stats drilldown `groupBy` strings (FluxAPI\\v2\\Models\\Stats\\Grouping).
 * Use these instead of scattering magic strings across the Quick Stats UI.
 */
export const STATS_GROUP_BY = {
  elementFunnel: 'Element: Funnel',
  trafficSource: 'Third Parties: Traffic Source',
  countryCode: 'Location: Country Code',
  landerOrOffer: 'Element: Lander or Offer',
  mvtCombination: 'Insight: MVT Combination',
  mvtKv: 'Insight: MVT Key-Value Pairs',
  conversionPathLandersAndOffers: 'Insight: Conversion Path (Landers and Offers)',
  conversionPathAllNodes: 'Insight: Conversion Path (All Nodes)',
  lander: 'Element: Lander',
  offer: 'Element: Offer',
  weekParting: 'Time: Week-Parting',
  dayParting: 'Time: Day-Parting',
  deviceType: 'Device: Device Type',
  deviceModel: 'Device: Device Model',
  deviceOs: 'Device: OS',
  deviceOsVersion: 'Device: OS Version',
  deviceBrowser: 'Device: Browser',
  isp: 'Connection: ISP',
  carrier: 'Connection: Mobile Carrier',
  connectionType: 'Connection: Connection Type',
  blockIp: 'Connection: Block C IP',
  referrerDomain: 'Connection: Referrer Domain',
  continent: 'Location: Continent',
  countryName: 'Location: Country Name',
  region: 'Location: Region',
  city: 'Location: City',
} as const

export const QUICKSTATS_STANDARD_METRICS = [
  'Entrances',
  'Lander Clicks',
  'Lander CTR',
  'Offer Views',
  'Conv.',
  'Revenue',
  'Cost',
  'P/L',
  'ROI',
] as const

export type FunnelQuickStatsTab =
  | 'conversion-paths'
  | 'conversion-paths-all-nodes'
  | 'landers'
  | 'offers'
  | 'mvt-combinations'
  | 'mvt-kv-pairs'
  | 'traffic-sources'
  | 'funnels'
  | 'week-parting'
  | 'day-parting'
  | 'historical-perf'
  | 'device-type'
  | 'device-name'
  | 'os'
  | 'os-version'
  | 'os-browser'
  | 'browser'
  | 'isp'
  | 'carrier'
  | 'connection-type'
  | 'ip'
  | 'referrer'
  | 'tracking-fields'
  | 'continent'
  | 'country'
  | 'region'
  | 'city'
  | 'drilldown'

/** Tabs implemented via POST /ui/quickstats/load/ (QuickStatsOptions.statsType) */
export const QUICKSTATS_TAB_TYPES: Partial<Record<FunnelQuickStatsTab, string>> = {
  'historical-perf': 'historical-perf',
  'week-parting': 'week-parting',
  'day-parting': 'day-parting',
  'traffic-sources': 'traffic-sources',
  'funnels': 'funnels',
  landers: 'landers',
  offers: 'offers',
  'conversion-paths': 'conversion-paths',
  'device-type': 'device-type',
  'device-name': 'device-name',
  'os': 'device-os',
  'os-version': 'device-os-version',
  'os-browser': 'device-os-browser',
  'browser': 'device-browser',
  'isp': 'connectivity-isp',
  'carrier': 'connectivity-carrier',
  ip: 'connectivity-ip',
  referrer: 'referrer',
  'tracking-fields': 'tracking-fields',
  country: 'country',
  // region / city — use Stats drilldown in `buildDrilldownRequestForTab` (QuickStats PHP reuses
  // statsTypeFilter as whitelist on every grouping level, which breaks Region/City breakdowns).
}

function emptyGrouping(groupBy: string): Grouping {
  return { groupBy, whitelistFilters: [], blacklistFilters: [] }
}

function topLevel(
  funnelId: string,
  trafficSourceId: string | undefined,
  countryCode: string | undefined,
): Grouping[] {
  const filters: Grouping[] = [
    { groupBy: STATS_GROUP_BY.elementFunnel, whitelistFilters: [funnelId], blacklistFilters: [] },
  ]
  if (trafficSourceId) {
    filters.push({
      groupBy: STATS_GROUP_BY.trafficSource,
      whitelistFilters: [trafficSourceId],
      blacklistFilters: [],
    })
  }
  if (countryCode?.trim()) {
    filters.push({
      groupBy: STATS_GROUP_BY.countryCode,
      whitelistFilters: [countryCode.trim().toUpperCase()],
      blacklistFilters: [],
    })
  }
  return filters
}

const QUICKSTATS_FLAT_GROUPINGS: Partial<Record<FunnelQuickStatsTab, string>> = {
  'conversion-paths': STATS_GROUP_BY.conversionPathLandersAndOffers,
  'traffic-sources': STATS_GROUP_BY.trafficSource,
  funnels: STATS_GROUP_BY.elementFunnel,
  landers: STATS_GROUP_BY.lander,
  offers: STATS_GROUP_BY.offer,
  'week-parting': STATS_GROUP_BY.weekParting,
  'day-parting': STATS_GROUP_BY.dayParting,
  'device-type': STATS_GROUP_BY.deviceType,
  'device-name': STATS_GROUP_BY.deviceModel,
  os: STATS_GROUP_BY.deviceOs,
  'os-version': STATS_GROUP_BY.deviceOsVersion,
  'os-browser': STATS_GROUP_BY.deviceBrowser,
  browser: STATS_GROUP_BY.deviceBrowser,
  isp: STATS_GROUP_BY.isp,
  carrier: STATS_GROUP_BY.carrier,
  ip: STATS_GROUP_BY.blockIp,
  referrer: STATS_GROUP_BY.referrerDomain,
  country: STATS_GROUP_BY.countryName,
  continent: STATS_GROUP_BY.continent,
  'connection-type': STATS_GROUP_BY.connectionType,
  region: STATS_GROUP_BY.region,
}

/**
 * Build drilldown bodies for Quick Stats tabs so the UI can request a scoped,
 * small metric set instead of the legacy quickstats page payload.
 */
export function buildDrilldownRequestForTab(
  tab: FunnelQuickStatsTab,
  args: {
    campaignId: string
    funnelId: string
    trafficSourceId?: string
    /** ISO 3166-1 alpha-2, used for region/city tabs */
    countryCode?: string
    trackingFieldName?: string
    dateFrom: Date
    dateTo: Date
    timeZone: ApiTimeZone
  },
): DrilldownRequest | null {
  const { campaignId, funnelId, trafficSourceId, countryCode, trackingFieldName, dateFrom, dateTo, timeZone } = args
  const reportingTz = timeZone.name || 'UTC'
  const timeRange = toApiDateTimeRangeForReporting(dateFrom, dateTo, reportingTz)
  const baseOptions = {
    viewType: 'flat' as const,
    idCampaignFilter: campaignId,
    idFunnelFilter: funnelId,
    idTrafficSourceFilter: trafficSourceId ?? null,
  }

  const paging = { start: 0, length: 500 }
  const sorting = {
    sortingColumns: [{ columnName: 'Entrances', order: 'desc' as const }],
  }

  const tls = topLevel(funnelId, trafficSourceId, countryCode)
  if (tab === 'tracking-fields') {
    const fieldName = trackingFieldName?.trim()
    if (!fieldName) return null
    const trackingFieldGrouping = trackingFieldConstantForSlot(1)
    return {
      timeRange,
      timeZone,
      topLevelFilters: tls,
      groupings: [emptyGrouping(trackingFieldGrouping)],
      options: baseOptions,
      paging,
      sorting,
      trackingFieldMappings: {
        [trackingFieldGrouping]: { id: fieldName },
      },
      metrics: [...QUICKSTATS_STANDARD_METRICS],
    }
  }

  const flatGrouping = QUICKSTATS_FLAT_GROUPINGS[tab]
  if (flatGrouping) {
    if ((tab === 'region' || tab === 'city') && (!countryCode?.trim() || countryCode.trim().length < 2)) {
      return null
    }
    return {
      timeRange,
      timeZone,
      topLevelFilters: tls,
      groupings: [emptyGrouping(flatGrouping)],
      options: baseOptions,
      paging,
      sorting,
      metrics: [...QUICKSTATS_STANDARD_METRICS],
    }
  }

  switch (tab) {
    case 'conversion-paths-all-nodes':
      return {
        timeRange,
        timeZone,
        topLevelFilters: tls,
        groupings: [emptyGrouping(STATS_GROUP_BY.conversionPathAllNodes)],
        options: { ...baseOptions, viewType: 'tree' },
        paging,
        sorting,
        metrics: [...QUICKSTATS_STANDARD_METRICS],
      }

    case 'mvt-combinations':
      return {
        timeRange,
        timeZone,
        topLevelFilters: tls,
        groupings: [emptyGrouping(STATS_GROUP_BY.landerOrOffer), emptyGrouping(STATS_GROUP_BY.mvtCombination)],
        options: { ...baseOptions, viewType: 'tree' },
        paging,
        sorting,
        metrics: [...QUICKSTATS_STANDARD_METRICS],
      }

    case 'mvt-kv-pairs':
      return {
        timeRange,
        timeZone,
        topLevelFilters: tls,
        groupings: [emptyGrouping(STATS_GROUP_BY.landerOrOffer), emptyGrouping(STATS_GROUP_BY.mvtKv)],
        options: { ...baseOptions, viewType: 'tree' },
        paging,
        sorting,
        metrics: [...QUICKSTATS_STANDARD_METRICS],
      }

    /** Tree: Region → City under the selected country (top-level Country Code filter). */
    case 'city':
      if (!countryCode?.trim() || countryCode.trim().length < 2) return null
      return {
        timeRange,
        timeZone,
        topLevelFilters: tls,
        groupings: [emptyGrouping(STATS_GROUP_BY.region), emptyGrouping(STATS_GROUP_BY.city)],
        options: { ...baseOptions, viewType: 'tree' },
        paging,
        sorting,
        metrics: [...QUICKSTATS_STANDARD_METRICS],
      }

    default:
      return null
  }
}

export interface QuickStatsLoadBody {
  idCampaign: string
  statsType: string
  statsTypeFilter?: string | null
  idTrafficSourceFilter?: string | null
  idFunnelFilter?: string | null
  currentPeriod: {
    timeRange: ReturnType<typeof toApiDateTimeRangeForReporting>
    timeZone: ApiTimeZone
  }
}

export function buildQuickStatsLoadBody(
  tab: FunnelQuickStatsTab,
  args: {
    campaignId: string
    funnelId: string
    trafficSourceId?: string
    trackingFieldName?: string
    dateFrom: Date
    dateTo: Date
    timeZone: ApiTimeZone
  },
): QuickStatsLoadBody | null {
  const statsType = QUICKSTATS_TAB_TYPES[tab]
  if (!statsType) return null

  const { campaignId, funnelId, trafficSourceId, trackingFieldName, dateFrom, dateTo, timeZone } = args
  const reportingTz = timeZone.name || 'UTC'

  let statsTypeFilter: string | null = null
  if (tab === 'tracking-fields' && trackingFieldName) {
    statsTypeFilter = trackingFieldName
  }

  return {
    idCampaign: campaignId,
    statsType,
    statsTypeFilter,
    idTrafficSourceFilter: trafficSourceId ?? null,
    idFunnelFilter: funnelId,
    currentPeriod: {
      timeRange: toApiDateTimeRangeForReporting(dateFrom, dateTo, reportingTz),
      timeZone,
    },
  }
}

export function getCell(row: { cells?: unknown[] }, index: number): ReportCell {
  const raw = row as unknown as Record<string, unknown>
  if (Array.isArray(row.cells)) {
    const cell = row.cells[index] as Partial<ReportCell> | undefined
    return {
      raw: cell?.raw == null ? '' : cell.raw,
      formatted: String(cell?.formatted ?? ''),
    }
  }
  const c = raw[String(index)] as ReportCell | undefined
  return c ?? { raw: '', formatted: '' }
}

/**
 * Flatten API rows (tree or flat) into one row per line for ag-Grid.
 */
export function flattenReportToGridRows(report: Report): Record<string, string>[] {
  const n = report.columns.length
  const out: Record<string, string>[] = []

  const walk = (rows: ReportRow[] | undefined, depth: number) => {
    if (!rows?.length) return
    for (const row of rows) {
      const obj: Record<string, string> = {}
      for (let i = 0; i < n; i++) {
        const cell = getCell(row, i)
        const text = cell.formatted ?? ''
        obj[`c${i}`] = i === 0 && depth > 0 ? `${'\u00A0\u00A0'.repeat(depth)}${text}` : text
      }
      out.push(obj)

      const ex = row.expandableInfo
      if (ex?.children?.length) {
        walk(ex.children, depth + 1)
      }
      if (row.children?.length) {
        walk(row.children, depth + 1)
      }
    }
  }

  walk(report.rows, 0)
  return out
}

export function totalsToGridRow(report: Report): Record<string, string> | null {
  if (!report.totals?.cells?.length) return null
  const n = report.columns.length
  const obj: Record<string, string> = {}
  obj.c0 = 'Totals'
  for (let i = 0; i < n; i++) {
    const cell = report.totals.cells[i]
    obj[`c${i}`] = i === 0 ? 'Totals' : (cell?.formatted ?? '')
  }
  return obj
}

export function narrowReportToQuickStatsColumns(report: Report): Report {
  const metricNames = new Set<string>(QUICKSTATS_STANDARD_METRICS)
  const keepIndexes = report.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.type === 'grouping' || metricNames.has(column.name))
    .map(({ index }) => index)

  if (keepIndexes.length === report.columns.length) return report

  const filterRow = (row: ReportRow): ReportRow => ({
    ...row,
    cells: keepIndexes.map((index) => getCell(row, index)),
    children: row.children?.map(filterRow),
    expandableInfo:
      row.expandableInfo && typeof row.expandableInfo === 'object' ?
        {
          ...row.expandableInfo,
          children: Array.isArray(row.expandableInfo.children) ? row.expandableInfo.children.map(filterRow) : undefined,
        }
      : row.expandableInfo,
  })

  return {
    ...report,
    columns: keepIndexes.map((index) => report.columns[index]),
    rows: report.rows.map(filterRow),
    totals: {
      ...report.totals,
      cells: keepIndexes.map((index) => getCell(report.totals, index)),
    },
  }
}
