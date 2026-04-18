import { useEffect, useMemo, useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowRight } from "lucide-react"
import { api } from "@/api/client"
import { PageShell, DataTable, TimezoneSelect } from "@/components/ui-kit"
import { entityRowId } from "@/components/ui-kit/data-table"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { Card } from "@/components/ui-kit"
import { Button } from "@/components/ui-kit"
import { useDrilldownStore } from "@/store/drilldown"
import { toApiDateTimeRange } from "@/types/stats"
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

interface QuickViewRow {
  id: string
  cells: ReportCell[]
}

function reportRowsToFlatData(report: Report): QuickViewRow[] {
  return report.rows.map((row, index) => {
    const cells: ReportCell[] = []
    for (let i = 0; i < report.columns.length; i += 1) {
      const cell = row[String(i)] as ReportCell | undefined
      cells.push(cell ?? { raw: "", formatted: "" })
    }
    return {
      id: String(cells[0]?.raw ?? index),
      cells,
    }
  })
}

export function QuickViewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const entityGroupBy = searchParams.get("groupBy") ?? "Element: Campaign"
  const entityId = searchParams.get("id") ?? ""

  const {
    setGroupings,
    setGroupingFilters,
    setTimezone: setDrilldownTimezone,
    setDateRange: setDrilldownDateRange,
  } = useDrilldownStore()

  const [selectedGroupBy, setSelectedGroupBy] = useState("Time: Date")
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [dateRange, setDateRange] = useState(() => ({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  }))
  const [report, setReport] = useState<Report | null>(null)
  const [entityName, setEntityName] = useState(entityId)
  const [isLoading, setIsLoading] = useState(false)

  const loadEntityName = useCallback(async () => {
    if (!entityId) return

    try {
      const now = new Date()
      const nameReport = await api.post<Report>("/stats/reporting/drilldown/", {
        timeRange: toApiDateTimeRange(now, now),
        timeZone: { name: timezone },
        groupings: [
          {
            groupBy: entityGroupBy,
            whitelistFilters: [entityId],
            blacklistFilters: [],
          },
        ],
        paging: { start: 0, length: 1 },
        options: { viewType: "flat" },
      })

      const firstRow = reportRowsToFlatData(nameReport)[0]
      setEntityName(firstRow?.cells[0]?.formatted ?? entityId)
    } catch {
      setEntityName(entityId)
    }
  }, [entityGroupBy, entityId, timezone])

  const loadReport = useCallback(async () => {
    if (!entityId) return

    setIsLoading(true)
    try {
      const nextReport = await api.post<Report>("/stats/reporting/drilldown/", {
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
      })
      setReport(nextReport)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange.from, dateRange.to, entityGroupBy, entityId, selectedGroupBy, timezone])

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

  const handleOpenInDrilldown = () => {
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
        <Button type="primary" size="small" onClick={handleOpenInDrilldown} icon={<ArrowRight className="h-3.5 w-3.5" />}>
          Open in Drilldown
        </Button>
      }
    >
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker
          value={{ from: dateRange.from, to: dateRange.to, preset: null }}
          timezone={timezone}
          onChange={(value) => {
            if (value.from && value.to) {
              setDateRange({ from: value.from, to: value.to })
            }
          }}
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
