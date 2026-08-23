import { useCallback, useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { useAllFlatDrilldownReportQuery } from '@/api/hooks'
import { Button, Select, useToastApi } from '@/components/ui-kit'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  buildFunnelHeatmapRequest,
  buildNodeHeatmapStatsFromReport,
  FUNNEL_HEATMAP_MODES,
  getFunnelHeatmapIntensityMax,
  type FunnelHeatmapMode,
  type FunnelHeatmapStatsByNode,
} from '@/lib/funnelHeatmap'
import { getPresetRange, type DateRange } from '@/lib/date-presets'
import { getErrorMessage } from '@/lib/utils'
import type { DrilldownRequest } from '@/types/stats'
import { HeatmapContext } from './HeatmapContext'

const HEATMAP_MODE_SELECT_OPTIONS = FUNNEL_HEATMAP_MODES.map((mode) => ({
  value: mode.value,
  label: mode.label,
}))

type HeatmapDateRange = DateRange & { preset: string | null }

// ── Component ──────────────────────────────────────────────────────────────

interface HeatmapOverlayProps {
  funnelId: string
  campaignId?: string
  enabled: boolean
  isNew?: boolean
  children: ReactNode
}

export function HeatmapOverlay({ funnelId, campaignId, enabled, isNew = false, children }: HeatmapOverlayProps) {
  const toast = useToastApi()
  const timezoneName = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const [active, setActive] = useState(false)
  const [mode, setMode] = useState<FunnelHeatmapMode>('trafficFlow')
  const [nodeStats, setNodeStats] = useState<FunnelHeatmapStatsByNode>({})
  const [hasLoaded, setHasLoaded] = useState(false)
  const [dateRange, setDateRange] = useState<HeatmapDateRange>(() => ({
    ...getPresetRange('today', timezoneName),
    preset: 'today',
  }))

  const [heatmapRequest, setHeatmapRequest] = useState<DrilldownRequest | null>(null)
  const heatmapActive = active && enabled && !isNew
  const heatmapQueryEnabled = heatmapActive && heatmapRequest != null && funnelId !== ''
  const {
    data: heatmapReportData,
    isFetching: heatmapFetching,
    isPending: heatmapPending,
    isError: heatmapIsError,
    error: heatmapError,
    refetch: refetchHeatmapReport,
  } = useAllFlatDrilldownReportQuery(heatmapRequest, heatmapQueryEnabled)

  const heatmapLoading = heatmapQueryEnabled && (heatmapFetching || heatmapPending)
  const lastHeatmapErrRef = useRef('')

  useEffect(() => {
    if (!heatmapReportData) return
    setNodeStats(buildNodeHeatmapStatsFromReport(heatmapReportData))
    setHasLoaded(true)
  }, [heatmapReportData])

  useEffect(() => {
    if (!heatmapIsError || heatmapError == null) {
      lastHeatmapErrRef.current = ''
      return
    }
    const msg = getErrorMessage(heatmapError)
    if (lastHeatmapErrRef.current === msg) return
    lastHeatmapErrRef.current = msg
    setNodeStats({})
    setHasLoaded(true)
    toast.error(msg)
  }, [heatmapIsError, heatmapError, toast])

  const fetchStats = useCallback(
    (rangeOverride?: HeatmapDateRange) => {
      if (!enabled || isNew || !funnelId) return

      const range = rangeOverride ?? dateRange
      const request = buildFunnelHeatmapRequest({
        campaignId,
        funnelId,
        dateFrom: range.from,
        dateTo: range.to,
        timeZone: { name: timezoneName },
      })

      setHasLoaded(false)
      setHeatmapRequest(request)
    },
    [campaignId, dateRange, enabled, funnelId, isNew, timezoneName],
  )

  const intensityMax = useMemo(
    () => getFunnelHeatmapIntensityMax(nodeStats, mode),
    [mode, nodeStats],
  )

  const contextValue = useMemo(
    () => ({
      active: heatmapActive,
      mode,
      nodeStats,
      intensityMax,
      isLoading: heatmapLoading,
    }),
    [heatmapActive, heatmapLoading, intensityMax, mode, nodeStats],
  )

  const handleToggle = useCallback(() => {
    if (active) {
      setActive(false)
      setHeatmapRequest(null)
      setNodeStats({})
      setHasLoaded(false)
      return
    }

    setActive(true)
    fetchStats()
  }, [active, fetchStats])

  const handleClose = useCallback(() => {
    setActive(false)
    setHeatmapRequest(null)
    setNodeStats({})
    setHasLoaded(false)
  }, [])

  const handleModeChange = useCallback((nextMode: string) => {
    setMode(nextMode as FunnelHeatmapMode)
  }, [])

  const handleDateRangeChange = useCallback((nextRange: HeatmapDateRange) => {
    setDateRange(nextRange)
    if (heatmapActive) {
      fetchStats(nextRange)
    }
  }, [fetchStats, heatmapActive])

  const handleRefresh = useCallback(() => {
    if (heatmapRequest) void refetchHeatmapReport()
    else fetchStats()
  }, [fetchStats, heatmapRequest, refetchHeatmapReport])

  if (!enabled) {
    return (
      <HeatmapContext.Provider value={contextValue}>
        {children}
      </HeatmapContext.Provider>
    )
  }

  if (isNew) {
    return (
      <HeatmapContext.Provider value={contextValue}>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="absolute left-4 top-4 z-30 max-w-[360px] rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-xl backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon name="bar-chart-3" size="md" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-card-foreground">Heatmap</p>
                <p className="text-xs text-muted-foreground">Save this funnel before viewing stats.</p>
              </div>
            </div>
          </div>
          {children}
        </div>
      </HeatmapContext.Provider>
    )
  }

  return (
    <HeatmapContext.Provider value={contextValue}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="absolute left-4 top-4 z-30">
          {!heatmapActive ? (
            <Button
              size="small"
              onClick={handleToggle}
              iconName="bar-chart-3"
              iconSize="sm"
              className="rounded-full border border-border bg-card text-card-foreground shadow-lg backdrop-blur"
            >
              Heatmap
            </Button>
          ) : (
            <div className="w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-xl backdrop-blur">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="bar-chart-3" size="md" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">Funnel Heatmap</p>
                    <p className="text-xs text-muted-foreground">Grouped by funnel node</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="text"
                    size="small"
                    onClick={handleRefresh}
                    disabled={heatmapLoading}
                    iconName="refresh-cw"
                    iconAnimation={heatmapLoading ? 'spin' : 'none'}
                    iconSize="sm"
                    aria-label="Refresh heatmap"
                  />
                  <Button
                    type="text"
                    size="small"
                    onClick={handleClose}
                    iconName="x"
                    iconSize="sm"
                    aria-label="Close heatmap"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Select
                  value={mode}
                  onChange={handleModeChange}
                  placeholder="Select heatmap"
                  className="w-full"
                  alphabetical={false}
                  options={HEATMAP_MODE_SELECT_OPTIONS}
                />

                <DateRangePicker
                  value={dateRange}
                  timezone={timezoneName}
                  onChange={handleDateRangeChange}
                  size="md"
                  className="w-full"
                  aria-label="Heatmap date range"
                />
              </div>

              {heatmapLoading ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <Icon name="loader-2" size="sm" animation="spin" aria-hidden />
                  Loading node stats...
                </div>
              ) : null}

              {hasLoaded && !heatmapLoading && Object.keys(nodeStats).length === 0 ? (
                <div className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  No node stats found for this date range. Try a funnel with recent traffic or choose a wider range.
                </div>
              ) : null}

              {!heatmapLoading && Object.keys(nodeStats).length > 0 ? (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Nodes with stats</span>
                  <span className="font-semibold tabular-nums text-card-foreground">
                    {Object.keys(nodeStats).length}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
        {children}
      </div>
    </HeatmapContext.Provider>
  )
}
