import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { Tabs } from 'antd'

import { api } from '@/api/client'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  Button,
  Input,
  Modal,
  SmartSelect,
  TimezoneSelect,
  useToastApi,
  type SmartSelectOption,
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
import { Loader2, Printer, RefreshCw, BarChart3, Globe2, LayoutGrid, Network } from 'lucide-react'
import { DataTable } from '@/components/ui-kit/data-table'

interface QuickStatsApiResponse {
  report?: Report
  trafficSourcesIdsAndNames?: Array<{ key: string; value: string }>
  availableTrackingFields?: unknown
}

const ROW1: { id: FunnelQuickStatsTab; label: string }[] = [
  { id: 'conversion-paths', label: 'Conversion Paths' },
  { id: 'conversion-paths-all-nodes', label: 'Conversion Paths (all nodes)' },
  { id: 'landers', label: 'Landers' },
  { id: 'offers', label: 'Offers' },
  { id: 'mvt-combinations', label: 'MVT (Combinations)' },
  { id: 'mvt-kv-pairs', label: 'MVT (Key-Value Pairs)' },
  { id: 'traffic-sources', label: 'Traffic Sources' },
  { id: 'funnels', label: 'Funnels' },
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

  const printRef = useRef<HTMLDivElement>(null)

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

    if (tab === 'region' || tab === 'city') {
      if (!countryCode.trim() || countryCode.trim().length < 2) {
        toast.error('Enter a 2-letter country code (e.g. US) for this breakdown.')
        return
      }
    }

    if (tab === 'tracking-fields' && !trackingField.trim()) {
      toast.error('Select a tracking field.')
      return
    }

    setLoading(true)
    try {
      const drill = buildDrilldownRequestForTab(tab, {
        campaignId,
        funnelId,
        trafficSourceId: trafficSourceId || undefined,
        countryCode: countryCode.trim() || undefined,
        dateFrom: datePickerValue.from,
        dateTo: datePickerValue.to,
        timeZone: { name: timezone },
      })

      if (drill) {
        const r = await api.post<Report>('/stats/reporting/drilldown/', drill)
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
        countryCode: tab === 'region' || tab === 'city' ? countryCode : undefined,
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

  const trafficSelectOptions = useMemo<SmartSelectOption[]>(
    () => [
      { value: '__all__', label: 'All Traffic Sources' },
      ...trafficOptions.map((t) => ({ value: t.value, label: t.label })),
    ],
    [trafficOptions],
  )

  const trackingFieldSelectOptions = useMemo<SmartSelectOption[]>(
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when modal opens or primary tab changes; use Refresh for date/filters
  }, [open, tab])

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

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

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
      type={tab === id ? 'primary' : 'default'}
      size="small"
      className={
        tab === id
          ? 'h-8 px-2.5 text-xs shadow-sm'
          : 'h-8 border-border/60 bg-background/80 px-2.5 text-xs text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
      }
      onClick={() => setTab(id)}
    >
      {label}
    </Button>
  )

  const breakdownRow = (row: { id: FunnelQuickStatsTab; label: string }[]) => (
    <div className="flex flex-wrap gap-1 border-t border-border/50 bg-background/80 px-0.5 py-1.5 sm:px-1">
      {row.map((r) => tabButton(r.id, r.label))}
    </div>
  )

  const handleCategoryTabChange = useCallback((key: string) => {
    const cat = key as QuickStatsCategory
    const rows = cat === 'conversion' ? ROW1 : cat === 'device' ? ROW2 : ROW3
    if (!rows.some((r) => r.id === tab)) setTab(rows[0].id)
  }, [tab])

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable
      destroyOnClose
      width="100%"
      style={{ top: 0, paddingBottom: 0, maxWidth: '100vw' }}
      styles={{
        body: { height: '100vh', padding: 0, overflow: 'hidden' },
      }}
      classNames={{ mask: 'backdrop-blur-[2px]' }}
      zIndex={1200}
    >
      <div className="flex h-[100vh] flex-col bg-background text-foreground">
        <header className="shrink-0 border-b border-border/80 bg-gradient-to-b from-muted/50 to-background px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
              <BarChart3 className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Funnel quick stats</p>
              <h2 className="text-balance text-base font-semibold tracking-tight sm:text-lg" title={funnelName}>
                <span className="text-foreground">{funnelName}</span>
              </h2>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-border/70 bg-card/90 px-2 py-2 shadow-sm backdrop-blur-sm sm:px-3">
            <div
              className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="toolbar"
              aria-label="Report filters"
            >
              <div className="flex shrink-0 items-center gap-1.5">
                <label htmlFor="funnel-qs-traffic" className="sr-only">
                  Traffic source
                </label>
                <SmartSelect
                  id="funnel-qs-traffic"
                  value={trafficSourceId || '__all__'}
                  onChange={(v) => setTrafficSourceId(v === '__all__' ? '' : v)}
                  options={trafficSelectOptions}
                  placeholder="All Traffic Sources"
                  className="min-h-9 w-[min(200px,42vw)] shadow-sm"
                />
              </div>
              <div className="min-w-[220px] shrink-0 sm:min-w-[260px]">
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
              <div className="flex shrink-0 items-center gap-1.5">
                <label htmlFor="funnel-qs-tz" className="sr-only">
                  Timezone
                </label>
                <TimezoneSelect
                  id="funnel-qs-tz"
                  value={timezone}
                  onChange={setTimezone}
                  className="min-h-9 w-[min(180px,28vw)] shadow-sm"
                />
              </div>
              <Button
                htmlType="button"
                type="primary"
                size="small"
                className="gap-1.5 shadow-sm"
                icon={<RefreshCw className="h-4 w-4" />}
                loading={loading}
                onClick={() => void loadReport()}
              >
                Refresh
              </Button>
            </div>

            {(tab === 'region' || tab === 'city') && (
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
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
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
                <label htmlFor="funnel-qs-tf" className="shrink-0 text-xs text-muted-foreground">
                  Field
                </label>
                <SmartSelect
                  id="funnel-qs-tf"
                  value={trackingField || '__none__'}
                  onChange={(v) => setTrackingField(v === '__none__' ? '' : v)}
                  options={trackingFieldSelectOptions}
                  placeholder={metaLoaded ? 'Select field' : 'Loading…'}
                  className="min-h-9 w-[min(320px,85vw)] shadow-sm"
                />
              </div>
            )}
          </div>
        </header>

        <div className="shrink-0 border-b border-border/80 bg-muted/15 px-3 pb-2 pt-1.5 sm:px-5">
          <Tabs
            activeKey={categoryForTab(tab)}
            onChange={handleCategoryTabChange}
            className="quick-stats-category-tabs [&_.ant-tabs-content]:mt-0 [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-nav]:before:border-border/50 [&_.ant-tabs-tab]:px-3 [&_.ant-tabs-tab]:py-1.5 [&_.ant-tabs-tab-active]:bg-background [&_.ant-tabs-tab-active]:shadow-sm [&_.ant-tabs-tab-btn]:text-xs [&_.ant-tabs-tab-btn]:font-medium [&_.ant-tabs-tab-btn]:text-muted-foreground [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-foreground"
            items={[
              {
                key: 'conversion',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    Conversion & traffic
                  </span>
                ),
                children: breakdownRow(ROW1),
              },
              {
                key: 'device',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Network className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    Device & network
                  </span>
                ),
                children: breakdownRow(ROW2),
              },
              {
                key: 'geo',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    Geography & drilldown
                  </span>
                ),
                children: breakdownRow(ROW3),
              },
            ]}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-background px-4 py-2 sm:px-5">
          <div className="flex flex-wrap gap-2">
            <Button htmlType="button" size="small" className="gap-1.5 shadow-sm" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print
            </Button>
            <Button htmlType="button" size="small" className="shadow-sm" disabled title="CSV export is not available for this table view.">
              Export CSV
            </Button>
          </div>
          <p className="max-w-xl text-right text-xs leading-relaxed text-muted-foreground">
            {!metaLoaded && 'Loading filters…'}
            {metaLoaded && tab === 'drilldown' && 'Opens the full drilldown report for this funnel.'}
            {metaLoaded && tab !== 'drilldown' && 'Scroll horizontally if columns exceed the viewport.'}
          </p>
        </div>

        <div ref={printRef} className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-2 sm:px-5">
          {tab === 'drilldown' ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border/80 bg-muted/20 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Globe2 className="h-7 w-7" aria-hidden />
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
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading report…</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
              <DataTable
                data={rowData}
                columns={columnDefs}
                pinnedBottomRows={pinnedBottomRowData}
                getRowId={(row) => `qs-${Object.values(row).join('\u001e')}`}
                noPagination
                maxHeight="100%"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
