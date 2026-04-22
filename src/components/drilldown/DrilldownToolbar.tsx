import { useState, useCallback, useMemo, useId, type FormEvent } from "react"
import { Download, Loader2, Play, Save, Trash2 } from "lucide-react"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import {
  Button,
  FormField,
  Modal,
  Select,
  Space,
  TimezoneSelect,
  Input,
  useToastApi,
} from "@/components/ui-kit"
import { api } from "@/api/client"
import { GroupingsCascade } from "@/components/drilldown/GroupingsCascade"
import { useDrilldownStore } from "@/store/drilldown"
import {
  useDeleteView,
  useGroupings,
  useSavedViews,
  useSaveView,
} from "@/api/hooks"
import { getPresetRange } from "@/lib/date-presets"
import { toApiDateTimeRange, type DrilldownRequest } from "@/types/stats"
import type { DateRange } from "@/lib/date-presets"

interface DrilldownToolbarProps {
  onApply: (request: DrilldownRequest) => void
  isLoading: boolean
  viewType: "tree" | "flat"
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
    return { ...getPresetRange("today", timezone), preset: "today" }
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

export function DrilldownToolbar({
  onApply,
  isLoading,
  viewType,
  paging,
}: DrilldownToolbarProps) {
  const toast = useToastApi()
  const {
    groupings,
    groupingFilters,
    timezone,
    dateRange,
    setGroupings,
    setGroupingFilter,
    setGroupingFilters,
    setTimezone,
    setDateRange,
  } = useDrilldownStore()

  const { data: availableGroupings } = useGroupings()
  const { data: savedViews } = useSavedViews()
  const saveView = useSaveView()
  const deleteView = useDeleteView()
  const [datePickerValue, setDatePickerValue] = useDatePickerState(timezone)
  const [selectedViewId, setSelectedViewId] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveViewName, setSaveViewName] = useState("")
  const saveViewFormId = useId()

  const buildRequest = useCallback((): DrilldownRequest => {
    return {
      timeRange: toApiDateTimeRange(datePickerValue.from, datePickerValue.to),
      timeZone: { name: timezone },
      groupings: groupings.map((grouping, index) => ({
        groupBy: grouping,
        whitelistFilters: groupingFilters[index]?.whitelist ?? [],
        blacklistFilters: groupingFilters[index]?.blacklist ?? [],
      })),
      options: { viewType },
      paging: paging ?? { start: 0, length: 100 },
    }
  }, [datePickerValue, timezone, groupings, groupingFilters, viewType, paging])

  const handleApply = useCallback(() => {
    onApply(buildRequest())
  }, [buildRequest, onApply])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const request = buildRequest()
      const blob = await api.postBlob("/stats/reporting/export/csv/", request)

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      link.href = url
      link.download = `drilldown-export-${timestamp}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      const message = error instanceof Error ? error.message : "CSV export failed"
      toast.error(message)
    } finally {
      setIsExporting(false)
    }
  }, [buildRequest, toast])

  const handleSelectView = useCallback(
    (idView: string) => {
      setSelectedViewId(idView)
      const view = savedViews?.find((entry) => entry.idView === idView)
      if (!view) {
        return
      }

      if (view.groupings.length > 0) {
        setGroupings(view.groupings)
      }
      if (view.timezone) {
        setTimezone(view.timezone)
      }
      if (view.dateRange?.start && view.dateRange?.end) {
        setDateRange(view.dateRange)
      }
      setGroupingFilters(view.groupingFilters ?? {})
    },
    [savedViews, setDateRange, setGroupingFilters, setGroupings, setTimezone],
  )

  const openSaveViewModal = useCallback(() => {
    const existingName =
      savedViews?.find((view) => view.idView === selectedViewId)?.name ?? ""
    setSaveViewName(existingName)
    setSaveModalOpen(true)
  }, [savedViews, selectedViewId])

  const handleSaveViewSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const name = saveViewName.trim()
      if (!name) {
        return
      }

      try {
        await saveView.mutateAsync({
          idView: selectedViewId || undefined,
          name,
          groupings,
          timezone,
          dateRange,
          groupingFilters,
        })
        toast.success("View saved")
        setSaveModalOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save view"
        toast.error(message)
      }
    },
    [
      dateRange,
      groupingFilters,
      groupings,
      saveView,
      saveViewName,
      selectedViewId,
      timezone,
      toast,
    ],
  )

  const handleDeleteView = useCallback(async () => {
    if (!selectedViewId) {
      return
    }

    try {
      await deleteView.mutateAsync(selectedViewId)
      setSelectedViewId("")
      toast.success("View deleted")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete view"
      toast.error(message)
    }
  }, [deleteView, selectedViewId, toast])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={selectedViewId || undefined}
          onChange={handleSelectView}
          placeholder="Saved views"
          className="w-[220px] text-xs"
          options={(savedViews ?? []).map((view) => ({
            key: view.idView,
            value: view.idView,
            label: view.name,
          }))}
        />
        <DateRangePicker
          value={datePickerValue}
          timezone={timezone}
          onChange={setDatePickerValue}
        />
        <TimezoneSelect value={timezone} onChange={setTimezone} />
        <Button
          htmlType="button"
          onClick={openSaveViewModal}
          disabled={saveView.isPending}
          icon={
            saveView.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )
          }
        >
          Save
        </Button>
        <Button
          htmlType="button"
          onClick={() => void handleDeleteView()}
          disabled={!selectedViewId || deleteView.isPending}
          icon={deleteView.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        >
          Delete
        </Button>
        <Button
          type="primary"
          onClick={handleApply}
          disabled={isLoading}
          icon={isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        >
          Apply
        </Button>
        <Button
          htmlType="button"
          onClick={() => void handleExport()}
          disabled={isExporting}
          icon={isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        >
          Export CSV
        </Button>
      </div>
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
              loading={saveView.isPending}
            >
              Save
            </Button>
          </Space>
        }
      >
        <form id={saveViewFormId} className="space-y-4" onSubmit={(e) => void handleSaveViewSubmit(e)}>
          <p className="text-sm text-muted-foreground">
            Name this grouping, date range, and filters so you can load it again from Saved views.
          </p>
          <FormField label="View name" htmlFor={`${saveViewFormId}-name`} required>
            <Input
              id={`${saveViewFormId}-name`}
              value={saveViewName}
              onChange={(ev) => setSaveViewName(ev.target.value)}
              placeholder="e.g. Weekly offer breakdown"
              autoFocus
              allowClear
            />
          </FormField>
        </form>
      </Modal>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          Group by:
        </span>
        <GroupingsCascade
          groupings={groupings}
          groupingFilters={groupingFilters}
          availableGroupings={availableGroupings ?? []}
          onChange={setGroupings}
          onFilterChange={(level, next) => {
            setGroupingFilter(level, "whitelist", next.whitelist)
            setGroupingFilter(level, "blacklist", next.blacklist)
          }}
        />
      </div>
    </div>
  )
}
