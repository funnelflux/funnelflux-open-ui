import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { subDays } from 'date-fns'
import { fetchAllFlatDrilldownRows } from '@/api/drilldown'
import { useDashboardStore } from '@/store/dashboard'
import { StatsCards, type DashboardSummaryStats } from '@/components/dashboard/StatsCards'
import { DashboardChart } from '@/components/dashboard/DashboardChart'
import { DashboardTopTable, type DashboardTopTableProps } from '@/components/dashboard/DashboardTopTable'
import { useLazySectionVisible } from '@/hooks/useLazySectionVisible'
import { PageShell, TimezoneSelect, Button, Modal, Select, type SelectOption } from '@/components/ui-kit'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { toApiDateTimeRangeForReporting } from '@/lib/statsDateRange'
import type { DateRange } from '@/lib/date-presets'
import type { Report } from '@/types/stats'
import { cellRaw } from '@/components/ui-kit/data-table'
import { getErrorMessage } from '@/lib/utils'

const DASHBOARD_SUMMARY_METRICS = [
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

const ZERO_STATS: DashboardSummaryStats = {
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

const WIDGETS = [
  { id: 'dashboard-widget-top-funnels', title: 'Funnels', groupBy: 'Element: Funnel' },
  {
    id: 'dashboard-widget-top-traffic-sources',
    title: 'Traffic Sources',
    groupBy: 'Third Parties: Traffic Source',
  },
  { id: 'dashboard-widget-top-landers', title: 'Landers', groupBy: 'Element: Lander' },
  { id: 'dashboard-widget-top-offers', title: 'Offers', groupBy: 'Element: Offer' },
] as const

interface ChartPoint {
  date: string
  visits: number
  clicks: number
  conversions: number
  revenue: number
  cost: number
  roi: number
}

function buildColMap(report: Report): Map<string, number> {
  const map = new Map<string, number>()
  report.columns?.forEach((column, index) => map.set(column.name?.toLowerCase() ?? '', index))
  return map
}

function extractStats(report: Report): DashboardSummaryStats {
  const cells = report.totals?.cells
  if (!cells || cells.length === 0) return ZERO_STATS

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

function extractChartData(report: Report): ChartPoint[] {
  if (!report.rows || report.rows.length === 0) return []
  const map = buildColMap(report)

  return report.rows.map((row) => {
    const cells = row.cells ?? []
    const get = (name: string) => cellRaw(cells[map.get(name) ?? -1])

    return {
      date: cells[0]?.formatted ?? '',
      visits: get('entrances'),
      clicks: get('lander clicks') + get('offer clicks'),
      conversions: get('conv.'),
      revenue: get('revenue'),
      cost: get('cost'),
      roi: get('roi'),
    }
  })
}

function statsChanged(previous: DashboardSummaryStats | undefined, next: DashboardSummaryStats): boolean {
  if (!previous) return false
  return (Object.keys(next) as (keyof DashboardSummaryStats)[]).some(
    (key) => previous[key] !== next[key],
  )
}

function DashboardTopTableLazySlot(
  props: Omit<DashboardTopTableProps, 'fetchEnabled'> & {
    fetchEnabled?: boolean
  },
) {
  const { ref, isVisible } = useLazySectionVisible()
  const { fetchEnabled: fe, ...rest } = props
  return (
    <div ref={ref} className="min-h-[320px] min-w-0">
      <DashboardTopTable {...rest} fetchEnabled={fe ?? isVisible} />
    </div>
  )
}

const TABLE_PAGE_OPTIONS: SelectOption[] = [
  { value: '10', label: '10 rows' },
  { value: '25', label: '25 rows' },
  { value: '50', label: '50 rows' },
  { value: '100', label: '100 rows' },
]

/** Dashboard-only: 0 = off. Summary, chart, and top tables share `dataVersion`. */
const AUTO_REFRESH_INTERVAL_OPTIONS: SelectOption[] = [
  { value: '0', label: 'Auto refresh off' },
  { value: '30', label: 'Every 30 seconds' },
  { value: '60', label: 'Every 60 seconds' },
  { value: '120', label: 'Every 120 seconds' },
]

const DEFAULT_DASHBOARD_AUTO_REFRESH_SEC = 120

export function DashboardPage() {
  const {
    chartMetric,
    setChartMetric,
    dashboardTablePageSize,
    setDashboardTablePageSize,
  } = useDashboardStore()

  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 30),
    to: new Date(),
  }))
  const [pulseStats, setPulseStats] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [autoRefreshIntervalSec, setAutoRefreshIntervalSec] = useState(DEFAULT_DASHBOARD_AUTO_REFRESH_SEC)
  const [secondsUntilAutoRefresh, setSecondsUntilAutoRefresh] = useState(DEFAULT_DASHBOARD_AUTO_REFRESH_SEC)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [stats, setStats] = useState<DashboardSummaryStats | undefined>(undefined)
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([])

  const previousStatsRef = useRef<DashboardSummaryStats | undefined>(undefined)
  const pulseTimerRef = useRef<number | undefined>(undefined)
  const dateRangeRef = useRef(dateRange)
  const tzRef = useRef(tz)
  dateRangeRef.current = dateRange
  tzRef.current = tz

  const reloadKey = useMemo(
    () => `${dateRange.from.getTime()}-${dateRange.to.getTime()}-${tz}`,
    [dateRange.from, dateRange.to, tz],
  )

  const timeRange = useMemo(
    () => toApiDateTimeRangeForReporting(dateRange.from, dateRange.to, tz),
    [dateRange.from, dateRange.to, tz],
  )

  const triggerPulse = useCallback(() => {
    if (pulseTimerRef.current) {
      window.clearTimeout(pulseTimerRef.current)
    }
    setPulseStats(true)
    pulseTimerRef.current = window.setTimeout(() => setPulseStats(false), 900)
  }, [])

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const { from, to } = dateRangeRef.current
    const tr = toApiDateTimeRangeForReporting(from, to, tzRef.current)
    const timeZone = { name: tzRef.current }

    let cancelled = false

    fetchAllFlatDrilldownRows({
      timeRange: tr,
      timeZone,
      groupings: [{ groupBy: 'Time: Date', whitelistFilters: [], blacklistFilters: [] }],
      options: { viewType: 'flat' },
      metrics: [...DASHBOARD_SUMMARY_METRICS],
    })
      .then((report) => {
        if (cancelled) return
        const nextStats = extractStats(report)
        if (statsChanged(previousStatsRef.current, nextStats)) {
          triggerPulse()
        }
        previousStatsRef.current = nextStats
        setStats(nextStats)
        setChartPoints(extractChartData(report))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = getErrorMessage(err)
        console.error('dashboard summary load failed:', msg)
        previousStatsRef.current = ZERO_STATS
        setStats(ZERO_STATS)
        setChartPoints([])
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey, dataVersion, triggerPulse])

  const advanceDashboardDataVersion = useCallback(() => {
    setDataVersion((version) => version + 1)
  }, [])

  const advanceDashboardDataVersionRef = useRef(advanceDashboardDataVersion)
  advanceDashboardDataVersionRef.current = advanceDashboardDataVersion

  const autoRefreshIntervalSecRef = useRef(autoRefreshIntervalSec)
  autoRefreshIntervalSecRef.current = autoRefreshIntervalSec

  useEffect(() => {
    const interval = autoRefreshIntervalSecRef.current
    if (interval > 0) {
      setSecondsUntilAutoRefresh(interval)
    }
  }, [reloadKey])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const periodSec = autoRefreshIntervalSecRef.current
      if (periodSec <= 0) return
      setSecondsUntilAutoRefresh((secondsLeft) => {
        if (secondsLeft <= 1) {
          advanceDashboardDataVersionRef.current()
          return periodSec
        }
        return secondsLeft - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const handleAutoRefreshIntervalChange = useCallback((next: unknown) => {
    const parsed = typeof next === 'string' ? Number(next) : Number(next ?? 0)
    if (!Number.isFinite(parsed) || parsed < 0) return
    const rounded = Math.trunc(parsed)
    setAutoRefreshIntervalSec(rounded)
    setSecondsUntilAutoRefresh(rounded > 0 ? rounded : 0)
  }, [])

  const bumpRefresh = useCallback(() => {
    if (autoRefreshIntervalSec > 0) {
      setSecondsUntilAutoRefresh(autoRefreshIntervalSec)
    }
    advanceDashboardDataVersion()
  }, [advanceDashboardDataVersion, autoRefreshIntervalSec])

  const autoRefreshSelectValue = String(autoRefreshIntervalSec)

  const handleDashboardDateRangeChange = useCallback((range: DateRange & { preset: string | null }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to })
    }
  }, [])

  const dateRangePickerValue = useMemo<DateRange & { preset: string | null }>(
    () => ({ from: dateRange.from, to: dateRange.to, preset: 'last30' }),
    [dateRange.from, dateRange.to],
  )

  const handleSettingsPageSize = useCallback(
    (next: unknown) => {
      const parsed = typeof next === 'string' ? Number(next) : Number(next ?? 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        setDashboardTablePageSize(parsed)
      }
    },
    [setDashboardTablePageSize],
  )

  const tablePageSelectValue = String(dashboardTablePageSize)

  const handleOpenDashboardSettings = useCallback(() => setSettingsOpen(true), [])

  const handleCloseDashboardSettings = useCallback(() => setSettingsOpen(false), [])

  const dashboardAutoRefreshSubtitle = useMemo(() => {
    if (autoRefreshIntervalSec <= 0) return 'Auto refresh off.'
    return `Auto refresh every ${autoRefreshIntervalSec}s · Next refresh in ${secondsUntilAutoRefresh}s`
  }, [autoRefreshIntervalSec, secondsUntilAutoRefresh])

  return (
    <PageShell
      title="Dashboard"
      subtitle={dashboardAutoRefreshSubtitle}
      actions={
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
          <Button
            htmlType="button"
            type="default"
            onClick={handleOpenDashboardSettings}
            iconName="settings"
            iconSize="sm"
          >
            Settings
          </Button>
          <Button htmlType="button" type="default" onClick={bumpRefresh} iconName="refresh-cw" iconSize="sm">
            Refresh
          </Button>
          <DateRangePicker
            value={dateRangePickerValue}
            timezone={tz}
            density="compact"
            onChange={handleDashboardDateRangeChange}
            className="[--ff-date-range-compact-max:236px]"
          />
          <TimezoneSelect value={tz} onChange={setTz} />
        </div>
      }
    >
      <Modal
        title="Dashboard settings"
        open={settingsOpen}
        onCancel={handleCloseDashboardSettings}
        footer={null}
        destroyOnClose
      >
        <div className="flex flex-col gap-6 py-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Auto-refresh interval
            </span>
            <Select
              alphabetical={false}
              value={autoRefreshSelectValue}
              options={AUTO_REFRESH_INTERVAL_OPTIONS}
              onChange={handleAutoRefreshIntervalChange}
              aria-label="Dashboard auto-refresh interval"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rows per breakdown table
            </span>
            <Select
              alphabetical={false}
              value={tablePageSelectValue}
              options={TABLE_PAGE_OPTIONS}
              onChange={handleSettingsPageSize}
              aria-label="Dashboard table page size"
            />
          </div>
        </div>
      </Modal>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-4">
        <DashboardChart
          className="min-h-0 min-w-0 shadow-sm"
          data={chartPoints}
          metric={chartMetric}
          onMetricChange={setChartMetric}
          isLoading={stats === undefined && chartPoints.length === 0}
          chartHeight={260}
        />
        <div className={pulseStats ? 'min-h-0 animate-pulse' : 'min-h-0'}>
          <StatsCards
            stats={stats}
            isLoading={stats === undefined}
            layout="dashboard"
            className="h-full min-h-[280px]"
          />
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {WIDGETS.map((widget) => (
          <DashboardTopTableLazySlot
            key={widget.id}
            title={widget.title}
            groupBy={widget.groupBy}
            tableConfigKey={widget.id}
            timeRange={timeRange}
            timezone={tz}
            dataVersion={dataVersion}
            pageSize={dashboardTablePageSize}
          />
        ))}
      </div>
    </PageShell>
  )
}
