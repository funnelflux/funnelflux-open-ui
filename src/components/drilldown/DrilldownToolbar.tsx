import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  Button,
  Drawer,
  FormField,
  Modal,
  Select,
  Segmented,
  Space,
  Switch,
  TimezoneSelect,
  Input,
  useToastApi,
  DateTimeRangePicker,
  Popconfirm,
} from '@/components/ui-kit'
import { api } from '@/api/client'
import { DrilldownGroupingsBar } from '@/components/drilldown/DrilldownGroupingsBar'
import { useDrilldownStore } from '@/store/drilldown'
import {
  useDeleteView,
  useGroupings,
  useSavedViews,
  useSaveView,
} from '@/api/hooks'
import { getErrorMessage } from '@/lib/utils'
import { DATE_PRESETS, getPresetRange, type DateRange } from '@/lib/date-presets'
import { validateGroupingStackForRequest } from '@/lib/drilldownGroupings'
import { buildTrackingFieldMappingsForRequest } from '@/lib/urlTrackingFieldGrouping'
import { toApiDateTime } from '@/lib/statsDateRange'
import type { CsvExportResponse, DrilldownRequest } from '@/types/stats'
import type { DrilldownTimeAttribution } from '@/store/drilldown'

const TIME_ATTRIBUTION_OPTIONS = [
  { label: 'Entrance time', value: 'entrance' },
  { label: 'Event time', value: 'event' },
]

type DrilldownExportRequest = DrilldownRequest & {
  timeStart: number
  timeEnd: number
}

export interface DrilldownToolbarProps {
  onApply: (request: DrilldownRequest) => void
  isLoading: boolean
  viewType: 'tree' | 'flat'
  paging?: { start: number; length: number }
}

function useDatePickerState(timezone: string) {
  const { dateRange, setDateRange } = useDrilldownStore()

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

function presetRanges(tz: string): { label: string; value: [Date, Date] }[] {
  return DATE_PRESETS.map((p) => {
    const range = getPresetRange(p.value, tz)
    return {
      label: p.label,
      value: [range.from, range.to],
    }
  })
}

interface DrilldownToolbarContextValue {
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
  groupingsDrawerOpen: boolean
  openGroupingsDrawer: () => void
  closeGroupingsDrawer: () => void
  settingsDrawerOpen: boolean
  openSettingsDrawer: () => void
  closeSettingsDrawer: () => void
  timeAttribution: DrilldownTimeAttribution
  setTimeAttribution: (timeAttribution: DrilldownTimeAttribution) => void
  showFilteredTraffic: boolean
  setShowFilteredTraffic: (showFilteredTraffic: boolean) => void
  showWinners: boolean
  setShowWinners: (showWinners: boolean) => void
}

const DrilldownToolbarContext = createContext<DrilldownToolbarContextValue | null>(null)

function useDrilldownToolbarContext(): DrilldownToolbarContextValue {
  const contextValue = useContext(DrilldownToolbarContext)
  if (!contextValue) {
    throw new Error('Drilldown toolbar pieces must be used within DrilldownToolbarProvider')
  }
  return contextValue
}

function useDrilldownToolbarState(props: DrilldownToolbarProps): DrilldownToolbarContextValue {
  const { onApply, isLoading, viewType, paging } = props
  const toast = useToastApi()
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
    setTimeAttribution,
    setShowFilteredTraffic,
    setShowWinners,
  } = useDrilldownStore()

  const { data: availableGroupings } = useGroupings()
  const { data: savedViews } = useSavedViews()
  const saveView = useSaveView()
  const [datePickerValue, setDatePickerValue] = useDatePickerState(timezone)
  const [selectedViewId, setSelectedViewId] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveViewName, setSaveViewName] = useState('')
  const [groupingsDrawerOpen, setGroupingsDrawerOpen] = useState(false)
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)
  const saveViewFormId = useId()

  const openGroupingsDrawer = useCallback(() => {
    setGroupingsDrawerOpen(true)
  }, [])

  const closeGroupingsDrawer = useCallback(() => {
    setGroupingsDrawerOpen(false)
  }, [])

  const openSettingsDrawer = useCallback(() => {
    setSettingsDrawerOpen(true)
  }, [])

  const closeSettingsDrawer = useCallback(() => {
    setSettingsDrawerOpen(false)
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
          start: toApiDateTime(datePickerValue.from),
          end: toApiDateTime(datePickerValue.to),
        },
        timeZone: { name: timezone },
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
    )
    if (!groupingValidation.ok) {
      toast.error(groupingValidation.message)
      return
    }
    onApply(toDrilldownRequest(groupingValidation.levels))
  }, [groupingFilters, groupings, onApply, toast, toDrilldownRequest, urlTrackingFieldByLevel])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const groupingValidation = validateGroupingStackForRequest(
        groupings,
        groupingFilters,
        urlTrackingFieldByLevel,
      )
      if (!groupingValidation.ok) {
        toast.error(groupingValidation.message)
        return
      }
      const request = toDrilldownRequest(groupingValidation.levels)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `drilldown-export-${timestamp}.csv`
      const exportDrilldownRequest: DrilldownExportRequest = {
        ...request,
        timeStart: Math.floor(datePickerValue.from.getTime() / 1000),
        timeEnd: Math.floor(datePickerValue.to.getTime() / 1000),
      }
      const response = await api.post<CsvExportResponse>('/stats/reporting/export/csv/', {
        drilldownRequest: exportDrilldownRequest,
        filename,
        addHeader: true,
      })

      if (!response.url) {
        throw new Error('CSV export did not return a download URL')
      }

      const link = document.createElement('a')
      link.href = response.url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsExporting(false)
    }
  }, [
    datePickerValue.from,
    datePickerValue.to,
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
        replaceGroupingsStack(view.groupings, view.groupingFilters ?? {}, {})
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
        })
        toast.success('View saved')
        setSaveModalOpen(false)
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [dateRange, groupingFilters, groupings, saveView, saveViewName, timezone, toast],
  )

  return {
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
    groupingsDrawerOpen,
    openGroupingsDrawer,
    closeGroupingsDrawer,
    settingsDrawerOpen,
    openSettingsDrawer,
    closeSettingsDrawer,
    timeAttribution,
    setTimeAttribution,
    showFilteredTraffic,
    setShowFilteredTraffic,
    showWinners,
    setShowWinners,
  }
}

export function DrilldownToolbarProvider({
  children,
  ...props
}: DrilldownToolbarProps & { children: ReactNode }) {
  const value = useDrilldownToolbarState(props)
  return (
    <DrilldownToolbarContext.Provider value={value}>
      {children}
    </DrilldownToolbarContext.Provider>
  )
}

/** Date/time range + timezone — for `PageShell` `actions` (top row, right). */
export function DrilldownToolbarHeaderFilters() {
  const { dateTimeRangeValue, onDateTimeRangeChange, timezone, setTimezone } =
    useDrilldownToolbarContext()

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
      <DateTimeRangePicker
        showTime
        value={dateTimeRangeValue}
        onChange={(dates) => {
          const a = dates?.[0]
          const b = dates?.[1]
          if (a && b) {
            onDateTimeRangeChange([a, b])
          }
        }}
        presets={presetRanges(timezone)}
        allowClear={false}
        className="ff-drilldown-datetime-range [&_.ant-picker-input>input]:text-xs"
      />
      <TimezoneSelect value={timezone} onChange={setTimezone} />
    </div>
  )
}

function DrilldownSettingsDrawer() {
  const {
    settingsDrawerOpen,
    closeSettingsDrawer,
    timeAttribution,
    setTimeAttribution,
    showFilteredTraffic,
    setShowFilteredTraffic,
    showWinners,
    setShowWinners,
  } = useDrilldownToolbarContext()

  const handleTimeAttributionChange = useCallback(
    (value: string | number) => {
      setTimeAttribution(value === 'event' ? 'event' : 'entrance')
    },
    [setTimeAttribution],
  )

  const handleShowFilteredTrafficChange = useCallback(
    (checked: boolean) => {
      setShowFilteredTraffic(checked)
    },
    [setShowFilteredTraffic],
  )

  const handleShowWinnersChange = useCallback(
    (checked: boolean) => {
      setShowWinners(checked)
    },
    [setShowWinners],
  )

  return (
    <Drawer
      title="Report settings"
      placement="right"
      width={420}
      open={settingsDrawerOpen}
      onClose={closeSettingsDrawer}
      destroyOnClose={false}
    >
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <div className="text-sm font-medium">Attribution</div>
          <p className="text-xs text-muted-foreground">
            Choose whether the selected date range is matched against the entrance timestamp or the event timestamp.
          </p>
          <Segmented
            block
            value={timeAttribution}
            options={TIME_ATTRIBUTION_OPTIONS}
            onChange={handleTimeAttributionChange}
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Show filtered traffic</div>
            <p className="text-xs text-muted-foreground">
              Include traffic that was filtered out by rules or bot filtering in the report query.
            </p>
          </div>
          <Switch checked={showFilteredTraffic} onChange={handleShowFilteredTrafficChange} />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Show winners</div>
            <p className="text-xs text-muted-foreground">
              Request CTR, CVR, and EPV winner confidence data. Table highlighting can be added on top of this data later.
            </p>
          </div>
          <Switch checked={showWinners} onChange={handleShowWinnersChange} />
        </div>
      </div>
    </Drawer>
  )
}

/** Saved views dropdown (+ / manage) plus apply/export — second row with groupings (left-aligned). */
export function DrilldownToolbarReportActions() {
  const toast = useToastApi()
  const { timezone, dateRange } = useDrilldownStore()
  const saveView = useSaveView()
  const deleteView = useDeleteView()
  const [manageOpen, setManageOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const {
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
    saveViewPending,
    handleApply,
    handleExport,
    isLoading,
    isExporting,
    openGroupingsDrawer,
    openSettingsDrawer,
  } = useDrilldownToolbarContext()

  const handleOpenManage = useCallback(() => {
    setManageOpen(true)
  }, [])

  const handleCloseManage = useCallback(() => {
    setManageOpen(false)
    setEditingId(null)
    setEditingName('')
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setEditingName('')
  }, [])

  const startEditing = useCallback((idView: string, name: string) => {
    setEditingId(idView)
    setEditingName(name)
  }, [])

  const handleRenameView = useCallback(
    async (idView: string) => {
      const view = savedViews?.find((v) => v.idView === idView)
      if (!view || !editingName.trim()) return
      try {
        await saveView.mutateAsync({
          idView,
          name: editingName.trim(),
          groupings: view.groupings,
          timezone: view.timezone ?? timezone,
          dateRange: view.dateRange ?? dateRange,
          groupingFilters: view.groupingFilters ?? {},
        })
        toast.success('View renamed')
        cancelEditing()
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [cancelEditing, dateRange, editingName, saveView, savedViews, timezone, toast],
  )

  const handleDeleteViewById = useCallback(
    async (idView: string) => {
      try {
        await deleteView.mutateAsync(idView)
        if (selectedViewId === idView) {
          handleSelectView('')
        }
        toast.success('View deleted')
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [deleteView, handleSelectView, selectedViewId, toast],
  )

  const handleOpenSaveNewFromManage = useCallback(() => {
    handleCloseManage()
    openSaveNewViewModal()
  }, [handleCloseManage, openSaveNewViewModal])

  const savedViewOptions = useMemo(
    () =>
      (savedViews ?? []).map((view) => ({
        key: view.idView,
        value: view.idView,
        label: view.name,
      })),
    [savedViews],
  )

  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <Select
          value={selectedViewId || undefined}
          onChange={handleSelectView}
          placeholder="Saved views"
          style={{ width: 220 }}
          className="text-xs"
          options={savedViewOptions}
        />
        <Button
          type="text"
          size="small"
          iconName="plus"
          iconSize="sm"
          onClick={openSaveNewViewModal}
          title="Save current view"
        />
        {(savedViews ?? []).length > 0 && (
          <Button
            type="text"
            size="small"
            iconName="settings-2"
            iconSize="sm"
            onClick={handleOpenManage}
            title="Manage saved views"
          />
        )}
      </div>
      <Button
        type="primary"
        onClick={handleApply}
        disabled={isLoading}
        iconName={isLoading ? 'loader-2' : 'play'}
        iconSize="sm"
        iconAnimation={isLoading ? 'spin' : 'none'}
      >
        Apply
      </Button>
      <Button
        htmlType="button"
        onClick={() => void handleExport()}
        disabled={isExporting}
        iconName={isExporting ? 'loader-2' : 'download'}
        iconSize="sm"
        iconAnimation={isExporting ? 'spin' : 'none'}
      >
        Export CSV
      </Button>
      <Button
        htmlType="button"
        className="text-xs shrink-0"
        iconName="layers"
        iconSize="sm"
        onClick={openGroupingsDrawer}
      >
        Edit levels
      </Button>
      <Button
        htmlType="button"
        className="text-xs shrink-0"
        iconName="sliders-horizontal"
        iconSize="sm"
        onClick={openSettingsDrawer}
      >
        Settings
      </Button>

      <DrilldownSettingsDrawer />

      <Modal
        title="Save report view"
        open={saveModalOpen}
        onCancel={() => setSaveModalOpen(false)}
        destroyOnHidden
        width={440}
        footer={
          <Space>
            <Button htmlType="button" onClick={() => setSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              form={saveViewFormId}
              loading={saveViewPending}
            >
              Save
            </Button>
          </Space>
        }
      >
        <form id={saveViewFormId} className="space-y-4" onSubmit={(e) => void handleSaveViewSubmit(e)}>
          <p className="text-sm text-muted-foreground">
            Save the current grouping, date range, and filters so you can load them again from Saved views.
          </p>
          <FormField label="View name" htmlFor={`${saveViewFormId}-name`} required>
            <Input
              id={`${saveViewFormId}-name`}
              value={saveViewName}
              onChange={(ev) => setSaveViewName(ev.target.value)}
              placeholder="e.g. Weekly offer breakdown"
              allowClear
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={manageOpen}
        title="Manage saved views"
        onCancel={handleCloseManage}
        footer={
          <Button onClick={handleCloseManage}>
            Close
          </Button>
        }
        width={480}
        destroyOnHidden
      >
        <div className="py-2">
          {(savedViews ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No saved views yet.</p>
          ) : (
            <div className="space-y-1">
              {(savedViews ?? []).map((view) => (
                <div
                  key={view.idView}
                  className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 group"
                >
                  {editingId === view.idView ? (
                    <>
                      <Input
                        size="small"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onPressEnter={() => void handleRenameView(view.idView)}
                        className="flex-1"
                      />
                      <Button
                        type="text"
                        size="small"
                        iconName="check"
                        iconSize="sm"
                        onClick={() => void handleRenameView(view.idView)}
                        disabled={!editingName.trim() || editingName.trim() === view.name}
                        loading={saveView.isPending}
                      />
                      <Button
                        type="text"
                        size="small"
                        iconName="x"
                        iconSize="sm"
                        onClick={cancelEditing}
                      />
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm truncate">{view.name}</span>
                      <Button
                        type="text"
                        size="small"
                        iconName="pencil"
                        iconSize="sm"
                        onClick={() => startEditing(view.idView, view.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Rename"
                      />
                      <Popconfirm
                        title="Delete saved view?"
                        description="This cannot be undone."
                        onConfirm={() => void handleDeleteViewById(view.idView)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          iconName="trash-2"
                          iconSize="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </Popconfirm>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-border">
            <Button
              type="dashed"
              block
              iconName="plus"
              iconSize="sm"
              onClick={handleOpenSaveNewFromManage}
            >
              Save current as new view
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/** Full control strip (legacy / embedded toolbars): header filters + report actions in one row. */
export function DrilldownToolbarControls() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DrilldownToolbarHeaderFilters />
      <DrilldownToolbarReportActions />
    </div>
  )
}

/** Group-by cascade — use on the second toolbar row next to `DrilldownToolbarReportActions`. */
export function DrilldownToolbarGroupings() {
  const {
    groupings,
    groupingFilters,
    availableGroupings,
    setGroupings,
    setGroupingFilter,
    groupingsDrawerOpen,
    closeGroupingsDrawer,
  } = useDrilldownToolbarContext()
  const replaceGroupingsStack = useDrilldownStore((s) => s.replaceGroupingsStack)

  const handleGroupingFilterApply = useCallback(
    (level: number, next: { whitelist: string[]; blacklist: string[] }) => {
      setGroupingFilter(level, 'whitelist', next.whitelist)
      setGroupingFilter(level, 'blacklist', next.blacklist)
    },
    [setGroupingFilter],
  )

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 min-h-[2.25rem] min-w-0 flex-1">
      <DrilldownGroupingsBar
        groupings={groupings}
        groupingFilters={groupingFilters}
        availableGroupings={availableGroupings ?? []}
        onGroupingsChange={setGroupings}
        onReplaceStack={replaceGroupingsStack}
        onFilterChange={handleGroupingFilterApply}
        drawerOpen={groupingsDrawerOpen}
        onCloseDrawer={closeGroupingsDrawer}
      />
    </div>
  )
}

/** Standalone layout (legacy); matches `PageShell` + split rows when not using the shell. */
export function DrilldownToolbar(props: DrilldownToolbarProps) {
  return (
    <DrilldownToolbarProvider {...props}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-end gap-2 w-full">
          <DrilldownToolbarHeaderFilters />
        </div>
        <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-2 w-full">
          <DrilldownToolbarReportActions />
          <DrilldownToolbarGroupings />
        </div>
      </div>
    </DrilldownToolbarProvider>
  )
}
