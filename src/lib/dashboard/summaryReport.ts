import { cellRaw } from '@/components/ui-kit/data-table'
import type { DashboardSummaryStats } from '@/components/dashboard/StatsCards'
import { resolveReportingTimezone } from '@/lib/reportingTimezone'
import { toApiDateTimeRangeForReporting } from '@/lib/statsDateRange'
import type { DrilldownRequest, Report } from '@/types/stats'

export const DASHBOARD_SUMMARY_METRICS = [
  'Entrances',
  'Lander Views',
  'Offer Views',
  'Lander Clicks',
  'Offer Clicks',
  'Conv.',
  'Revenue',
  'Cost',
  'ROI',
] as const

export const ZERO_DASHBOARD_STATS: DashboardSummaryStats = {
  visits: 0,
  clicks: 0,
  landerViews: 0,
  offerViews: 0,
  conversions: 0,
  revenue: 0,
  cost: 0,
  net: 0,
  roi: 'N/A',
}

export interface DashboardChartPoint {
  date: string
  visits: number
  clicks: number
  conversions: number
  revenue: number
  cost: number
  roi: number
}

export type DashboardChartGranularity = 'hourly' | 'daily' | 'weekly'

export interface DashboardChartGroupingConfig {
  granularity: DashboardChartGranularity
  groupings: string[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function buildColMap(report: Report): Map<string, number> {
  const map = new Map<string, number>()
  report.columns?.forEach((column, index) => map.set(column.name?.toLowerCase() ?? '', index))
  return map
}

export function getDashboardChartGrouping(from: Date, to: Date): DashboardChartGroupingConfig {
  const durationDays = Math.max(0, (to.getTime() - from.getTime()) / DAY_MS)
  if (durationDays < 3) {
    return { granularity: 'hourly', groupings: ['Time: Date', 'Time: HH:MM'] }
  }
  if (durationDays > 90) {
    return { granularity: 'weekly', groupings: ['Time: Date'] }
  }
  return { granularity: 'daily', groupings: ['Time: Date'] }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function parseDateParts(value: string | number | undefined): { year: number; month: number; day: number } | null {
  if (value == null) return null
  const text = String(value)
  const iso = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
  }
  const us = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (us) {
    return { year: Number(us[3]), month: Number(us[1]), day: Number(us[2]) }
  }
  return null
}

function formatMonthDay(value: string | number | undefined): string {
  const parts = parseDateParts(value)
  if (!parts) return value == null ? '' : String(value)
  return `${pad2(parts.month)}-${pad2(parts.day)}`
}

function weekStartKey(value: string | number | undefined): string {
  const parts = parseDateParts(value)
  if (!parts) return value == null ? '' : String(value)
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - day)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function parseHourMinutes(value: string | number | undefined): number {
  if (value == null) return 0
  const text = String(value)
  const match = text.match(/(\d{1,2})(?::(\d{2}))?/)
  if (!match) return 0
  const hour = Math.min(23, Math.max(0, Number(match[1])))
  const minutes = Math.min(59, Math.max(0, Number(match[2] ?? 0)))
  return (hour * 60) + minutes
}

function chartSortKey(
  dateValue: string | number | undefined,
  hourValue: string | number | undefined,
): number | string {
  const parts = parseDateParts(dateValue)
  if (!parts) return dateValue == null ? '' : String(dateValue)
  return Date.UTC(parts.year, parts.month - 1, parts.day) + (parseHourMinutes(hourValue) * 60 * 1000)
}

export function extractDashboardStats(report: Report): DashboardSummaryStats {
  const cells = report.totals?.cells
  if (!cells || cells.length === 0) return ZERO_DASHBOARD_STATS

  const map = buildColMap(report)
  const get = (name: string) => cellRaw(cells[map.get(name) ?? -1])

  const visits = get('entrances')
  const landerViews = get('lander views')
  const offerViews = get('offer views')
  const landerClicks = get('lander clicks')
  const offerClicks = get('offer clicks')
  const conversions = get('conv.')
  const revenue = get('revenue')
  const cost = get('cost')
  const roiCell = cells[map.get('roi') ?? -1]
  const roi = roiCell?.formatted ?? 'N/A'

  return {
    visits,
    landerViews,
    offerViews,
    clicks: landerClicks + offerClicks,
    conversions,
    revenue,
    cost,
    net: revenue - cost,
    roi,
  }
}

export function extractDashboardChartData(
  report: Report,
  granularity: DashboardChartGranularity,
): DashboardChartPoint[] {
  if (!report.rows || report.rows.length === 0) return []
  const map = buildColMap(report)

  const points = report.rows.map((row) => {
    const cells = row.cells ?? []
    const get = (name: string) => cellRaw(cells[map.get(name) ?? -1])
    const dateCell = cells[0]
    const dateValue = dateCell?.raw || dateCell?.formatted
    const hourValue = cells[1]?.formatted || cells[1]?.raw

    return {
      sortKey: chartSortKey(dateValue, granularity === 'hourly' ? hourValue : undefined),
      point: {
        date: granularity === 'hourly'
          ? `${formatMonthDay(dateValue)} ${hourValue ?? ''}`.trim()
          : formatMonthDay(dateValue),
        visits: get('entrances'),
        clicks: get('lander clicks') + get('offer clicks'),
        conversions: get('conv.'),
        revenue: get('revenue'),
        cost: get('cost'),
        roi: get('roi'),
      },
    }
  })

  if (granularity !== 'weekly') {
    return points
      .sort((a, b) => {
        if (typeof a.sortKey === 'number' && typeof b.sortKey === 'number') return a.sortKey - b.sortKey
        return String(a.sortKey).localeCompare(String(b.sortKey))
      })
      .map(({ point }) => point)
  }

  const weekly = new Map<string, DashboardChartPoint>()
  for (const row of report.rows) {
    const cells = row.cells ?? []
    const get = (name: string) => cellRaw(cells[map.get(name) ?? -1])
    const dateCell = cells[0]
    const bucket = weekStartKey(dateCell?.raw || dateCell?.formatted)
    const previous = weekly.get(bucket) ?? {
      date: formatMonthDay(bucket),
      visits: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      cost: 0,
      roi: 0,
    }
    previous.visits += get('entrances')
    previous.clicks += get('lander clicks') + get('offer clicks')
    previous.conversions += get('conv.')
    previous.revenue += get('revenue')
    previous.cost += get('cost')
    previous.roi = previous.cost > 0 ? ((previous.revenue - previous.cost) / previous.cost) * 100 : 0
    weekly.set(bucket, previous)
  }

  return Array.from(weekly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, point]) => point)
}

export function dashboardStatsChanged(
  previous: DashboardSummaryStats | undefined,
  next: DashboardSummaryStats,
): boolean {
  if (!previous) return false
  return (Object.keys(next) as (keyof DashboardSummaryStats)[]).some(
    (key) => previous[key] !== next[key],
  )
}

export function buildDashboardSummaryRequest(
  dateFrom: Date,
  dateTo: Date,
  timezone: string,
): DrilldownRequest {
  const chartGrouping = getDashboardChartGrouping(dateFrom, dateTo)
  const reportingTimezone = resolveReportingTimezone(timezone)
  return {
    timeRange: toApiDateTimeRangeForReporting(dateFrom, dateTo, reportingTimezone),
    timeZone: { name: reportingTimezone },
    groupings: chartGrouping.groupings.map((groupBy) => ({
      groupBy,
      whitelistFilters: [],
      blacklistFilters: [],
    })),
    options: { viewType: 'flat' },
    metrics: [...DASHBOARD_SUMMARY_METRICS],
  }
}
