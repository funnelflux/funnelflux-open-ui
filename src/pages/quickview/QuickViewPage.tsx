import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { api } from "@/api/client"
import { executeObservedRequest } from "@/api/observedRequest"
import { Alert, PageShell, TimezoneSelect } from "@/components/ui-kit"
import { DataTable } from "@/components/ui-kit/data-table"
import { entityRowId } from "@/components/ui-kit/data-table"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { Card } from "@/components/ui-kit"
import { Button } from "@/components/ui-kit"
import { useDrilldownStore } from "@/store/drilldown"
import { toApiDateTimeRange } from "@/lib/statsDateRange"
import type { DateRange } from "@/lib/date-presets"
import { getErrorMessage } from "@/lib/utils"
import { reportRowToCells } from "@/lib/reportRowCells"
import type { Report, ReportCell } from "@/types/stats"

const REPORT_GROUPS = [
  [
    { label: "By Day", groupBy: "Time: Date" },
    { label: "By Hour", groupBy: "Time: HH:MM" },
    { label: "By Day of Week", groupBy: "Time: Week-Parting" },
    { label: "By Month", groupBy: "Time: Month" },
  ],
  [
    { label: "By Campaign", groupBy: "Element: Campaign" },
    { label: "By Funnel", groupBy: "Element: Funnel" },
    { label: "By Lander", groupBy: "Element: Lander" },
    { label: "By Offer", groupBy: "Element: Offer" },
    { label: "By Traffic Source", groupBy: "Third Parties: Traffic Source" },
  ],
  [
    { label: "By Country", groupBy: "Location: Country Name" },
    { label: "By Device", groupBy: "Device: Device Type" },
    { label: "By Browser", groupBy: "Device: Browser" },
    { label: "By OS", groupBy: "Device: OS" },
  ],
] as const

/** Entity names are timezone-independent; a fixed zone keeps the 1-row name lookup stable across timezone changes. */
const ENTITY_NAME_LOOKUP_TIMEZONE = "UTC"

interface QuickViewRow {
  id: string
  cells: ReportCell[]
}

function reportRowsToFlatData(report: Report): QuickViewRow[] {
  return report.rows.map((row, index) => {
    const cells = reportRowToCells(row, report.columns.length)
    return {
      id: String(cells[0]?.raw ?? index),
      cells,
    }
  })
}

export function QuickViewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const entityGroupBy = searchParams.get("groupBy") ?? "Element: Campaign"
  const entityId = searchParams.get("id") ?? ""

  const [selectedGroupBy, setSelectedGroupBy] = useState("Time: Date")
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [dateRange, setDateRange] = useState(() => ({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  }))
  const [report, setReport] = useState<Report | null>(null)
  const [entityName, setEntityName] = useState(entityId)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadRequestIdRef = useRef(0)

  const loadEntityName = useCallback(async () => {
    if (!entityId) return

    try {
      const now = new Date()
      const nameReport = await executeObservedRequest(queryClient, () => api.postDrilldown<Report>({
        timeRange: toApiDateTimeRange(now, now),
        timeZone: { name: ENTITY_NAME_LOOKUP_TIMEZONE },
        groupings: [
          {
            groupBy: entityGroupBy,
            whitelistFilters: [entityId],
            blacklistFilters: [],
          },
        ],
        paging: { start: 0, length: 1 },
        options: { viewType: "flat" },
      }))

      const firstRow = reportRowsToFlatData(nameReport)[0]
      setEntityName(firstRow?.cells[0]?.formatted ?? entityId)
    } catch {
      // Name lookup is cosmetic — fall back to the raw entity id.
      setEntityName(entityId)
    }
  }, [entityGroupBy, entityId, queryClient])

  const loadReport = useCallback(async () => {
    if (!entityId) return

    // Guard against overlapping loads: only the latest request may write state,
    // so a slow older failure can't paint an error over newer data.
    const requestId = ++loadRequestIdRef.current
    setIsLoading(true)
    setLoadError(null)
    try {
      const nextReport = await executeObservedRequest(queryClient, () => api.postDrilldown<Report>({
        timeRange: toApiDateTimeRange(dateRange.from, dateRange.to),
        timeZone: { name: timezone },
        groupings: [
          {
            groupBy: selectedGroupBy,
            whitelistFilters: [],
            blacklistFilters: [],
          },
        ],
        topLevelFilters: [
          {
            groupBy: entityGroupBy,
            whitelistFilters: [entityId],
            blacklistFilters: [],
          },
        ],
        paging: { start: 0, length: 100 },
        options: { viewType: "flat" },
      }))
      if (requestId !== loadRequestIdRef.current) return
      setReport(nextReport)
    } catch (err) {
      // Surface API failures instead of leaving an unhandled rejection + silent empty table.
      if (requestId !== loadRequestIdRef.current) return
      setLoadError(getErrorMessage(err))
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [dateRange.from, dateRange.to, entityGroupBy, entityId, queryClient, selectedGroupBy, timezone])

  useEffect(() => {
    void loadEntityName()
  }, [loadEntityName])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const columns = useMemo<ColumnDef<QuickViewRow, unknown>[]>(() => {
    if (!report) return []
    return report.columns.map((column, index) => {
      const base = {
        id: `col-${index}`,
        header: column.name,
        accessorFn: (row: QuickViewRow) => row.cells[index]?.formatted ?? "",
        enableSorting: false,
      } as const
      if (index === 0) {
        return {
          ...base,
          size: 250,
          meta: { flex: 1 },
          cell: (info: { getValue: () => unknown }) => (
            <span className="font-medium">{String(info.getValue())}</span>
          ),
        } satisfies ColumnDef<QuickViewRow, unknown>
      }
      return {
        ...base,
        size: 110,
        meta: { numeric: true },
      } satisfies ColumnDef<QuickViewRow, unknown>
    })
  }, [report])

  const rows = useMemo(() => (report ? reportRowsToFlatData(report) : []), [report])

  const dateRangePickerValue = useMemo<DateRange & { preset: string | null }>(
    () => ({ from: dateRange.from, to: dateRange.to, preset: null }),
    [dateRange.from, dateRange.to],
  )

  const handleDateRangeChange = useCallback((value: DateRange & { preset: string | null }) => {
    if (value.from && value.to) {
      setDateRange({ from: value.from, to: value.to })
    }
  }, [])

  const handleRetryLoadReport = useCallback(() => {
    void loadReport()
  }, [loadReport])

  const handleOpenInDrilldown = () => {
    // Setters only — read them off the store imperatively so this page does not
    // subscribe to (and re-render on) every drilldown store change.
    const {
      setGroupings,
      setGroupingFilters,
      setTimezone: setDrilldownTimezone,
      setDateRange: setDrilldownDateRange,
    } = useDrilldownStore.getState()

    setGroupings([entityGroupBy, selectedGroupBy])
    setGroupingFilters({
      0: {
        whitelist: [entityId],
        blacklist: [],
      },
    })
    setDrilldownTimezone(timezone)
    setDrilldownDateRange({
      start: dateRange.from.toISOString(),
      end: dateRange.to.toISOString(),
    })
    navigate(
      `/reports/tree?groupBy=${encodeURIComponent(entityGroupBy)}&id=${encodeURIComponent(entityId)}`,
    )
  }

  return (
    <PageShell
      fillHeight
      title={`${entityName} Quick View`}
      subtitle={`${entityGroupBy} · ${entityId}`}
      actions={
        <Button type="primary" size="small" onClick={handleOpenInDrilldown} iconName="arrow-right" iconSize="sm">
          Open in Drilldown
        </Button>
      }
    >
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker
          value={dateRangePickerValue}
          timezone={timezone}
          onChange={handleDateRangeChange}
        />
        <TimezoneSelect value={timezone} onChange={setTimezone} />
      </div>

      <div className="space-y-3">
        {REPORT_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="flex flex-wrap gap-2">
            {group.map((option) => (
              <Button
                key={option.groupBy}
                htmlType="button"
                size="small"
                type={selectedGroupBy === option.groupBy ? "primary" : "default"}
                onClick={() => setSelectedGroupBy(option.groupBy)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        ))}
      </div>

      {loadError ? (
        <Alert
          type="error"
          showIcon
          title="Quick view report failed to load"
          description={loadError}
          action={
            <Button size="small" onClick={handleRetryLoadReport}>
              Retry
            </Button>
          }
        />
      ) : null}

      <Card styles={{ body: { padding: 16 } }}>
        <DataTable<QuickViewRow>
          data={rows}
          columns={columns}
          loading={isLoading}
          getRowId={entityRowId}
          noPagination
        />
      </Card>
    </PageShell>
  )
}
