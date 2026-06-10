import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { useDashboardSummaryQuery } from '@/api/hooks/useDashboard'
import { useDashboardStore } from '@/store/dashboard'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { DashboardChart } from '@/components/dashboard/DashboardChart'
import { DashboardTopTable, type DashboardTopTableProps } from '@/components/dashboard/DashboardTopTable'
import { useLazySectionVisible } from '@/hooks/useLazySectionVisible'
import { PageShell, TimezoneSelect, Button, Modal, Select, type SelectOption } from '@/components/ui-kit'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { toApiDateTimeRangeForReporting } from '@/lib/statsDateRange'
import type { DateRange } from '@/lib/date-presets'
import {
  dashboardStatsChanged,
  extractDashboardChartData,
  extractDashboardStats,
  getDashboardChartGrouping,
  ZERO_DASHBOARD_STATS,
} from '@/lib/dashboard/summaryReport'

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

function DashboardTopTableLazySlot(
  props: Omit<DashboardTopTableProps, 'fetchEnabled'> & {
    fetchEnabled?: boolean
  },
) {
  const { ref, isVisible } = useLazySectionVisible()
  const { fetchEnabled: fe, ...rest } = props
  return (
    <div ref={ref} className="min-h-[292px] min-w-0">
      <DashboardTopTable {...rest} fetchEnabled={fe ?? isVisible} />
    </div>
  )
}

const TABLE_PAGE_OPTIONS: SelectOption[] = [
  { value: '5', label: '5 rows' },
  { value: '10', label: '10 rows' },
  { value: '25', label: '25 rows' },
  { value: '50', label: '50 rows' },
  { value: '100', label: '100 rows' },
]

/** Dashboard-only: 0 = off. Summary, chart, and top tables share dashboard query invalidation. */
const AUTO_REFRESH_INTERVAL_OPTIONS: SelectOption[] = [
  { value: '0', label: 'Auto refresh off' },
  { value: '30', label: 'Every 30 seconds' },
  { value: '60', label: 'Every 60 seconds' },
  { value: '120', label: 'Every 120 seconds' },
]

const DEFAULT_DASHBOARD_AUTO_REFRESH_SEC = 120

export function DashboardPage() {
  const queryClient = useQueryClient()
  const {
    chartMetric,
    setChartMetric,
    dashboardTablePageSize,
    setDashboardTablePageSize,
    timezone: tz,
    setTimezone: setTz,
    dateRange,
    setDateRange,
  } = useDashboardStore()

  const [pulseStats, setPulseStats] = useState(false)
  const [autoRefreshIntervalSec, setAutoRefreshIntervalSec] = useState(DEFAULT_DASHBOARD_AUTO_REFRESH_SEC)
  const [secondsUntilAutoRefresh, setSecondsUntilAutoRefresh] = useState(DEFAULT_DASHBOARD_AUTO_REFRESH_SEC)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const previousStatsRef = useRef<ReturnType<typeof extractDashboardStats> | undefined>(undefined)
  const pulseTimerRef = useRef<number | undefined>(undefined)

  const chartGrouping = useMemo(
    () => getDashboardChartGrouping(dateRange.from, dateRange.to),
    [dateRange.from, dateRange.to],
  )

  const timeRange = useMemo(
    () => toApiDateTimeRangeForReporting(dateRange.from, dateRange.to, tz),
    [dateRange.from, dateRange.to, tz],
  )

  const summaryQuery = useDashboardSummaryQuery(dateRange.from, dateRange.to, tz)

  const stats = useMemo(
    () => (summaryQuery.data ? extractDashboardStats(summaryQuery.data) : undefined),
    [summaryQuery.data],
  )

  const chartPoints = useMemo(
    () => (summaryQuery.data
      ? extractDashboardChartData(summaryQuery.data, chartGrouping.granularity)
      : []),
    [summaryQuery.data, chartGrouping.granularity],
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
    if (!stats) return
    const previous = previousStatsRef.current
    previousStatsRef.current = stats
    if (!previous || !dashboardStatsChanged(previous, stats)) return
    const pulseTimer = window.setTimeout(() => triggerPulse(), 0)
    return () => window.clearTimeout(pulseTimer)
  }, [stats, triggerPulse])

  const invalidateDashboardQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  }, [queryClient])

  const invalidateDashboardQueriesRef = useRef(invalidateDashboardQueries)
  useEffect(() => {
    invalidateDashboardQueriesRef.current = invalidateDashboardQueries
  }, [invalidateDashboardQueries])

  const autoRefreshIntervalSecRef = useRef(autoRefreshIntervalSec)
  useEffect(() => {
    autoRefreshIntervalSecRef.current = autoRefreshIntervalSec
  }, [autoRefreshIntervalSec])

  useEffect(() => {
    const interval = autoRefreshIntervalSecRef.current
    if (interval > 0) {
      setSecondsUntilAutoRefresh(interval)
    }
  }, [dateRange.from, dateRange.to, tz])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const periodSec = autoRefreshIntervalSecRef.current
      if (periodSec <= 0) return
      setSecondsUntilAutoRefresh((secondsLeft) => {
        if (secondsLeft <= 1) {
          invalidateDashboardQueriesRef.current()
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
    invalidateDashboardQueries()
  }, [autoRefreshIntervalSec, invalidateDashboardQueries])

  const autoRefreshSelectValue = String(autoRefreshIntervalSec)

  const handleDashboardDateRangeChange = useCallback((range: DateRange & { preset: string | null }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to })
    }
  }, [setDateRange])

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

  const summaryLoading = summaryQuery.isLoading && stats === undefined
  const summaryFailed = summaryQuery.isError && stats === undefined

  useEffect(() => {
    if (!summaryFailed) return
    previousStatsRef.current = ZERO_DASHBOARD_STATS
  }, [summaryFailed])

  const displayStats = summaryFailed ? ZERO_DASHBOARD_STATS : stats

  return (
    <PageShell
      title="Dashboard"
      subtitle={dashboardAutoRefreshSubtitle}
      density="dense"
      className="min-w-0 overflow-x-hidden [&>div:first-child>div:last-child]:hidden md:[&>div:first-child>div:last-child]:flex"
      actions={
        <div className="hidden min-w-0 items-center justify-end gap-2 md:flex">
          <Button
            htmlType="button"
            type="default"
            onClick={handleOpenDashboardSettings}
            iconName="settings"
            iconSize="sm"
          >
            Settings
          </Button>
          <Button
            htmlType="button"
            type="default"
            onClick={bumpRefresh}
            iconName="refresh-cw"
            iconSize="sm"
          >
            Refresh
          </Button>
          <DateRangePicker
            value={dateRangePickerValue}
            timezone={tz}
            density="compact"
            onChange={handleDashboardDateRangeChange}
            className="[--ff-date-range-compact-max:236px]"
          />
          <TimezoneSelect
            value={tz}
            onChange={setTz}
            style={{ minWidth: 180, width: 180 }}
          />
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
              Time zone
            </span>
            <TimezoneSelect
              value={tz}
              onChange={setTz}
              className="w-full"
              style={{ width: '100%' }}
              aria-label="Dashboard time zone"
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

      <div className="grid min-w-0 grid-cols-[2rem_2rem_minmax(0,1fr)] items-center gap-1.5 md:hidden">
        <Button
          htmlType="button"
          type="default"
          onClick={handleOpenDashboardSettings}
          iconName="settings"
          iconSize="sm"
          aria-label="Dashboard settings"
        />
        <Button
          htmlType="button"
          type="default"
          onClick={bumpRefresh}
          iconName="refresh-cw"
          iconSize="sm"
          aria-label="Refresh dashboard"
        />
        <DateRangePicker
          value={dateRangePickerValue}
          timezone={tz}
          density="compact"
          onChange={handleDashboardDateRangeChange}
          className="min-w-0 !w-full !max-w-full"
        />
      </div>

      <section className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
        <DashboardChart
          className="min-h-0 min-w-0"
          data={chartPoints}
          metric={chartMetric}
          onMetricChange={setChartMetric}
          isLoading={summaryLoading && chartPoints.length === 0}
          chartHeight={260}
        />
        <div className={pulseStats ? 'min-h-0 animate-pulse' : 'min-h-0'}>
          <StatsCards
            stats={displayStats}
            isLoading={summaryLoading}
            layout="dashboard"
            className="h-full min-h-[280px]"
          />
        </div>
      </section>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        {WIDGETS.map((widget) => (
          <DashboardTopTableLazySlot
            key={`${widget.id}-${dashboardTablePageSize}`}
            title={widget.title}
            groupBy={widget.groupBy}
            tableConfigKey={widget.id}
            timeRange={timeRange}
            timezone={tz}
            pageSize={dashboardTablePageSize}
          />
        ))}
      </div>
    </PageShell>
  )
}
