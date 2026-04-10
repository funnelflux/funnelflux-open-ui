/**
 * Recharts theme constants.
 * Uses the FunnelFlux design token palette for consistent chart styling.
 * For dark mode, components read the current theme from useThemeStore.
 */

export const CHART_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#F97316', '#22C55E',
  '#EC4899', '#EAB308', '#6366F1', '#14B8A6', '#F43F5E',
] as const

export const PROFIT_COLOR = '#16A34A'
export const LOSS_COLOR = '#DC2626'

export const CHART_TOOLTIP_STYLE = {
  light: {
    contentStyle: {
      backgroundColor: '#FFFFFF',
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
