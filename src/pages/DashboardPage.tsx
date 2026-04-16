import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { subDays } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { api } from '@/api/client'
import { useDashboardStore } from '@/store/dashboard'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { DashboardChart } from '@/components/dashboard/DashboardChart'
import { PageShell, DataTable, TimezoneSelect } from '@/components/ui-kit'
import { cellRaw, entityRowId } from '@/components/ui-kit/data-table'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { Card, Tag } from 'antd'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui-kit'
import { toApiDateTimeRange } from '@/types/stats'
import type { Report } from '@/types/stats'
import type { LiveStats } from '@/types/ui'

const ZERO_STATS: LiveStats = { visits: 0, clicks: 0, conversions: 0, revenue: 0, cost: 0, net: 0, roi: 'N/A' }

/** Card body: table header (~32px) + 5 data rows (36px) + borders + card chrome — avoids layout jump while loading */
const WIDGET_CARD_MIN_HEIGHT_PX = 300

const WIDGETS = [
  { id: 'dashboard-widget-top-funnels', title: 'Top Funnels', groupBy: 'Element: Funnel', quickviewType: 'Element: Funnel' },
  { id: 'dashboard-widget-top-traffic-sources', title: 'Top Traffic Sources', groupBy: 'Third Parties: Traffic Source', quickviewType: 'Third Parties: Traffic Source' },
  { id: 'dashboard-widget-top-landers', title: 'Top Landers', groupBy: 'Element: Lander', quickviewType: 'Element: Lander' },
  { id: 'dashboard-widget-top-offers', title: 'Top Offers', groupBy: 'Element: Offer', quickviewType: 'Element: Offer' },
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

interface WidgetRow {
  id: string
  name: string
  visits: number
  visitsFormatted: string
}

interface WidgetState {
  title: string
  quickviewType: string
  rows: WidgetRow[]
  isLoading: boolean
}

function buildColMap(report: Report): Map<string, number> {
  const map = new Map<string, number>()
  report.columns?.forEach((column, index) => map.set(column.name?.toLowerCase() ?? '', index))
  return map
}

function extractStats(report: Report): LiveStats {
  const cells = report.totals?.cells
  if (!cells || cells.length === 0) return ZERO_STATS

  const map = buildColMap(report)
  const get = (name: string) => cellRaw(cells[map.get(name) ?? -1])

  const visits = get('entrances')
  const landerClicks = get('lander clicks')
  const offerClicks = get('offer clicks')
  const conversions = get('conversions')
  const revenue = get('revenue')
  const cost = get('cost')
  const roiCell = cells[map.get('roi') ?? -1]
  const roi = roiCell?.formatted ?? 'N/A'

  return { visits, clicks: landerClicks + offerClicks, conversions, revenue, cost, net: revenue - cost, roi }
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
      conversions: get('conversions'),
      revenue: get('revenue'),
      cost: get('cost'),
      roi: get('roi'),
    }
  })
}

function extractWidgetRows(report: Report): WidgetRow[] {
  const map = buildColMap(report)
  const visitsIndex = map.get('entrances') ?? 1

  return (report.rows ?? []).map((row, index) => {
    const cells = row.cells ?? []
    return {
      id: String(cells[0]?.raw ?? index),
      name: cells[0]?.formatted ?? '',
      visits: cellRaw(cells[visitsIndex]),
      visitsFormatted: cells[visitsIndex]?.formatted ?? '0',
    }
  })
}

function statsChanged(previous: LiveStats | undefined, next: LiveStats): boolean {
  if (!previous) return false
  return Object.keys(next).some((key) => previous[key as keyof LiveStats] !== next[key as keyof LiveStats])
}

const widgetColumnDefs: ColumnDef<WidgetRow, unknown>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    size: 250,
    meta: { flex: 1 },
    cell: (info) => <span className="font-medium">{String(info.getValue())}</span>,
  },
  {
    id: 'visits',
    header: 'Visits',
    accessorKey: 'visitsFormatted',
    size: 100,
    meta: { numeric: true },
  },
]

function WidgetTable({
  tableConfigKey,
  title,
  rows,
  isLoading,
  pulse,
}: {
  tableConfigKey: string
  title: string
  rows: WidgetRow[]
  isLoading: boolean
  pulse: boolean
}) {
  return (
    <Card
      className={cn('flex min-h-0 w-full min-w-0 flex-col', pulse && 'animate-pulse')}
      style={{ minHeight: WIDGET_CARD_MIN_HEIGHT_PX }}
      title={<span className="text-sm font-medium">{title}</span>}
      styles={{
        header: { padding: '16px 16px 8px', flexShrink: 0 },
        body: {
          padding: '0 16px 16px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        },
      }}
    >
      <DataTable
        className="min-h-0 flex-1"
        height="100%"
        data={rows}
        columns={widgetColumnDefs}
        loading={isLoading}
        getRowId={entityRowId}
        noPagination
        tableConfigKey={tableConfigKey}
      />
    </Card>
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
  const [pulseWidgets, setPulseWidgets] = useState(false)

  const [stats, setStats] = useState<LiveStats | undefined>(undefined)
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([])
  const [statsLoaded, setStatsLoaded] = useState(false)
  const [chartLoaded, setChartLoaded] = useState(false)
  const [widgets, setWidgets] = useState<WidgetState[]>(
    WIDGETS.map((widget) => ({
      title: widget.title,
      quickviewType: widget.quickviewType,
      rows: [],
      isLoading: true,
    })),
  )

  const previousStatsRef = useRef<LiveStats | undefined>(undefined)
  const pulseTimerRef = useRef<number | undefined>(undefined)
  const dateRangeRef = useRef(dateRange)
  const tzRef = useRef(tz)
  dateRangeRef.current = dateRange
  tzRef.current = tz

  const reloadKey = useMemo(
    () => `${dateRange.from.getTime()}-${dateRange.to.getTime()}-${tz}`,
    [dateRange.from, dateRange.to, tz],
  )

  const triggerPulse = useCallback((type: 'stats' | 'widgets') => {
    if (pulseTimerRef.current) {
      window.clearTimeout(pulseTimerRef.current)
    }
    if (type === 'stats') {
      setPulseStats(true)
      pulseTimerRef.current = window.setTimeout(() => setPulseStats(false), 900)
    } else {
      setPulseWidgets(true)
      pulseTimerRef.current = window.setTimeout(() => setPulseWidgets(false), 900)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current)
      }
    }
  }, [])

  /** Stable identity: reads latest range/tz from refs so effects/intervals don’t re-run when unrelated state updates. */
  const loadData = useCallback(() => {
    const { from, to } = dateRangeRef.current
    const timeRange = toApiDateTimeRange(from, to)
    const timeZone = { name: tzRef.current }

    setStatsLoaded(false)
    setChartLoaded(false)
    setWidgets((current) => current.map((widget) => ({ ...widget, isLoading: true })))

    api
      .post<Report>('/stats/reporting/drilldown/', {
        timeRange,
        timeZone,
        groupings: [{ groupBy: 'Time: Date', whitelistFilters: [], blacklistFilters: [] }],
        paging: { start: 0, length: 9999 },
        options: { viewType: 'flat' },
      })
      .then((report) => {
        const nextStats = extractStats(report)
        if (statsChanged(previousStatsRef.current, nextStats)) {
          triggerPulse('stats')
        }
        previousStatsRef.current = nextStats
        setStats(nextStats)
        setStatsLoaded(true)
        setChartPoints(extractChartData(report))
        setChartLoaded(true)
      })
      .catch(() => {
        setStats(ZERO_STATS)
        setStatsLoaded(true)
        setChartPoints([])
        setChartLoaded(true)
      })

    Promise.all(
      WIDGETS.map(async (widget) => {
        const report = await api.post<Report>('/stats/reporting/drilldown/', {
          timeRange,
          timeZone,
          groupings: [{ groupBy: widget.groupBy, whitelistFilters: [], blacklistFilters: [] }],
          paging: { start: 0, length: 5 },
          sorting: { column: 1, direction: 'desc' },
          options: { viewType: 'flat' },
        })

        return {
          title: widget.title,
          quickviewType: widget.quickviewType,
          rows: extractWidgetRows(report),
          isLoading: false,
        }
      }),
    )
      .then((nextWidgets) => {
        setWidgets(nextWidgets)
        triggerPulse('widgets')
      })
      .catch(() => {
        setWidgets(
          WIDGETS.map((widget) => ({
            title: widget.title,
            quickviewType: widget.quickviewType,
            rows: [],
            isLoading: false,
          })),
        )
      })
  }, [triggerPulse])

  useEffect(() => {
    loadData()
  }, [reloadKey, loadData])

  useEffect(() => {
    if (!isAutoRefresh) return

    const intervalId = window.setInterval(() => {
      loadData()
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [isAutoRefresh, loadData])

  return (
    <PageShell
      title="Dashboard"
      subtitle={isAutoRefresh ? undefined : undefined}
      actions={
        <div className="flex items-center gap-2">
          {isAutoRefresh && <Tag>Live</Tag>}
          <Button
            htmlType="button"
            type={isAutoRefresh ? 'primary' : 'default'}
            onClick={() => setIsAutoRefresh((current) => !current)}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isAutoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </Button>
          <DateRangePicker
            value={{ from: dateRange.from, to: dateRange.to, preset: 'last30' }}
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
      <div className={pulseStats ? 'animate-pulse' : undefined}>
        <StatsCards stats={stats} isLoading={!statsLoaded} />
      </div>

      <DashboardChart
        data={chartPoints}
        metric={chartMetric}
        onMetricChange={setChartMetric}
        isLoading={!chartLoaded}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {widgets.map((widget, index) => (
          <WidgetTable
            key={WIDGETS[index].id}
            tableConfigKey={WIDGETS[index].id}
            title={widget.title}
            rows={widget.rows}
            isLoading={widget.isLoading}
            pulse={pulseWidgets}
          />
        ))}
      </div>
    </PageShell>
  )
}
