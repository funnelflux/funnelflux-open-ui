import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { subDays } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useDashboardStore } from '@/store/dashboard'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { DashboardChart } from '@/components/dashboard/DashboardChart'
import { DataTable } from '@/components/shared/DataTable'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { TimezoneSelect } from '@/components/ui-kit'
import { Button, Card, Tag } from 'antd'
import { toApiDateTimeRange } from '@/types/stats'
import type { ColumnDef } from '@tanstack/react-table'
import type { Report, ReportCell } from '@/types/stats'
import type { LiveStats } from '@/types/ui'

const ZERO_STATS: LiveStats = { visits: 0, clicks: 0, conversions: 0, revenue: 0, cost: 0, net: 0, roi: 'N/A' }

const WIDGETS = [
  { title: 'Top Funnels', groupBy: 'Element: Funnel', quickviewType: 'Element: Funnel' },
  { title: 'Top Traffic Sources', groupBy: 'Third Parties: Traffic Source', quickviewType: 'Third Parties: Traffic Source' },
  { title: 'Top Landers', groupBy: 'Element: Lander', quickviewType: 'Element: Lander' },
  { title: 'Top Offers', groupBy: 'Element: Offer', quickviewType: 'Element: Offer' },
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

function cellRaw(cell: ReportCell | undefined): number {
  if (!cell) return 0
  return typeof cell.raw === 'number' ? cell.raw : Number(cell.raw) || 0
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

function WidgetTable({
  title,
  rows,
  isLoading,
  onRowClick,
  pulse,
}: {
  title: string
  rows: WidgetRow[]
  isLoading: boolean
  onRowClick: (row: WidgetRow) => void
  pulse: boolean
}) {
  const columns = useMemo<ColumnDef<WidgetRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-left hover:text-primary"
            onClick={() => onRowClick(row.original)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        id: 'visits',
        header: 'Visits',
        accessorFn: (row) => row.visits,
        cell: ({ row }) => <span className="tabular-nums">{row.original.visitsFormatted}</span>,
      },
    ],
    [onRowClick],
  )

  return (
    <Card className={pulse ? 'animate-pulse' : undefined} title={<span className="text-sm font-medium">{title}</span>} styles={{ header: { padding: '16px 16px 8px' }, body: { padding: '0 16px 16px' } }}>
      <DataTable columns={columns} data={rows} isLoading={isLoading} getRowId={(row) => row.id} />
    </Card>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
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

  // Cleanup pulse timers on unmount
  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current)
      }
    }
  }, [])

  const loadData = useCallback(() => {
    const timeRange = toApiDateTimeRange(dateRange.from, dateRange.to)
    const timeZone = { name: tz }

    setStatsLoaded(false)
    setChartLoaded(false)
    setWidgets((current) => current.map((widget) => ({ ...widget, isLoading: true })))

    // Stats request
    api.post<Report>('/stats/reporting/drilldown/', {
      timeRange,
      timeZone,
      groupings: [{ groupBy: 'Element: Campaign', whitelistFilters: [], blacklistFilters: [] }],
      paging: { start: 0, length: 1 },
    }).then((report) => {
      const nextStats = extractStats(report)
      if (statsChanged(previousStatsRef.current, nextStats)) {
        triggerPulse('stats')
      }
      previousStatsRef.current = nextStats
      setStats(nextStats)
      setStatsLoaded(true)
    }).catch(() => {
      setStats(ZERO_STATS)
      setStatsLoaded(true)
    })

    // Chart request
    api.post<Report>('/stats/reporting/drilldown/', {
      timeRange,
      timeZone,
      groupings: [{ groupBy: 'Time: Date', whitelistFilters: [], blacklistFilters: [] }],
      paging: { start: 0, length: 9999 },
      options: { viewType: 'flat' },
    }).then((report) => {
      setChartPoints(extractChartData(report))
      setChartLoaded(true)
    }).catch(() => {
      setChartPoints([])
      setChartLoaded(true)
    })

    // Widget requests
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
  }, [dateRange.from, dateRange.to, triggerPulse, tz])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!isAutoRefresh) return

    const intervalId = window.setInterval(() => {
      loadData()
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [isAutoRefresh, loadData])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          {isAutoRefresh ? <Tag>Live</Tag> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            htmlType="button"
            type={isAutoRefresh ? 'primary' : 'default'}
            size="small"
            className="h-9"
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
      </div>

      <div className={pulseStats ? 'animate-pulse' : undefined}>
        <StatsCards stats={stats} isLoading={!statsLoaded} />
      </div>

      <DashboardChart
        data={chartPoints}
        metric={chartMetric}
        onMetricChange={setChartMetric}
        isLoading={!chartLoaded}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {widgets.map((widget) => (
          <WidgetTable
            key={widget.title}
            title={widget.title}
            rows={widget.rows}
            isLoading={widget.isLoading}
            pulse={pulseWidgets}
            onRowClick={(row) =>
              navigate(
                `/quickview?groupBy=${encodeURIComponent(widget.quickviewType)}&id=${encodeURIComponent(row.id)}`,
              )
            }
          />
        ))}
      </div>
    </div>
  )
}
