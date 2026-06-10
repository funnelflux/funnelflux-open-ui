import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createDefaultDashboardDateRange } from '@/lib/statsDateRange'

const defaultTimezone = typeof Intl !== 'undefined'
  ? Intl.DateTimeFormat().resolvedOptions().timeZone
  : 'UTC'

interface DashboardState {
  chartMetric: string
  setChartMetric: (m: string) => void
  dashboardTablePageSize: number
  setDashboardTablePageSize: (n: number) => void
  timezone: string
  dateRange: { from: Date; to: Date }
  setTimezone: (timezone: string) => void
  setDateRange: (dateRange: { from: Date; to: Date }) => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      chartMetric: 'visits',
      setChartMetric: (chartMetric) => set({ chartMetric }),
      dashboardTablePageSize: 5,
      setDashboardTablePageSize: (dashboardTablePageSize) =>
        set({ dashboardTablePageSize }),
      timezone: defaultTimezone,
      dateRange: createDefaultDashboardDateRange(defaultTimezone),
      setTimezone: (timezone) => set({ timezone }),
      setDateRange: (dateRange) => set({ dateRange }),
    }),
    {
      name: 'ff-dashboard-settings',
      partialize: (state) => ({
        chartMetric: state.chartMetric,
        dashboardTablePageSize: state.dashboardTablePageSize,
      }),
    },
  ),
)
