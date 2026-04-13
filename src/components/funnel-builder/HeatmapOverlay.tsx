import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Loader2, X } from 'lucide-react'
import { Tag } from 'antd'
import { Button, Select } from '@/components/ui-kit'
import { useDrilldownReport } from '@/api/hooks'
import { toApiDateTimeRange } from '@/types/stats'
import type { DrilldownRequest, Report } from '@/types/stats'
import { HeatmapContext } from './HeatmapContext'

// ── Metric Options ─────────────────────────────────────────────────────────

const METRIC_OPTIONS = [
  { value: 'visits', label: 'Visits' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'cost', label: 'Cost' },
  { value: 'roi', label: 'ROI' },
] as const

// ── Helpers ────────────────────────────────────────────────────────────────

function getTodayRange() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return toApiDateTimeRange(startOfDay, now)
}

function buildNodeStatsFromReport(report: Report): Record<string, Record<string, number>> {
  const stats: Record<string, Record<string, number>> = {}

  // Find column indices by name. The first column is the grouping (node ID).
  const colNames = report.columns.map((c) => c.name.toLowerCase())

  const visitsIdx = colNames.findIndex((n) => n.includes('visit'))
  const clicksIdx = colNames.findIndex((n) => n.includes('click'))
  const conversionsIdx = colNames.findIndex((n) => n.includes('conver'))
  const revenueIdx = colNames.findIndex((n) => n.includes('revenue'))
  const costIdx = colNames.findIndex((n) => n.includes('cost'))
  const roiIdx = colNames.findIndex((n) => n.includes('roi'))

  for (const row of report.rows) {
    const nodeId = String(row.cells[0]?.raw ?? '')
    if (!nodeId) continue

    stats[nodeId] = {
      visits: visitsIdx >= 0 ? Number(row.cells[visitsIdx]?.raw ?? 0) : 0,
      clicks: clicksIdx >= 0 ? Number(row.cells[clicksIdx]?.raw ?? 0) : 0,
      conversions: conversionsIdx >= 0 ? Number(row.cells[conversionsIdx]?.raw ?? 0) : 0,
      revenue: revenueIdx >= 0 ? Number(row.cells[revenueIdx]?.raw ?? 0) : 0,
      cost: costIdx >= 0 ? Number(row.cells[costIdx]?.raw ?? 0) : 0,
      roi: roiIdx >= 0 ? Number(row.cells[roiIdx]?.raw ?? 0) : 0,
    }
  }

  return stats
}

// ── Component ──────────────────────────────────────────────────────────────

interface HeatmapOverlayProps {
  funnelId: string
  active: boolean
  onToggle: () => void
}

export function HeatmapOverlay({ funnelId, active, onToggle }: HeatmapOverlayProps) {
  const [metric, setMetric] = useState('visits')
  const [nodeStats, setNodeStats] = useState<Record<string, Record<string, number>>>({})

  const drilldown = useDrilldownReport()

  const fetchStats = useCallback(() => {
    if (!funnelId) return

    const request: DrilldownRequest = {
      timeRange: getTodayRange(),
      timeZone: { name: Intl.DateTimeFormat().resolvedOptions().timeZone },
      groupings: [
        {
          groupBy: 'Element: Funnel Node',
          whitelistFilters: [],
          blacklistFilters: [],
        },
      ],
      topLevelFilters: [
        {
          groupBy: 'Element: Funnel',
          whitelistFilters: [funnelId],
          blacklistFilters: [],
        },
      ],
    }

    drilldown.mutate(request, {
      onSuccess: (report) => {
        setNodeStats(buildNodeStatsFromReport(report))
      },
    })
  }, [funnelId, drilldown])

  useEffect(() => {
    if (active) {
      fetchStats()
    } else {
      setNodeStats({})
    }
    // Only re-fetch when active state or funnelId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, funnelId])

  const contextValue = useMemo(
    () => ({ active, metric, nodeStats }),
    [active, metric, nodeStats],
  )

  if (!active) {
    return (
      <HeatmapContext.Provider value={contextValue}>
        <div className="bg-background border-b px-4 py-2 flex items-center gap-3">
          <Button size="small" onClick={onToggle}>
            <BarChart3 className="h-4 w-4 mr-1" />
            Show Heatmap
          </Button>
        </div>
      </HeatmapContext.Provider>
    )
  }

  return (
    <HeatmapContext.Provider value={contextValue}>
      <div className="bg-background border-b px-4 py-2 flex items-center gap-3">
        <Tag color="blue" className="gap-1">
          <BarChart3 className="h-3 w-3" />
          Heatmap Active
        </Tag>

        <Select value={metric} onChange={setMetric} placeholder="Select metric" className="w-[150px]" size="small"
          options={METRIC_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
        />

        {drilldown.isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}

        <Button type="text" size="small" onClick={onToggle} className="ml-auto">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </HeatmapContext.Provider>
  )
}
