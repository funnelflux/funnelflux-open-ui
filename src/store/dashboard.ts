import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DashboardState {
  chartMetric: string
  setChartMetric: (m: string) => void
  dashboardTablePageSize: number
  setDashboardTablePageSize: (n: number) => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      chartMetric: 'visits',
      setChartMetric: (chartMetric) => set({ chartMetric }),
      dashboardTablePageSize: 10,
      setDashboardTablePageSize: (dashboardTablePageSize) =>
        set({ dashboardTablePageSize }),
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
