import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DrilldownState {
  groupings: string[]
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
  timezone: string
  dateRange: { start: string; end: string } | null
  viewType: 'tree' | 'flat'
  setGroupings: (g: string[]) => void
  /** Replace groupings and filters together (e.g. after removing a middle level and reindexing filters). */
  replaceGroupingsStack: (
    groupings: string[],
    groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>,
  ) => void
  setGroupingFilter: (
    level: number,
    type: 'whitelist' | 'blacklist',
    values: string[],
  ) => void
  setGroupingFilters: (filters: Record<number, { whitelist: string[]; blacklist: string[] }>) => void
  setTimezone: (tz: string) => void
  setDateRange: (range: { start: string; end: string }) => void
  setViewType: (vt: 'tree' | 'flat') => void
}

export const useDrilldownStore = create<DrilldownState>()(
  persist(
    (set) => ({
      groupings: ['Element: Campaign'],
      groupingFilters: {},
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateRange: null,
      viewType: 'tree',
      setGroupings: (groupings) => set({ groupings }),
      replaceGroupingsStack: (groupings, groupingFilters) => set({ groupings, groupingFilters }),
      setGroupingFilter: (level, type, values) =>
        set((state) => ({
          groupingFilters: {
            ...state.groupingFilters,
            [level]: {
              whitelist: state.groupingFilters[level]?.whitelist ?? [],
              blacklist: state.groupingFilters[level]?.blacklist ?? [],
              [type]: values,
            },
          },
        })),
      setGroupingFilters: (groupingFilters) => set({ groupingFilters }),
      setTimezone: (timezone) => set({ timezone }),
      setDateRange: (dateRange) => set({ dateRange }),
      setViewType: (viewType) => set({ viewType }),
    }),
    { name: 'ff-drilldown' },
  ),
)
