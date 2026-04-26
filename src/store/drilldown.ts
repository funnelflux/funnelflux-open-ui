import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UrlTrackingFieldLevelMeta } from '@/lib/urlTrackingFieldGrouping'

interface DrilldownState {
  groupings: string[]
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
  /** Per-level URL param metadata when grouping uses `__TRACKING_FIELD_N__`. */
  urlTrackingFieldByLevel: Record<number, UrlTrackingFieldLevelMeta>
  timezone: string
  dateRange: { start: string; end: string } | null
  viewType: 'tree' | 'flat'
  setGroupings: (g: string[]) => void
  /** Replace groupings and filters together (e.g. after removing a middle level and reindexing filters). */
  replaceGroupingsStack: (
    groupings: string[],
    groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>,
    urlTrackingFieldByLevel?: Record<number, UrlTrackingFieldLevelMeta>,
  ) => void
  setGroupingFilter: (
    level: number,
    type: 'whitelist' | 'blacklist',
    values: string[],
  ) => void
  setGroupingFilters: (filters: Record<number, { whitelist: string[]; blacklist: string[] }>) => void
  setUrlTrackingFieldLevel: (level: number, meta: UrlTrackingFieldLevelMeta | null) => void
  setUrlTrackingFieldByLevel: (next: Record<number, UrlTrackingFieldLevelMeta>) => void
  setTimezone: (tz: string) => void
  setDateRange: (range: { start: string; end: string }) => void
  setViewType: (vt: 'tree' | 'flat') => void
}

export const useDrilldownStore = create<DrilldownState>()(
  persist(
    (set) => ({
      groupings: ['Element: Campaign'],
      groupingFilters: {},
      urlTrackingFieldByLevel: {},
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateRange: null,
      viewType: 'tree',
      setGroupings: (groupings) => set({ groupings }),
      replaceGroupingsStack: (groupings, groupingFilters, urlTrackingFieldByLevel) =>
        set((state) => ({
          groupings,
          groupingFilters,
          urlTrackingFieldByLevel:
            urlTrackingFieldByLevel !== undefined ? urlTrackingFieldByLevel : state.urlTrackingFieldByLevel,
        })),
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
      setUrlTrackingFieldLevel: (level, meta) =>
        set((state) => {
          const next = { ...state.urlTrackingFieldByLevel }
          if (meta == null) {
            delete next[level]
          } else {
            next[level] = meta
          }
          return { urlTrackingFieldByLevel: next }
        }),
      setUrlTrackingFieldByLevel: (urlTrackingFieldByLevel) => set({ urlTrackingFieldByLevel }),
      setTimezone: (timezone) => set({ timezone }),
      setDateRange: (dateRange) => set({ dateRange }),
      setViewType: (viewType) => set({ viewType }),
    }),
    {
      name: 'ff-drilldown',
      merge: (persisted, current) => {
        const p = persisted as Partial<DrilldownState> | undefined
        return {
          ...current,
          ...p,
          urlTrackingFieldByLevel: p?.urlTrackingFieldByLevel ?? current.urlTrackingFieldByLevel,
        }
      },
    },
  ),
)
