import { create } from 'zustand'
import { createDefaultEntityTableDateRange } from '@/lib/statsDateRange'

interface EntityTableFiltersState {
  timezone: string
  dateRange: { from: Date; to: Date }
  setTimezone: (timezone: string) => void
  setDateRange: (dateRange: { from: Date; to: Date }) => void
}

export const useEntityTableFiltersStore = create<EntityTableFiltersState>((set) => ({
  timezone: 'UTC',
  dateRange: createDefaultEntityTableDateRange('UTC'),
  setTimezone: (timezone) => set({ timezone }),
  setDateRange: (dateRange) => set({ dateRange }),
}))
