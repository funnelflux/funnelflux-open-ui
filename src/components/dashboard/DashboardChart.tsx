import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Button, Card, Skeleton } from '@/components/ui-kit'
import {
  CHART_COLORS,
  CHART_GRID_STYLE,
  CHART_AXIS_STYLE,
  CHART_TOOLTIP_STYLE,
  DASHBOARD_METRIC_STROKE,
  PROFIT_COLOR,
  LOSS_COLOR,
} from '@/lib/chart-theme'
import { useThemeStore } from '@/store/theme'
import { cn } from '@/lib/utils'

interface ChartPoint {
  date: string
  visits: number
  clicks: number
  conversions: number
  revenue: number
  cost: number
  roi: number
}

interface DashboardChartProps {
  data: ChartPoint[]
  metric: string
  onMetricChange: (metric: string) => void
  isLoading: boolean
  /** Plot area height in px (default 260). */
  chartHeight?: number
  className?: string
}

const METRICS = [
  { key: 'visits', label: 'Visits', shortLabel: 'Visits' },
  { key: 'clicks', label: 'Clicks', shortLabel: 'Clicks' },
  { key: 'conversions', label: 'Conversions', shortLabel: 'Conv.' },
  { key: 'revenue', label: 'Revenue', shortLabel: 'Rev.' },
  { key: 'cost', label: 'Cost', shortLabel: 'Cost' },
  { key: 'roi', label: 'ROI', shortLabel: 'ROI' },
] as const

function formatTooltipValue(value: number, metric: string): string {
  if (metric === 'revenue' || metric === 'cost') {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (metric === 'roi') {
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  }
  return value.toLocaleString()
}

/** Recharts Tooltip passes `number | string | array` depending on series; normalize for our numeric metrics. */
function tooltipNumericValue(
  value: number | string | ReadonlyArray<number | string> | undefined,
): number {
  if (value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value) || 0
  const first = value[0]
  if (typeof first === 'number') return first
  return Number(first) || 0
}

export function DashboardChart({
  data,
  metric,
  onMetricChange,
  isLoading,
  chartHeight = 260,
  className,
}: DashboardChartProps) {
  const mode = useThemeStore((s) => s.mode)
  const tooltipStyle = CHART_TOOLTIP_STYLE[mode]
  const gridStyle = CHART_GRID_STYLE[mode]
  const axisStyle = CHART_AXIS_STYLE[mode]

  const lastRoi = data.length > 0 ? data[data.length - 1]!.roi : 0
  const roiStroke = lastRoi >= 0 ? PROFIT_COLOR : LOSS_COLOR

  const lineStroke = metric === 'roi'
    ? roiStroke
    : (DASHBOARD_METRIC_STROKE[metric] ?? CHART_COLORS[0])

  return (
    <Card
      className={cn('ff-analytics-panel border-border-strong bg-surface-secondary shadow-none', className)}
      title={
        <div className="grid w-full min-w-0 grid-cols-6 gap-1">
          {METRICS.map(({ key, label, shortLabel }) => (
            <Button
              key={key}
              type={metric === key ? 'primary' : 'text'}
              size="small"
              className="h-7 min-w-0 px-1 text-[10px] sm:px-2 sm:text-xs"
              onClick={() => onMetricChange(key)}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </Button>
          ))}
        </div>
      }
      styles={{
        header: {
          padding: '12px 12px 8px',
          background: 'var(--surface-sunken)',
          borderBottom: '1px solid var(--border-strong)',
        },
        body: { padding: '12px 8px 12px', background: 'transparent' },
      }}
    >
        {isLoading ? (
          <Skeleton.Node active style={{ width: '100%', height: chartHeight }}>
            <div style={{ width: '100%', height: chartHeight }} />
          </Skeleton.Node>
        ) : data.length === 0 ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height: chartHeight }}
          >
            No data for the selected period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: -8 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} {...axisStyle} />
              <YAxis tick={{ fontSize: 11 }} {...axisStyle} width={48} />
              <Tooltip
                formatter={(value) => [
                  formatTooltipValue(tooltipNumericValue(value), metric),
                  METRICS.find((m) => m.key === metric)?.label ?? metric,
                ]}
                {...tooltipStyle}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke={lineStroke}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={data.length < 200}
                animationDuration={220}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
    </Card>
  )
}
