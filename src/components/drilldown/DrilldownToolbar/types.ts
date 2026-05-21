import type { FormEvent } from 'react'
import type { useSavedViews } from '@/api/hooks'
import type { DrilldownTimeAttribution } from '@/store/drilldown'
import type { DrilldownRequest } from '@/types/stats'

export const TIME_ATTRIBUTION_OPTIONS = [
  { label: 'Entrance time', value: 'entrance' },
  { label: 'Event time', value: 'event' },
] as const

export type DrilldownExportRequest = DrilldownRequest & {
  timeStart: number
  timeEnd: number
}

export interface DrilldownToolbarProps {
  onApply: (request: DrilldownRequest) => void
  isLoading: boolean
  viewType: 'tree' | 'flat'
  paging?: { start: number; length: number }
}

export interface DrilldownToolbarContextValue {
  dateTimeRangeValue: [Date, Date]
  onDateTimeRangeChange: (dates: [Date, Date] | null) => void
  timezone: string
  setTimezone: (tz: string) => void
  selectedViewId: string
  handleSelectView: (idView: string) => void
  savedViews: ReturnType<typeof useSavedViews>['data']
  openSaveNewViewModal: () => void
  saveModalOpen: boolean
  setSaveModalOpen: (open: boolean) => void
  saveViewFormId: string
  saveViewName: string
  setSaveViewName: (name: string) => void
  handleSaveViewSubmit: (e: FormEvent) => Promise<void>
  saveViewPending: boolean
  handleApply: () => void
  handleExport: () => Promise<void>
  isLoading: boolean
  isExporting: boolean
  groupings: string[]
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
  availableGroupings: string[] | undefined
  setGroupings: (g: string[]) => void
  setGroupingFilter: (
    level: number,
    type: 'whitelist' | 'blacklist',
    values: string[],
  ) => void
  settingsDrawerOpen: boolean
  openSettingsDrawer: () => void
  closeSettingsDrawer: () => void
  filtersDrawerOpen: boolean
  openFiltersDrawer: () => void
  closeFiltersDrawer: () => void
  timeAttribution: DrilldownTimeAttribution
  setTimeAttribution: (timeAttribution: DrilldownTimeAttribution) => void
  showFilteredTraffic: boolean
  setShowFilteredTraffic: (showFilteredTraffic: boolean) => void
  showWinners: boolean
  setShowWinners: (showWinners: boolean) => void
}
