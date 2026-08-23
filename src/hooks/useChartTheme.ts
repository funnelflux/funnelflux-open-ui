import { useThemeStore } from '@/store/theme'
import { CHART_THEME_FALLBACK } from '@/lib/chart-theme'

/** Return chart colors and styles for the currently selected application theme. */
export function useChartTheme() {
  const mode = useThemeStore((state) => state.mode)
  return CHART_THEME_FALLBACK[mode]
}
