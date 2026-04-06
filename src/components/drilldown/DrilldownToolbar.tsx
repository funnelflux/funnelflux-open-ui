import { useState, useCallback, useEffect } from "react"
import { Download, Loader2, Play, Save, Trash2 } from "lucide-react"
import { Button, Select } from "antd"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { TimezoneSelect, useToastApi } from "@/components/ui-kit"
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

  const defaultRange = getPresetRange("today", timezone)
  const initialValue: DateRange & { preset: string | null } = dateRange
    ? { from: new Date(dateRange.start), to: new Date(dateRange.end), preset: null }
    : { ...defaultRange, preset: "today" }

  const [value, setValue] = useState(initialValue)

  // Sync store → local state when saved views update the store
  const storeStart = dateRange?.start
  const storeEnd = dateRange?.end
  useEffect(() => {
    if (storeStart && storeEnd) {
      setValue({ from: new Date(storeStart), to: new Date(storeEnd), preset: null })
    }
  }, [storeStart, storeEnd])

  const handleChange = useCallback(
    (range: DateRange & { preset: string | null }) => {
      setValue(range)
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
      paging: paging ?? { start: 0, length: 50 },
    }
  }, [datePickerValue, timezone, groupings, groupingFilters, viewType, paging])

  const handleApply = useCallback(() => {
    onApply(buildRequest())
  }, [buildRequest, onApply])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const request = buildRequest()
      const blob = await fetch("/admin/api/v2/stats/reporting/export/csv/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error("CSV export failed")
        }
        return response.blob()
      })

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

  const handleSaveView = useCallback(async () => {
    const existingName = savedViews?.find((view) => view.idView === selectedViewId)?.name ?? ""
    const name = window.prompt("Save current report as", existingName)
    if (!name?.trim()) {
      return
    }

    try {
      await saveView.mutateAsync({
        idView: selectedViewId || undefined,
        name: name.trim(),
        groupings,
        timezone,
        dateRange,
        groupingFilters,
      })
      toast.success("View saved")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save view"
      toast.error(message)
    }
  }, [dateRange, groupingFilters, groupings, saveView, savedViews, selectedViewId, timezone, toast])

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
          className="h-9 w-[220px] text-xs"
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
          size="small"
          className="h-9"
          onClick={() => void handleSaveView()}
          disabled={saveView.isPending}
          icon={saveView.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        >
          Save
        </Button>
        <Button
          htmlType="button"
          size="small"
          className="h-9"
          onClick={() => void handleDeleteView()}
          disabled={!selectedViewId || deleteView.isPending}
          icon={deleteView.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        >
          Delete
        </Button>
        <Button
          type="primary"
          size="small"
          className="h-9"
          onClick={handleApply}
          disabled={isLoading}
          icon={isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        >
          Apply
        </Button>
        <Button
          htmlType="button"
          size="small"
          className="h-9"
          onClick={() => void handleExport()}
          disabled={isExporting}
          icon={isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        >
          Export CSV
        </Button>
      </div>
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
