import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { subDays } from "date-fns"
import { fetchAllFlatDrilldownRows } from "@/api/drilldown"
import { useDashboardStore } from "@/store/dashboard"
import { StatsCards, type DashboardSummaryStats } from "@/components/dashboard/StatsCards"
import { DashboardChart } from "@/components/dashboard/DashboardChart"
import { DashboardTopTable, type DashboardTopTableProps } from "@/components/dashboard/DashboardTopTable"
import { useLazySectionVisible } from "@/hooks/useLazySectionVisible"
import { PageShell, TimezoneSelect } from "@/components/ui-kit"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { Tag } from "@/components/ui-kit"
import { Button } from "@/components/ui-kit"
import { toApiDateTimeRange } from "@/lib/statsDateRange"
import type { Report } from "@/types/stats"
import { cellRaw } from "@/components/ui-kit/data-table"

const DASHBOARD_SUMMARY_METRICS = [
  "Entrances",
  "Lander Views",
  "Offer Views",
  "Lander Clicks",
  "Offer Clicks",
  "Conv.",
  "Revenue",
  "Cost",
  "ROI",
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
  roi: "N/A",
}

const WIDGETS = [
  { id: "dashboard-widget-top-funnels", title: "Top Funnels", groupBy: "Element: Funnel" },
  { id: "dashboard-widget-top-traffic-sources", title: "Top Traffic Sources", groupBy: "Third Parties: Traffic Source" },
  { id: "dashboard-widget-top-landers", title: "Top Landers", groupBy: "Element: Lander" },
  { id: "dashboard-widget-top-offers", title: "Top Offers", groupBy: "Element: Offer" },
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
  report.columns?.forEach((column, index) => map.set(column.name?.toLowerCase() ?? "", index))
  return map
}

function extractStats(report: Report): DashboardSummaryStats {
  const cells = report.totals?.cells
  if (!cells || cells.length === 0) return ZERO_STATS

  const map = buildColMap(report)
  const get = (name: string) => cellRaw(cells[map.get(name) ?? -1])

  const visits = get("entrances")
  const landerViews = get("lander views")
  const offerViews = get("offer views")
  const landerClicks = get("lander clicks")
  const offerClicks = get("offer clicks")
  const conversions = get("conversions")
  const revenue = get("revenue")
  const cost = get("cost")
  const roiCell = cells[map.get("roi") ?? -1]
  const roi = roiCell?.formatted ?? "N/A"

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
      date: cells[0]?.formatted ?? "",
      visits: get("entrances"),
      clicks: get("lander clicks") + get("offer clicks"),
      conversions: get("conversions"),
      revenue: get("revenue"),
      cost: get("cost"),
      roi: get("roi"),
    }
  })
}

function statsChanged(previous: DashboardSummaryStats | undefined, next: DashboardSummaryStats): boolean {
  if (!previous) return false
  return (Object.keys(next) as (keyof DashboardSummaryStats)[]).some(
    (key) => previous[key] !== next[key],
  )
}

function DashboardTopTableLazySlot(props: Omit<DashboardTopTableProps, "fetchEnabled">) {
  const { ref, isVisible } = useLazySectionVisible()
  return (
    <div ref={ref} className="min-h-[320px] min-w-0">
      <DashboardTopTable {...props} fetchEnabled={isVisible} />
    </div>
  )
}

export function DashboardPage() {
  const { chartMetric, setChartMetric } = useDashboardStore()
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [dateRange, setDateRange] = useState(() => ({
    from: subDays(new Date(), 30),
    to: new Date(),
  }))
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [pulseStats, setPulseStats] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)

  const [stats, setStats] = useState<DashboardSummaryStats | undefined>(undefined)
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([])
  const [statsLoaded, setStatsLoaded] = useState(false)
  const [chartLoaded, setChartLoaded] = useState(false)

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
    () => toApiDateTimeRange(dateRange.from, dateRange.to),
    [dateRange.from, dateRange.to],
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
    const tr = toApiDateTimeRange(from, to)
    const timeZone = { name: tzRef.current }

    setStatsLoaded(false)
    setChartLoaded(false)

    let cancelled = false

    fetchAllFlatDrilldownRows({
        timeRange: tr,
        timeZone,
        groupings: [{ groupBy: "Time: Date", whitelistFilters: [], blacklistFilters: [] }],
        options: { viewType: "flat" },
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
        setStatsLoaded(true)
        setChartPoints(extractChartData(report))
        setChartLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setStats(ZERO_STATS)
        setStatsLoaded(true)
        setChartPoints([])
        setChartLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey, dataVersion, triggerPulse])

  useEffect(() => {
    if (!isAutoRefresh) return

    const intervalId = window.setInterval(() => {
      setDataVersion((v) => v + 1)
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [isAutoRefresh])

  const bumpRefresh = useCallback(() => {
    setDataVersion((v) => v + 1)
  }, [])

  return (
    <PageShell
      title="Dashboard"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {isAutoRefresh && <Tag>Live</Tag>}
          <Button
            htmlType="button"
            type={isAutoRefresh ? "primary" : "default"}
            onClick={() => setIsAutoRefresh((current) => !current)}
            iconName="timer"
            iconSize="sm"
            iconAnimation={isAutoRefresh ? 'pulse' : 'none'}
          >
            Auto-refresh
          </Button>
          <Button htmlType="button" type="default" onClick={bumpRefresh} iconName="refresh-cw" iconSize="sm">
            Refresh
          </Button>
          <DateRangePicker
            value={{ from: dateRange.from, to: dateRange.to, preset: "last30" }}
            timezone={tz}
            onChange={(value) => {
              if (value.from && value.to) {
                setDateRange({ from: value.from, to: value.to })
              }
            }}
          />
          <TimezoneSelect value={tz} onChange={setTz} />
        </div>
      }
    >
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-4">
        <DashboardChart
          className="min-h-0 min-w-0 shadow-sm"
          data={chartPoints}
          metric={chartMetric}
          onMetricChange={setChartMetric}
          isLoading={!chartLoaded}
          chartHeight={260}
        />
        <div className={pulseStats ? "min-h-0 animate-pulse" : "min-h-0"}>
          <StatsCards stats={stats} isLoading={!statsLoaded} layout="dashboard" className="h-full min-h-[280px]" />
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
          />
        ))}
      </div>
    </PageShell>
  )
}
