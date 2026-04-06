import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Button, Card, Skeleton } from 'antd'

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
}

const METRICS = [
  { key: 'visits', label: 'Visits' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'cost', label: 'Cost' },
  { key: 'roi', label: 'ROI' },
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

export function DashboardChart({
  data,
  metric,
  onMetricChange,
  isLoading,
}: DashboardChartProps) {
  return (
    <Card
      title={
        <div className="flex flex-wrap items-center gap-1">
          {METRICS.map(({ key, label }) => (
            <Button
              key={key}
              type={metric === key ? 'primary' : 'text'}
              size="small"
              className="h-7 text-xs"
              onClick={() => onMetricChange(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      }
      styles={{ header: { padding: '16px 16px 8px' }, body: { padding: '0 16px 16px' } }}
    >
        {isLoading ? (
          <Skeleton.Node active style={{ width: '100%', height: 300 }}>
            <div style={{ width: '100%', height: 300 }} />
          </Skeleton.Node>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            No data for the selected period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number) => [
                  formatTooltipValue(value, metric),
                  METRICS.find((m) => m.key === metric)?.label ?? metric,
                ]) as any}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--background))',
                }}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
    </Card>
  )
}
