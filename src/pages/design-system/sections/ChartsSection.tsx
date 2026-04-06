import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CHART_COLORS, CHART_TOOLTIP_STYLE, CHART_GRID_STYLE, CHART_AXIS_STYLE } from '@/lib/chart-theme'
import { useThemeStore } from '@/store/theme'

const lineData = [
  { day: 'Mon', visits: 4200, clicks: 2800, conversions: 140 },
  { day: 'Tue', visits: 5100, clicks: 3400, conversions: 170 },
  { day: 'Wed', visits: 4800, clicks: 3100, conversions: 155 },
  { day: 'Thu', visits: 6200, clicks: 4100, conversions: 205 },
  { day: 'Fri', visits: 5800, clicks: 3800, conversions: 190 },
  { day: 'Sat', visits: 3200, clicks: 2100, conversions: 105 },
  { day: 'Sun', visits: 2800, clicks: 1800, conversions: 90 },
]

const barData = [
  { source: 'Facebook', revenue: 4900, cost: 2100 },
  { source: 'Google', revenue: 3260, cost: 3800 },
  { source: 'TikTok', revenue: 9120, cost: 5400 },
  { source: 'Native', revenue: 1520, cost: 1800 },
]

const pieData = [
  { name: 'Facebook', value: 35 },
  { name: 'Google', value: 28 },
  { name: 'TikTok', value: 22 },
  { name: 'Native', value: 15 },
]

export function ChartsSection() {
  const mode = useThemeStore((s) => s.mode)
  const tooltipStyle = CHART_TOOLTIP_STYLE[mode]
  const gridStyle = CHART_GRID_STYLE[mode]
  const axisStyle = CHART_AXIS_STYLE[mode]

  return (
    <section id="charts">
      <h2 className="text-xl font-semibold text-foreground mb-6">Charts (Recharts)</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Import chart theme: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'import { CHART_COLORS } from "@/lib/chart-theme"'}</code>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Line Chart */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Line Chart</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="day" {...axisStyle} />
              <YAxis {...axisStyle} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="visits" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clicks" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="conversions" stroke={CHART_COLORS[4]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Bar Chart</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="source" {...axisStyle} />
              <YAxis {...axisStyle} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Bar dataKey="revenue" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Area Chart */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Area Chart</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={lineData}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="day" {...axisStyle} />
              <YAxis {...axisStyle} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="visits" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Pie Chart</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
