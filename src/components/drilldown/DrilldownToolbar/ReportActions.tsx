import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  Button,
  DateTimeRangePicker,
  FormField,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  TimezoneSelect,
  useToastApi,
} from '@/components/ui-kit'
import { useDeleteView, useSaveView } from '@/api/hooks'
import { cn, getErrorMessage } from '@/lib/utils'
import { DATE_PRESETS, getPresetRange } from '@/lib/date-presets'
import { useDrilldownStore } from '@/store/drilldown'
import { useDrilldownToolbarContext } from '@/components/drilldown/DrilldownToolbar/useDrilldownToolbarContext'
import { DrilldownFiltersDrawer } from '@/components/drilldown/DrilldownToolbar/FiltersDrawer'
import { DrilldownSettingsDrawer } from '@/components/drilldown/DrilldownToolbar/SettingsDrawer'

function presetRanges(tz: string): { label: string; value: [Date, Date] }[] {
  return DATE_PRESETS.map((p) => {
    const range = getPresetRange(p.value, tz)
    return {
      label: p.label,
      value: [range.from, range.to],
    }
  })
}

/** Report query controls, filters/settings, and pinned saved-view/export actions. */
export function DrilldownToolbarReportActions({ children }: { children?: ReactNode }) {
  const toast = useToastApi()
  // Subscribe only to the fields used here (shallow-compared): a selectorless subscription
  // would re-render this toolbar on every store write.
  const { timezone, dateRange, filtersEnabled, groupingFilters } = useDrilldownStore(
    useShallow((s) => ({
      timezone: s.timezone,
      dateRange: s.dateRange,
      filtersEnabled: s.filtersEnabled,
      groupingFilters: s.groupingFilters,
    })),
  )
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
    openSettingsDrawer,
    openFiltersDrawer,
    dateTimeRangeValue,
    onDateTimeRangeChange,
    setTimezone,
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
          urlTrackingFieldByLevel: view.urlTrackingFieldByLevel ?? {},
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

  const handleExportClick = useCallback(() => {
    void handleExport()
  }, [handleExport])

  const handleCloseSaveModal = useCallback(() => {
    setSaveModalOpen(false)
  }, [setSaveModalOpen])

  const handleSaveViewFormSubmit = useCallback(
    (e: FormEvent) => {
      void handleSaveViewSubmit(e)
    },
    [handleSaveViewSubmit],
  )

  const savedViewOptions = useMemo(
    () =>
      (savedViews ?? []).map((view) => ({
        key: view.idView,
        value: view.idView,
        label: view.name,
      })),
    [savedViews],
  )

  // Preset date math runs for every preset; recompute only when the timezone changes.
  const presets = useMemo(() => presetRanges(timezone), [timezone])

  const filtersButtonTitle = useMemo(() => {
    if (!filtersEnabled) {
      return 'Configure grouping filters'
    }
    let whitelistLevels = 0
    let blacklistLevels = 0
    for (const level of Object.values(groupingFilters)) {
      if ((level.whitelist?.length ?? 0) > 0) whitelistLevels++
      if ((level.blacklist?.length ?? 0) > 0) blacklistLevels++
    }
    if (whitelistLevels === 0 && blacklistLevels === 0) {
      return 'Filters are on — will apply on Apply (no restrictions configured yet)'
    }
    const parts: string[] = []
    if (whitelistLevels > 0) parts.push(`${whitelistLevels} whitelist`)
    if (blacklistLevels > 0) parts.push(`${blacklistLevels} blacklist`)
    return `Filters are on — ${parts.join(', ')} — will apply on Apply`
  }, [filtersEnabled, groupingFilters])

  return (
    <div className="flex w-full shrink-0 flex-nowrap items-center gap-2 overflow-x-auto">
      <DateTimeRangePicker
        showTime
        autoConfirmCalendarSteps={false}
        value={dateTimeRangeValue}
        onChange={(dates) => {
          const a = dates?.[0]
          const b = dates?.[1]
          if (a && b) {
            onDateTimeRangeChange([a, b])
          }
        }}
        presets={presets}
        allowClear={false}
        className="ff-drilldown-datetime-range w-[330px] shrink-0 [&_.ant-picker-input>input]:text-xs"
      />
      <TimezoneSelect
        value={timezone}
        onChange={setTimezone}
        compactLabels
        // `!min-w`: TimezoneSelect sets an inline `minWidth: 180` default that plain classes lose to.
        className="w-[100px] !min-w-[100px] shrink-0 text-xs"
        popupMatchSelectWidth={false}
        dropdownStyle={{ minWidth: 220, maxWidth: 320 }}
      />
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
        className={cn(
          'text-xs shrink-0',
          filtersEnabled && '!border-primary/50 !text-primary',
        )}
        iconName="filter"
        iconSize="sm"
        onClick={openFiltersDrawer}
        title={filtersButtonTitle}
        aria-label={filtersEnabled ? 'Filters (on)' : 'Filters'}
      >
        Filters
        {filtersEnabled ? (
          <span
            className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold leading-tight text-primary-foreground"
            aria-hidden
          >
            On
          </span>
        ) : null}
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
      {children}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="flex shrink-0 items-center gap-1">
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
          <Button
            type="text"
            size="small"
            iconName="plus"
            iconSize="sm"
            onClick={openSaveNewViewModal}
            title="Save current view"
          />
          <Select
            value={selectedViewId || undefined}
            onChange={handleSelectView}
            placeholder="Saved views"
            className="w-[160px] text-xs"
            options={savedViewOptions}
            popupMatchSelectWidth={false}
            dropdownStyle={{ maxWidth: 320 }}
          />
        </div>
        <Button
          htmlType="button"
          onClick={handleExportClick}
          disabled={isExporting}
          iconName={isExporting ? 'loader-2' : 'download'}
          iconSize="sm"
          iconAnimation={isExporting ? 'spin' : 'none'}
        >
          Export CSV
        </Button>
      </div>

      <DrilldownFiltersDrawer />
      <DrilldownSettingsDrawer />

      <Modal
        title="Save report view"
        open={saveModalOpen}
        onCancel={handleCloseSaveModal}
        destroyOnHidden
        width={440}
        footer={
          <Space>
            <Button htmlType="button" onClick={handleCloseSaveModal}>
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
        <form id={saveViewFormId} className="space-y-4" onSubmit={handleSaveViewFormSubmit}>
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
                        aria-label="Confirm rename"
                      />
                      <Button
                        type="text"
                        size="small"
                        iconName="x"
                        iconSize="sm"
                        onClick={cancelEditing}
                        aria-label="Cancel rename"
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
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        title="Rename"
                        aria-label="Rename saved view"
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
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                          aria-label="Delete saved view"
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
