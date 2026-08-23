/**
 * Recharts theme constants.
 *
 * The palette is kept in one place so charts rendered by Recharts and tokens
 * consumed by Ant Design cannot drift apart. useChartTheme provides the
 * mode-aware values while the static exports remain available for non-React
 * consumers.
 */

/** FunnelFlux chart palette, in the same order as --ff-chart-1 through --ff-chart-10. */
export const CHART_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#06B6D4',
  '#F97316',
  '#22C55E',
  '#EC4899',
  '#EAB308',
  '#6366F1',
  '#14B8A6',
  '#F43F5E',
] as const

/** Default series colors for dashboard chart metric toggles. */
export const DASHBOARD_METRIC_STROKE: Readonly<Record<string, string>> = {
  visits: CHART_COLORS[0],
  clicks: CHART_COLORS[3],
  conversions: CHART_COLORS[1],
  revenue: CHART_COLORS[4],
  cost: CHART_COLORS[5],
  roi: '#64748B',
}

/** Brighter series colors retain contrast against dark chart surfaces. */
export const DASHBOARD_METRIC_STROKE_DARK: Readonly<Record<string, string>> = {
  visits: '#60A5FA',
  clicks: '#FB923C',
  // Keep conversions aligned with --ff-chart-2 in both modes.
  conversions: CHART_COLORS[1],
  revenue: '#4ADE80',
  cost: '#F472B6',
  roi: '#CBD5E1',
}

export const PROFIT_COLOR = '#16A34A'
export const LOSS_COLOR = '#DC2626'

export const PROFIT_COLOR_DARK = '#4ADE80'
export const LOSS_COLOR_DARK = '#F87171'

export const CHART_TOOLTIP_STYLE = {
  light: {
    contentStyle: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      color: '#0F172A',
      border: '1px solid #E2E8F0',
      borderRadius: 6,
      fontSize: 13,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    },
    labelStyle: { color: '#0F172A', fontWeight: 500, marginBottom: 4 },
    itemStyle: { color: '#475569', fontSize: 13 },
  },
  dark: {
    contentStyle: {
      backgroundColor: '#1E293B',
      borderColor: '#334155',
      color: '#F8FAFC',
      border: '1px solid #334155',
      borderRadius: 6,
      fontSize: 13,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
    },
    labelStyle: { color: '#F8FAFC', fontWeight: 500, marginBottom: 4 },
    itemStyle: { color: '#94A3B8', fontSize: 13 },
  },
} as const

export const CHART_GRID_STYLE = {
  light: { stroke: '#E2E8F0', strokeDasharray: '3 3' },
  dark: { stroke: '#334155', strokeDasharray: '3 3' },
} as const

export const CHART_AXIS_STYLE = {
  light: { stroke: '#94A3B8', fontSize: 12, tickLine: false },
  dark: { stroke: '#64748B', fontSize: 12, tickLine: false },
} as const

/** Static theme snapshots for non-React contexts. */
export const CHART_THEME_FALLBACK = {
  light: {
    mode: 'light' as const,
    isDark: false as const,
    colors: CHART_COLORS,
    stroke: DASHBOARD_METRIC_STROKE,
    tooltip: CHART_TOOLTIP_STYLE.light,
    grid: CHART_GRID_STYLE.light,
    axis: CHART_AXIS_STYLE.light,
    profitColor: PROFIT_COLOR,
    lossColor: LOSS_COLOR,
  },
  dark: {
    mode: 'dark' as const,
    isDark: true as const,
    colors: CHART_COLORS,
    stroke: DASHBOARD_METRIC_STROKE_DARK,
    tooltip: CHART_TOOLTIP_STYLE.dark,
    grid: CHART_GRID_STYLE.dark,
    axis: CHART_AXIS_STYLE.dark,
    profitColor: PROFIT_COLOR_DARK,
    lossColor: LOSS_COLOR_DARK,
  },
} as const
