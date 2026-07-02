import { useCallback, useId, useMemo, useState, type FormEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useToastApi } from '@/components/ui-kit'
import { useGroupings, useSavedViews, useSaveView } from '@/api/hooks'
import { getErrorMessage } from '@/lib/utils'
import { getPresetRange, type DateRange } from '@/lib/date-presets'
import { validateGroupingStackForRequest } from '@/lib/drilldownGroupings'
import { buildTrackingFieldMappingsForRequest } from '@/lib/urlTrackingFieldGrouping'
import { resolveReportingTimezone } from '@/lib/reportingTimezone'
import { toApiDateTimeForReportingZone } from '@/lib/statsDateRange'
import { useDrilldownStore } from '@/store/drilldown'
import type { DrilldownRequest } from '@/types/stats'
import {
  buildDrilldownExportRequest,
  downloadDrilldownCsv,
} from '@/components/drilldown/DrilldownToolbar/exportCsv'
import type {
  DrilldownToolbarContextValue,
  DrilldownToolbarProps,
} from '@/components/drilldown/DrilldownToolbar/types'

function useDatePickerState(timezone: string) {
  // Per-field selectors: a selectorless subscription would re-render on every store write.
  const dateRange = useDrilldownStore((s) => s.dateRange)
  const setDateRange = useDrilldownStore((s) => s.setDateRange)

  const value = useMemo((): DateRange & { preset: string | null } => {
    if (dateRange?.start && dateRange?.end) {
      return {
        from: new Date(dateRange.start),
        to: new Date(dateRange.end),
        preset: null,
      }
    }
    return { ...getPresetRange('today', timezone), preset: 'today' }
  }, [dateRange, timezone])

  const handleChange = useCallback(
    (range: DateRange & { preset: string | null }) => {
      setDateRange({
        start: range.from.toISOString(),
        end: range.to.toISOString(),
      })
    },
    [setDateRange],
  )

  return [value, handleChange] as const
}

export function useDrilldownToolbarState(props: DrilldownToolbarProps): DrilldownToolbarContextValue {
  const { onApply, isLoading, viewType, paging } = props
  const toast = useToastApi()
  // Subscribe only to the fields the toolbar uses (shallow-compared): a selectorless
  // subscription would re-render every toolbar consumer on any store write.
  const {
    groupings,
    groupingFilters,
    timezone,
    dateRange,
    setGroupings,
    setGroupingFilter,
    setGroupingFilters,
    replaceGroupingsStack,
    setTimezone,
    setDateRange,
    urlTrackingFieldByLevel,
    timeAttribution,
    showFilteredTraffic,
    showWinners,
    filtersEnabled,
    setTimeAttribution,
    setShowFilteredTraffic,
    setShowWinners,
  } = useDrilldownStore(
    useShallow((s) => ({
      groupings: s.groupings,
      groupingFilters: s.groupingFilters,
      timezone: s.timezone,
      dateRange: s.dateRange,
      setGroupings: s.setGroupings,
      setGroupingFilter: s.setGroupingFilter,
      setGroupingFilters: s.setGroupingFilters,
      replaceGroupingsStack: s.replaceGroupingsStack,
      setTimezone: s.setTimezone,
      setDateRange: s.setDateRange,
      urlTrackingFieldByLevel: s.urlTrackingFieldByLevel,
      timeAttribution: s.timeAttribution,
      showFilteredTraffic: s.showFilteredTraffic,
      showWinners: s.showWinners,
      filtersEnabled: s.filtersEnabled,
      setTimeAttribution: s.setTimeAttribution,
      setShowFilteredTraffic: s.setShowFilteredTraffic,
      setShowWinners: s.setShowWinners,
    })),
  )

  const { data: availableGroupings } = useGroupings()
  const { data: savedViews } = useSavedViews()
  const saveView = useSaveView()
  const [datePickerValue, setDatePickerValue] = useDatePickerState(timezone)
  const [selectedViewId, setSelectedViewId] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveViewName, setSaveViewName] = useState('')
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)
  const saveViewFormId = useId()

  const openSettingsDrawer = useCallback(() => {
    setSettingsDrawerOpen(true)
  }, [])

  const closeSettingsDrawer = useCallback(() => {
    setSettingsDrawerOpen(false)
  }, [])

  const openFiltersDrawer = useCallback(() => {
    setFiltersDrawerOpen(true)
  }, [])

  const closeFiltersDrawer = useCallback(() => {
    setFiltersDrawerOpen(false)
  }, [])

  const dateTimeRangeValue = useMemo(
    (): [Date, Date] => [datePickerValue.from, datePickerValue.to],
    [datePickerValue.from, datePickerValue.to],
  )

  const onDateTimeRangeChange = useCallback(
    (dates: [Date, Date] | null) => {
      if (dates?.[0] && dates?.[1]) {
        setDatePickerValue({
          from: dates[0],
          to: dates[1],
          preset: null,
        })
      }
    },
    [setDatePickerValue],
  )

  const toDrilldownRequest = useCallback(
    (
      levels: Array<{
        groupBy: string
        whitelistFilters: string[]
        blacklistFilters: string[]
      }>,
    ): DrilldownRequest => {
      const rangeFrom =
        dateRange?.start && dateRange?.end ? new Date(dateRange.start) : datePickerValue.from
      const rangeTo =
        dateRange?.start && dateRange?.end ? new Date(dateRange.end) : datePickerValue.to
      const reportingTimezone = resolveReportingTimezone(timezone)
      const mappings = buildTrackingFieldMappingsForRequest(groupings, urlTrackingFieldByLevel)
      const requestOptions = {
        viewType,
        showFilteredTraffic,
        computeCTRConfidenceRate: showWinners,
        computeCVRConfidenceRate: showWinners,
        computeEPVConfidenceRate: showWinners,
        timeAttribution,
      }
      const base: DrilldownRequest = {
        timeRange: {
          start: toApiDateTimeForReportingZone(rangeFrom, reportingTimezone),
          end: toApiDateTimeForReportingZone(rangeTo, reportingTimezone),
        },
        timeZone: { name: reportingTimezone },
        groupings: levels.map((level) => ({
          groupBy: level.groupBy,
          whitelistFilters: level.whitelistFilters,
          blacklistFilters: level.blacklistFilters,
        })),
        options: requestOptions,
        paging: paging ?? { start: 0, length: 100 },
      }
      if (Object.keys(mappings).length > 0) {
        base.trackingFieldMappings = mappings
      }
      return base
    },
    [
      dateRange?.end,
      dateRange?.start,
      datePickerValue.from,
      datePickerValue.to,
      groupings,
      paging,
      showFilteredTraffic,
      showWinners,
      timeAttribution,
      timezone,
      urlTrackingFieldByLevel,
      viewType,
    ],
  )

  const handleApply = useCallback(() => {
    const groupingValidation = validateGroupingStackForRequest(
      groupings,
      groupingFilters,
      urlTrackingFieldByLevel,
      filtersEnabled,
    )
    if (!groupingValidation.ok) {
      toast.error(groupingValidation.message)
      return
    }
    onApply(toDrilldownRequest(groupingValidation.levels))
  }, [filtersEnabled, groupingFilters, groupings, onApply, toast, toDrilldownRequest, urlTrackingFieldByLevel])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const groupingValidation = validateGroupingStackForRequest(
        groupings,
        groupingFilters,
        urlTrackingFieldByLevel,
        filtersEnabled,
      )
      if (!groupingValidation.ok) {
        toast.error(groupingValidation.message)
        return
      }
      const request = toDrilldownRequest(groupingValidation.levels)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `drilldown-export-${timestamp}.csv`
      const exportRequest = buildDrilldownExportRequest(
        request,
        datePickerValue.from,
        datePickerValue.to,
      )
      await downloadDrilldownCsv(exportRequest, filename)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsExporting(false)
    }
  }, [
    datePickerValue.from,
    datePickerValue.to,
    filtersEnabled,
    groupingFilters,
    groupings,
    toast,
    toDrilldownRequest,
    urlTrackingFieldByLevel,
  ])

  const handleSelectView = useCallback(
    (idView: string) => {
      setSelectedViewId(idView)
      const view = savedViews?.find((entry) => entry.idView === idView)
      if (!view) {
        return
      }

      if (view.groupings.length > 0) {
        replaceGroupingsStack(view.groupings, view.groupingFilters ?? {}, view.urlTrackingFieldByLevel ?? {})
      } else {
        setGroupingFilters(view.groupingFilters ?? {})
        useDrilldownStore.getState().setUrlTrackingFieldByLevel({})
      }
      if (view.timezone) {
        setTimezone(view.timezone)
      }
      if (view.dateRange?.start && view.dateRange?.end) {
        setDateRange(view.dateRange)
      }
    },
    [savedViews, setDateRange, setGroupingFilters, replaceGroupingsStack, setTimezone],
  )

  const openSaveNewViewModal = useCallback(() => {
    setSaveViewName('')
    setSaveModalOpen(true)
  }, [])

  const handleSaveViewSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const name = saveViewName.trim()
      if (!name) {
        return
      }

      try {
        await saveView.mutateAsync({
          name,
          groupings,
          timezone,
          dateRange,
          groupingFilters,
          urlTrackingFieldByLevel,
        })
        toast.success('View saved')
        setSaveModalOpen(false)
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [dateRange, groupingFilters, groupings, saveView, saveViewName, timezone, toast, urlTrackingFieldByLevel],
  )

  // Memoized so the context provider value keeps a stable identity between renders — a fresh
  // object literal here would re-render every toolbar consumer on any parent render.
  return useMemo(
    () => ({
      dateTimeRangeValue,
      onDateTimeRangeChange,
      timezone,
      setTimezone,
      selectedViewId,
      handleSelectView,
      savedViews,
      openSaveNewViewModal,
      saveModalOpen,
      setSaveModalOpen,
      saveViewFormId,
      saveViewName,
      setSaveViewName,
      handleSaveViewSubmit,
      saveViewPending: saveView.isPending,
      handleApply,
      handleExport,
      isLoading,
      isExporting,
      groupings,
      groupingFilters,
      availableGroupings,
      setGroupings,
      setGroupingFilter,
      settingsDrawerOpen,
      openSettingsDrawer,
      closeSettingsDrawer,
      filtersDrawerOpen,
      openFiltersDrawer,
      closeFiltersDrawer,
      timeAttribution,
      setTimeAttribution,
      showFilteredTraffic,
      setShowFilteredTraffic,
      showWinners,
      setShowWinners,
    }),
    [
      dateTimeRangeValue,
      onDateTimeRangeChange,
      timezone,
      setTimezone,
      selectedViewId,
      handleSelectView,
      savedViews,
      openSaveNewViewModal,
      saveModalOpen,
      setSaveModalOpen,
      saveViewFormId,
      saveViewName,
      setSaveViewName,
      handleSaveViewSubmit,
      saveView.isPending,
      handleApply,
      handleExport,
      isLoading,
      isExporting,
      groupings,
      groupingFilters,
      availableGroupings,
      setGroupings,
      setGroupingFilter,
      settingsDrawerOpen,
      openSettingsDrawer,
      closeSettingsDrawer,
      filtersDrawerOpen,
      openFiltersDrawer,
      closeFiltersDrawer,
      timeAttribution,
      setTimeAttribution,
      showFilteredTraffic,
      setShowFilteredTraffic,
      showWinners,
      setShowWinners,
    ],
  )
}
