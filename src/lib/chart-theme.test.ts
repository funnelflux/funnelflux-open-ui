import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { CHART_COLORS, CHART_THEME_FALLBACK } from '@/lib/chart-theme'
import { useChartTheme } from '@/hooks/useChartTheme'
import { CHART_COLORS as ANTD_CHART_COLORS } from '@/lib/antd-theme'
import { useThemeStore } from '@/store/theme'

describe('chart theme', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'light' })
  })

  it('uses one chart palette across Recharts and Ant Design', () => {
    expect(ANTD_CHART_COLORS).toBe(CHART_COLORS)
    expect(CHART_COLORS[1]).toBe('#8B5CF6')
    expect(CHART_THEME_FALLBACK.light.stroke.conversions).toBe('#8B5CF6')
  })

  it('returns light chart styles by default', () => {
    const { result } = renderHook(() => useChartTheme())

    expect(result.current.isDark).toBe(false)
    expect(result.current.tooltip.contentStyle).toMatchObject({
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      color: '#0F172A',
    })
    expect(result.current.profitColor).toBe('#16A34A')
    expect(result.current.lossColor).toBe('#DC2626')
  })

  it('returns dark surface-safe chart styles when the theme changes', () => {
    useThemeStore.setState({ mode: 'dark' })
    const { result } = renderHook(() => useChartTheme())

    expect(result.current.isDark).toBe(true)
    expect(result.current.stroke.visits).toBe('#60A5FA')
    expect(result.current.stroke.conversions).toBe('#8B5CF6')
    expect(result.current.tooltip.contentStyle).toMatchObject({
      backgroundColor: '#1E293B',
      borderColor: '#334155',
      color: '#F8FAFC',
    })
    expect(result.current.profitColor).toBe('#4ADE80')
    expect(result.current.lossColor).toBe('#F87171')
  })
})
