import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DashboardState {
  chartMetric: string
  setChartMetric: (m: string) => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      chartMetric: 'visits',
      setChartMetric: (chartMetric) => set({ chartMetric }),
    }),
    { name: 'ff-dashboard' },
  ),
)
