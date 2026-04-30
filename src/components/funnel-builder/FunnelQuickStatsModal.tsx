import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { api } from '@/api/client'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  Button,
  Input,
  Modal,
  Select,
  TimezoneSelect,
  useToastApi,
  type SelectOption,
} from '@/components/ui-kit'
import { getPresetRange } from '@/lib/date-presets'
import {
  buildDrilldownRequestForTab,
  buildQuickStatsLoadBody,
  flattenReportToGridRows,
  QUICKSTATS_TAB_TYPES,
  totalsToGridRow,
  type FunnelQuickStatsTab,
} from '@/lib/funnelQuickStats'
import { useDrilldownStore } from '@/store/drilldown'
import type { Report } from '@/types/stats'
import { Icon } from '@/components/ui-kit/icons'
import { DataTable } from '@/components/ui-kit/data-table'

interface QuickStatsApiResponse {
  report?: Report
  trafficSourcesIdsAndNames?: Array<{ key: string; value: string }>
  availableTrackingFields?: unknown
}

const ROW1: { id: FunnelQuickStatsTab; label: string }[] = [
  { id: 'traffic-sources', label: 'Traffic Sources' },
  { id: 'funnels', label: 'Funnels' },
  { id: 'landers', label: 'Landers' },
  { id: 'offers', label: 'Offers' },
  { id: 'conversion-paths', label: 'Conversion Paths' },
  { id: 'conversion-paths-all-nodes', label: 'Conversion Paths (All Nodes)' },
  { id: 'mvt-combinations', label: 'MVT (Combinations)' },
  { id: 'mvt-kv-pairs', label: 'MVT (Key-Value Pairs)' },
  { id: 'week-parting', label: 'Week Parting' },
  { id: 'day-parting', label: 'Day Parting' },
  { id: 'historical-perf', label: 'Historical Perf.' },
]

const ROW2: { id: FunnelQuickStatsTab; label: string }[] = [
  { id: 'device-type', label: 'Device Type' },
  { id: 'device-name', label: 'Device Name' },
  { id: 'os', label: 'OS' },
  { id: 'os-version', label: 'OS-Version' },
  { id: 'os-browser', label: 'OS-Browser' },
  { id: 'browser', label: 'Browser' },
  { id: 'isp', label: 'ISP' },
  { id: 'carrier', label: 'Mobile Carrier' },
  { id: 'connection-type', label: 'Connection Type' },
  { id: 'ip', label: 'IP' },
  { id: 'referrer', label: 'Referrer' },
  { id: 'tracking-fields', label: 'Tracking Fields' },
]

const ROW3: { id: FunnelQuickStatsTab; label: string }[] = [
  { id: 'continent', label: 'Continent' },
  { id: 'country', label: 'Country' },
  { id: 'region', label: 'Region' },
  { id: 'city', label: 'City' },
  { id: 'drilldown', label: 'Drilldown' },
]

type QuickStatsCategory = 'conversion' | 'device' | 'geo'

/** One visual system for Conversion/Device/Geo toggles + inner grouping tabs — avoids mixing Ant `primary`/`default`. */
function quickStatsChipClasses(selected: boolean, opts?: { iconOnly?: boolean }): string {
  return cn(
    'shadow-none ring-0 rounded-md border text-xs font-medium transition-colors',
    opts?.iconOnly ?
      'inline-flex h-control-md w-control-md shrink-0 items-center justify-center px-0'
    : 'inline-flex h-control-md shrink-0 items-center px-2.5',
    selected ?
      '!border-primary !bg-primary !text-primary-foreground [&_.ant-btn-icon]:!text-primary-foreground hover:!border-primary hover:!bg-primary/90 hover:!text-primary-foreground'
    : 'border-border/70 bg-muted/35 text-muted-foreground hover:border-border hover:bg-muted/60 hover:!text-foreground',
  )
}

function categoryForTab(t: FunnelQuickStatsTab): QuickStatsCategory {
  if (ROW1.some((r) => r.id === t)) return 'conversion'
  if (ROW2.some((r) => r.id === t)) return 'device'
  return 'geo'
}

function parseTrackingFieldOptions(raw: unknown): { value: string; label: string }[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  if (Array.isArray(o)) {
    return o.map((x, i) => {
      if (typeof x === 'string') return { value: x, label: x }
      if (x && typeof x === 'object') {
        const r = x as Record<string, string>
        const v = r.value ?? r.name ?? r.groupBy ?? String(i)
        return { value: String(v), label: String(r.label ?? r.name ?? v) }
      }
      return { value: String(i), label: String(x) }
    })
  }
  return []
}

export interface FunnelQuickStatsModalProps {
  open: boolean
  onClose: () => void
  campaignId: string
  funnelId: string
  funnelName: string
}

export function FunnelQuickStatsModal({
  open,
  onClose,
  campaignId,
  funnelId,
  funnelName,
}: FunnelQuickStatsModalProps) {
  const toast = useToastApi()
  const navigate = useNavigate()
  const setGroupings = useDrilldownStore((s) => s.setGroupings)
  const setGroupingFilters = useDrilldownStore((s) => s.setGroupingFilters)
  const setDrilldownTimezone = useDrilldownStore((s) => s.setTimezone)
  const setDrilldownDateRange = useDrilldownStore((s) => s.setDateRange)
  const setViewType = useDrilldownStore((s) => s.setViewType)

  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [datePickerValue, setDatePickerValue] = useState(() => ({
    ...getPresetRange('today', Intl.DateTimeFormat().resolvedOptions().timeZone),
    preset: 'today' as string | null,
  }))

  const [tab, setTab] = useState<FunnelQuickStatsTab>('conversion-paths')
  const [trafficSourceId, setTrafficSourceId] = useState<string>('')
  const [countryCode, setCountryCode] = useState('')
  const [trackingField, setTrackingField] = useState('')
  const [trafficOptions, setTrafficOptions] = useState<{ value: string; label: string }[]>([])
  const [trackingFieldOptions, setTrackingFieldOptions] = useState<{ value: string; label: string }[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [metaLoaded, setMetaLoaded] = useState(false)

  const loadMeta = useCallback(async () => {
    if (!campaignId || !funnelId) return
    try {
      const body = buildQuickStatsLoadBody('landers', {
        campaignId,
        funnelId,
        trafficSourceId: trafficSourceId || undefined,
        dateFrom: datePickerValue.from,
        dateTo: datePickerValue.to,
        timeZone: { name: timezone },
      })
      if (!body) return
      const data = await api.post<QuickStatsApiResponse>('/ui/quickstats/load/', body)
      const ts = data.trafficSourcesIdsAndNames ?? []
      setTrafficOptions(
        ts.map((t) => ({
          value: String(t.key),
          label: String(t.value ?? t.key),
        })),
      )
      setTrackingFieldOptions(parseTrackingFieldOptions(data.availableTrackingFields))
      setMetaLoaded(true)
    } catch {
      setMetaLoaded(true)
    }
  }, [campaignId, funnelId, trafficSourceId, datePickerValue.from, datePickerValue.to, timezone])

  const loadReport = useCallback(async () => {
    if (!campaignId || !funnelId) return

    if (tab === 'drilldown') {
      return
    }

    const geoNeedsCountry =
      (tab === 'region' || tab === 'city') &&
      (!countryCode.trim() || countryCode.trim().length < 2)
    const trackingNeedsField = tab === 'tracking-fields' && !trackingField.trim()

    if (geoNeedsCountry || trackingNeedsField) {
      setLoading(false)
      setReport(null)
      return
    }

    setLoading(true)
    try {
      const drillBody = buildDrilldownRequestForTab(tab, {
        campaignId,
        funnelId,
        trafficSourceId: trafficSourceId || undefined,
        countryCode: countryCode.trim() || undefined,
        dateFrom: datePickerValue.from,
        dateTo: datePickerValue.to,
        timeZone: { name: timezone },
      })

      if (drillBody) {
        const r = await api.post<Report>('/stats/reporting/drilldown/', drillBody)
        setReport(r)
        return
      }

      const qsType = QUICKSTATS_TAB_TYPES[tab]
      if (!qsType) {
        toast.error('This breakdown is not available.')
        setReport(null)
        return
      }

      const qsBody = buildQuickStatsLoadBody(tab, {
        campaignId,
        funnelId,
        trafficSourceId: trafficSourceId || undefined,
        trackingFieldName: tab === 'tracking-fields' ? trackingField : undefined,
        dateFrom: datePickerValue.from,
        dateTo: datePickerValue.to,
        timeZone: { name: timezone },
      })
      if (!qsBody) {
        toast.error('Invalid quick stats request.')
        return
      }
      const data = await api.post<QuickStatsApiResponse>('/ui/quickstats/load/', qsBody)
      if (data.report) {
        setReport(data.report)
      } else {
        setReport(null)
      }
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to load stats'
      toast.error(msg)
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [campaignId, funnelId, trafficSourceId, countryCode, trackingField, tab, datePickerValue.from, datePickerValue.to, timezone, toast])

  const handleRefreshReport = useCallback(() => {
    void loadReport()
  }, [loadReport])

  const trafficSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: '__all__', label: 'All Traffic Sources' },
      ...trafficOptions.map((t) => ({ value: t.value, label: t.label })),
    ],
    [trafficOptions],
  )

  const trackingFieldSelectOptions = useMemo<SelectOption[]>(
    () => [{ value: '__none__', label: '—' }, ...trackingFieldOptions],
    [trackingFieldOptions],
  )

  useEffect(() => {
    if (open) {
      void loadMeta()
    }
  }, [open, loadMeta])

  useEffect(() => {
    if (open && tab !== 'drilldown') {
      void loadReport()
    }
  }, [open, tab, loadReport])

  const rowData = useMemo(() => (report ? flattenReportToGridRows(report) : []), [report])

  const pinnedBottomRowData = useMemo(() => {
    if (!report) return undefined
    const t = totalsToGridRow(report)
    return t ? [t] : undefined
  }, [report])

  const columnDefs = useMemo((): ColumnDef<Record<string, string>, unknown>[] => {
    if (!report?.columns?.length) return []
    return report.columns.map((col, i) => ({
      id: `c${i}`,
      accessorKey: `c${i}`,
      header: col.name,
      enableSorting: i > 0,
      size: i === 0 ? 200 : 96,
      minSize: i === 0 ? 200 : 96,
      meta: i === 0 ? { flex: 1 } : { numeric: true },
    }))
  }, [report])

  const quickStatsDefaultSorting = useMemo((): SortingState => {
    const n = report?.columns?.length ?? 0
    if (n < 2) return []
    return [{ id: 'c1', desc: true }]
  }, [report])

  const handleOpenDrilldown = useCallback(() => {
    setGroupings(['Element: Funnel'])
    setGroupingFilters({
      0: { whitelist: [funnelId], blacklist: [] },
    })
    setDrilldownTimezone(timezone)
    setDrilldownDateRange({
      start: datePickerValue.from.toISOString(),
      end: datePickerValue.to.toISOString(),
    })
    setViewType('tree')
    onClose()
    navigate('/reports/tree')
  }, [
    funnelId,
    setGroupings,
    setGroupingFilters,
    setDrilldownTimezone,
    setDrilldownDateRange,
    setViewType,
    timezone,
    datePickerValue.from,
    datePickerValue.to,
    onClose,
    navigate,
  ])

  const tabButton = (id: FunnelQuickStatsTab, label: string) => (
    <Button
      key={id}
      htmlType="button"
      type="default"
      size="md"
      className={quickStatsChipClasses(tab === id)}
      onClick={() => setTab(id)}
    >
      {label}
    </Button>
  )

  const breakdownRow = (row: { id: FunnelQuickStatsTab; label: string }[]) => (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
      {row.map((r) => tabButton(r.id, r.label))}
    </div>
  )

  const activateCategory = useCallback((key: string) => {
    const cat = key as QuickStatsCategory
    const rows = cat === 'conversion' ? ROW1 : cat === 'device' ? ROW2 : ROW3
    if (!rows.some((r) => r.id === tab)) setTab(rows[0].id)
  }, [tab])

  const handleActivateConversionCategory = useCallback(() => {
    activateCategory('conversion')
  }, [activateCategory])

  const handleActivateDeviceCategory = useCallback(() => {
    activateCategory('device')
  }, [activateCategory])

  const handleActivateGeoCategory = useCallback(() => {
    activateCategory('geo')
  }, [activateCategory])

  const activeCategory = categoryForTab(tab)

  const awaitingCountryForGeo =
    (tab === 'region' || tab === 'city') &&
    (!countryCode.trim() || countryCode.trim().length < 2)
  const awaitingTrackingFieldPick = tab === 'tracking-fields' && !trackingField.trim()
  const awaitingUserInput = awaitingCountryForGeo || awaitingTrackingFieldPick

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      destroyOnClose
      centered={false}
      width="100%"
      style={{ top: 0, paddingBottom: 0, margin: 0, maxWidth: '100vw' }}
      styles={{
        wrapper: {
          padding: 0,
          alignItems: 'stretch',
        },
        container: {
          height: '100vh',
          maxHeight: '100dvh',
          margin: 0,
          padding: 0,
          top: 0,
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '100%',
          overflow: 'hidden',
        },
        body: {
          flex: 1,
          minHeight: 0,
          height: '100%',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      classNames={{ mask: 'backdrop-blur-[2px]' }}
      zIndex={1200}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground">
        <header className="shrink-0 divide-y divide-border/45 bg-gradient-to-b from-muted/45 to-background">
          {/* Primary strip: title left; controls right in one row (Refresh → date → TZ → traffic → category icons → Close) */}
          <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-[200px]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon name="bar-chart-3" size="md" aria-hidden />
              </div>
              <div className="min-w-0 flex flex-col justify-center gap-0.5">
                <p className="text-[10px] font-medium uppercase leading-none tracking-wider text-muted-foreground">
                  Funnel quick stats
                </p>
                <h2
                  className="truncate text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg"
                  title={funnelName}
                >
                  {funnelName}
                </h2>
              </div>
            </div>

            <div
              className="flex min-w-0 w-full shrink-0 flex-nowrap items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:ml-auto sm:w-auto sm:max-w-[min(100%,calc(100vw-12rem))] sm:justify-end [&::-webkit-scrollbar]:hidden"
              role="toolbar"
              aria-label="Report filters"
            >
              <Button
                htmlType="button"
                type="primary"
                size="md"
                className="h-control-md inline-flex shrink-0 items-center gap-1.5 self-center px-3 text-xs"
                icon={<Icon name="refresh-cw" size="md" aria-hidden />}
                loading={loading}
                onClick={handleRefreshReport}
              >
                Refresh
              </Button>
              <div className="flex min-w-[200px] shrink-0 items-center self-center sm:min-w-[240px]">
                <DateRangePicker
                  aria-label="Date range"
                  value={{
                    from: datePickerValue.from,
                    to: datePickerValue.to,
                    preset: datePickerValue.preset,
                  }}
                  timezone={timezone}
                  onChange={(v) => {
                    if (v.from && v.to) {
                      setDatePickerValue({ from: v.from, to: v.to, preset: v.preset ?? null })
                    }
                  }}
                  className="w-full min-w-0"
                />
              </div>
              <div className="flex shrink-0 items-center self-center">
                <label htmlFor="funnel-qs-tz" className="sr-only">
                  Timezone
                </label>
                <TimezoneSelect
                  id="funnel-qs-tz"
                  value={timezone}
                  onChange={setTimezone}
                  className="w-[min(180px,28vw)]"
                />
              </div>
              <div className="flex shrink-0 items-center self-center">
                <label htmlFor="funnel-qs-traffic" className="sr-only">
                  Traffic source
                </label>
                <Select
                  id="funnel-qs-traffic"
                  value={trafficSourceId || '__all__'}
                  onChange={(v) => setTrafficSourceId(v === '__all__' ? '' : v)}
                  options={trafficSelectOptions}
                  placeholder="All Traffic Sources"
                  className="w-[min(200px,36vw)]"
                />
              </div>

              <div
                className="flex shrink-0 items-center gap-0.5 self-center rounded-md bg-muted/25 p-0.5"
                role="group"
                aria-label="Breakdown category"
              >
                <Button
                  htmlType="button"
                  type="default"
                  size="md"
                  className={quickStatsChipClasses(activeCategory === 'conversion', { iconOnly: true })}
                  icon={<Icon name="layout-grid" size="md" aria-hidden />}
                  onClick={handleActivateConversionCategory}
                  aria-label="Conversion and traffic breakdowns"
                  title="Conversion & traffic"
                />
                <Button
                  htmlType="button"
                  type="default"
                  size="md"
                  className={quickStatsChipClasses(activeCategory === 'device', { iconOnly: true })}
                  icon={<Icon name="network" size="md" aria-hidden />}
                  onClick={handleActivateDeviceCategory}
                  aria-label="Device and network breakdowns"
                  title="Device & network"
                />
                <Button
                  htmlType="button"
                  type="default"
                  size="md"
                  className={quickStatsChipClasses(activeCategory === 'geo', { iconOnly: true })}
                  icon={<Icon name="globe-2" size="md" aria-hidden />}
                  onClick={handleActivateGeoCategory}
                  aria-label="Geography and drilldown breakdowns"
                  title="Geography & drilldown"
                />
              </div>

              <Button
                htmlType="button"
                type="default"
                size="md"
                className={cn(quickStatsChipClasses(false, { iconOnly: true }), 'ml-0.5')}
                aria-label="Close funnel quick stats"
                title="Close"
                onClick={onClose}
                icon={<Icon name="x" strokeWidth={2} size="md" aria-hidden />}
              />
            </div>
          </div>

          {(tab === 'region' || tab === 'city') && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-5">
              <label htmlFor="funnel-qs-country" className="shrink-0 text-xs text-muted-foreground">
                Country
              </label>
              <Input
                id="funnel-qs-country"
                className="w-32 uppercase shadow-sm"
                size="middle"
                maxLength={2}
                placeholder="US"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                aria-label="ISO-3166 alpha-2 country code"
              />
            </div>
          )}

          {tab === 'tracking-fields' && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-5">
              <label htmlFor="funnel-qs-tf" className="shrink-0 text-xs text-muted-foreground">
                Field
              </label>
              <Select
                id="funnel-qs-tf"
                value={trackingField || '__none__'}
                onChange={(v) => setTrackingField(v === '__none__' ? '' : v)}
                options={trackingFieldSelectOptions}
                placeholder={metaLoaded ? 'Select field' : 'Loading…'}
                className="w-[min(320px,85vw)]"
              />
            </div>
          )}

          <div className="bg-muted/10 px-3 py-2 sm:px-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="min-w-0 flex-1 rounded-md bg-muted/15 px-1 py-1 sm:px-1.5">
                {activeCategory === 'conversion' && breakdownRow(ROW1)}
                {activeCategory === 'device' && breakdownRow(ROW2)}
                {activeCategory === 'geo' && breakdownRow(ROW3)}
              </div>
              {metaLoaded && tab !== 'drilldown' && (
                <p className="shrink-0 self-center text-xs leading-relaxed text-muted-foreground">
                  Scroll horizontally if columns exceed the viewport.
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-1 sm:px-5">
          {tab === 'drilldown' ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border/80 bg-muted/20 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <span className="inline-flex [&>svg]:h-7 [&>svg]:w-7">
                  <Icon name="globe-2" size="lg" aria-hidden />
                </span>
              </div>
              <div className="max-w-md space-y-2">
                <p className="text-base font-medium text-foreground">Full drilldown</p>
                <p className="text-sm text-muted-foreground">
                  Open the drilldown tree with the current date range and timezone. This funnel stays pre-filtered.
                </p>
              </div>
              <Button htmlType="button" type="primary" size="large" className="shadow-md" onClick={handleOpenDrilldown}>
                Open drilldown
              </Button>
            </div>
          ) : loading ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-muted/10">
              <span className="text-primary inline-flex [&>svg]:h-9 [&>svg]:w-9">
                <Icon name="loader-2" size="lg" animation="spin" />
              </span>
              <p className="text-sm text-muted-foreground">Loading report…</p>
            </div>
          ) : awaitingUserInput ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/15 px-6 text-center">
              <p className="max-w-md text-sm text-muted-foreground">
                {awaitingTrackingFieldPick ?
                  'Choose a tracking field in the toolbar above — the report loads automatically, or tap Refresh.'
                : 'Enter a two-letter country code above (for example US) — regions and cities scope to that country. Data loads automatically, or tap Refresh.'}
              </p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/55 bg-card">
              <DataTable
                data={rowData}
                columns={columnDefs}
                pinnedBottomRows={pinnedBottomRowData}
                getRowId={(row) => `qs-${Object.values(row).join('\u001e')}`}
                noPagination
                maxHeight="100%"
                tableConfigKey={`funnel-quick-stats-${funnelId}-${tab}`}
                defaultSorting={quickStatsDefaultSorting}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
