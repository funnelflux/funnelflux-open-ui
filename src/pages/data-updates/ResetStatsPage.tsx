import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui-kit/icons'
import {
  Alert,
  Button,
  Card,
  DateTimeRangePicker,
  Field,
  PageShell,
  ConfirmModal,
  Select,
  Spin,
  TimezoneSelect,
  useToastApi,
} from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import { api } from '@/api/client'
import { useTrafficSources } from '@/api/hooks/useTrafficSources'
import { queryKeys } from '@/api/queryKeys'
import { DATE_PRESETS, getPresetRange } from '@/lib/date-presets'
import { toApiDateTimeForReportingZone } from '@/lib/statsDateRange'
import type { CurrentPeriod, ResetStatsPageData } from '@/types/generated/ui'
import type { IntegerValue } from '@/types/stats'
import { cn, getErrorMessage } from '@/lib/utils'

/** Matches PHP `ResetStatsOptions` (includes `idCampaign` used by the server; omitted from OpenAPI stub). */
type ResetStatsRequestBody = {
  currentPeriod: CurrentPeriod
  idFunnel: string
  idCampaign?: string
  idTrafficSource?: string
}

function buildResetStatsBody(
  dateFrom: Date,
  dateTo: Date,
  timezone: string,
  idFunnel: string,
  idCampaign: string,
  idTrafficSource: string,
): ResetStatsRequestBody {
  const currentPeriod: CurrentPeriod = {
    timeRange: {
      start: toApiDateTimeForReportingZone(dateFrom, timezone),
      end: toApiDateTimeForReportingZone(dateTo, timezone),
    },
    timeZone: { name: timezone, offset: 0 },
  }
  const body: ResetStatsRequestBody = { currentPeriod, idFunnel }
  if (idCampaign) body.idCampaign = idCampaign
  if (idTrafficSource) body.idTrafficSource = idTrafficSource
  return body
}

function initialRangeForTimezone(timezone: string): [Date, Date] {
  const range = getPresetRange('today', timezone)
  return [range.from, range.to]
}

function presetRanges(tz: string): { label: string; value: [Date, Date] }[] {
  return DATE_PRESETS.map((preset) => {
    const range = getPresetRange(preset.value, tz)
    return {
      label: preset.label,
      value: [range.from, range.to],
    }
  })
}

function normalizeTrafficSourceRow(row: Record<string, unknown>): {
  id: string
  name: string
} | null {
  const rawId = row.id ?? row.idTrafficSource
  const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : ''
  if (!id) return null
  const rawName = row.name
  const name =
    typeof rawName === 'string' && rawName.trim() !== ''
      ? rawName.trim()
      : `Traffic source ${id}`
  return { id, name }
}

export function ResetStatsPage() {
  const toast = useToastApi()
  const {
    data: pageData,
    isPending: pageLoading,
    isError: pageError,
    error: pageErr,
    isSuccess: pageSuccess,
  } = useQuery({
    queryKey: queryKeys.dataUpdates.resetStatsPage(),
    queryFn: () => api.get<ResetStatsPageData>('/ui/resetstats/load/'),
  })
  const { data: trafficSourcesFromDataApi } = useTrafficSources()

  const campaignOptions = useMemo(() => {
    const tree = pageData?.availableCampaignsAndFunnels ?? []
    const rows: SelectOption[] = []
    for (const c of tree) {
      const rawKey = c.item?.key
      if (rawKey === undefined || rawKey === null || rawKey === '') continue
      const value = String(rawKey)
      const name = String(c.item?.value ?? '').trim()
      rows.push({
        label: name || `Campaign ${value}`,
        value,
        searchId: value,
      })
    }
    return rows
  }, [pageData])

  const funnelOptionsByCampaign = useMemo(() => {
    const tree = pageData?.availableCampaignsAndFunnels ?? []
    const byCampaign = new Map<string, SelectOption[]>()
    const allFunnels: SelectOption[] = []
    for (const campaign of tree) {
      const campaignIdRaw = campaign.item?.key
      if (campaignIdRaw === undefined || campaignIdRaw === null || campaignIdRaw === '') {
        continue
      }
      const campaignId = String(campaignIdRaw)
      const campaignName = String(campaign.item?.value ?? '').trim()
      const campaignFunnels: SelectOption[] = []
      for (const funnel of campaign.children ?? []) {
        const funnelIdRaw = funnel.item?.key
        if (funnelIdRaw === undefined || funnelIdRaw === null || funnelIdRaw === '') {
          continue
        }
        const funnelId = String(funnelIdRaw)
        const funnelName = String(funnel.item?.value ?? '').trim()
        const option: SelectOption = {
          label: funnelName || `Funnel ${funnelId}`,
          value: funnelId,
          searchId: `${funnelId} ${campaignName}`,
        }
        campaignFunnels.push(option)
        allFunnels.push(option)
      }
      byCampaign.set(campaignId, campaignFunnels)
    }
    return { byCampaign, allFunnels }
  }, [pageData])

  const trafficSourceOptions: SelectOption[] = useMemo(() => {
    const byId = new Map<string, SelectOption>()
    for (const row of pageData?.availableTrafficSources ?? []) {
      const normalized = normalizeTrafficSourceRow(row as unknown as Record<string, unknown>)
      if (!normalized) continue
      byId.set(normalized.id, {
        label: normalized.name,
        value: normalized.id,
        searchId: normalized.id,
      })
    }
    for (const row of trafficSourcesFromDataApi ?? []) {
      const id = row.idTrafficSource?.trim()
      if (!id || byId.has(id)) continue
      const name = row.trafficSourceName?.trim() || `Traffic source ${id}`
      byId.set(id, {
        label: name,
        value: id,
        searchId: id,
      })
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [pageData, trafficSourcesFromDataApi])

  const formLocked = pageLoading || pageError
  const noTrafficSources =
    pageSuccess && !pageLoading && trafficSourceOptions.length === 0

  const [idCampaign, setIdCampaign] = useState('')
  const [idFunnel, setIdFunnel] = useState('')
  const [idTrafficSource, setIdTrafficSource] = useState('')
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [range, setRange] = useState<[Date, Date]>(() =>
    initialRangeForTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone),
  )
  const rangePresets = useMemo(() => presetRanges(timezone), [timezone])

  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const funnelOptions = useMemo(() => {
    if (!idCampaign) return funnelOptionsByCampaign.allFunnels
    return funnelOptionsByCampaign.byCampaign.get(idCampaign) ?? []
  }, [idCampaign, funnelOptionsByCampaign])

  const handleCampaignChange = useCallback(
    (nextCampaignId: string) => {
      setIdCampaign(nextCampaignId)
      if (!nextCampaignId) return
      const allowedFunnels = funnelOptionsByCampaign.byCampaign.get(nextCampaignId) ?? []
      if (allowedFunnels.every((option) => option.value !== idFunnel)) {
        setIdFunnel('')
      }
    },
    [funnelOptionsByCampaign, idFunnel],
  )

  const handleRangeChange = useCallback(
    (dates: [Date | null, Date | null] | null) => {
      const start = dates?.[0]
      const end = dates?.[1]
      if (!start || !end) return
      setRange([start, end])
    },
    [],
  )

  const openConfirmModal = useCallback(() => {
    setConfirmOpen(true)
  }, [])

  const closeConfirmModal = useCallback(() => {
    setConfirmOpen(false)
  }, [])

  function getRequestBody(): ResetStatsRequestBody | null {
    if (!idFunnel) return null
    const dateFrom = range[0]
    const dateTo = range[1]
    if (!dateFrom || !dateTo || dateFrom.getTime() > dateTo.getTime()) return null
    try {
      return buildResetStatsBody(
        dateFrom,
        dateTo,
        timezone,
        idFunnel,
        idCampaign,
        idTrafficSource,
      )
    } catch {
      return null
    }
  }

  async function handleCalculate() {
    if (!idFunnel) {
      toast.error('Please select a funnel')
      return
    }
    const body = getRequestBody()
    if (!body) {
      toast.error('Invalid date range')
      return
    }
    setIsCalculating(true)
    setPreviewCount(null)
    try {
      const result = await api.post<IntegerValue>('/ui/resetstats/calculate/', body)
      setPreviewCount(
        typeof result.value === 'number' && Number.isFinite(result.value) ? result.value : 0,
      )
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsCalculating(false)
    }
  }

  async function handleReset() {
    if (!idFunnel) {
      toast.error('Please select a funnel')
      return
    }
    const body = getRequestBody()
    if (!body) {
      toast.error('Invalid date range')
      return
    }
    setIsDeleting(true)
    try {
      await api.delete('/ui/resetstats/delete/', undefined, body)
      toast.success('Stats reset successfully')
      setPreviewCount(null)
      closeConfirmModal()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <PageShell
      title="Reset Stats"
      subtitle="Delete statistics data for a date-time range. Funnel is required; other filters narrow scope."
    >
      <Card className="ff-analytics-panel max-w-4xl border-border-strong" styles={{ body: { padding: 24 } }}>
        {pageError && (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Could not load filter options"
            description={getErrorMessage(pageErr)}
          />
        )}
        {noTrafficSources && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="No traffic sources available"
            description="There are no traffic sources in the account, or the list could not be built."
          />
        )}

        <Spin spinning={pageLoading}>
          <div className="space-y-6">
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-3">
                <Field
                  title="Campaign"
                  htmlFor="reset-stats-campaign"
                  description="Optional. Narrow available funnels and scope by campaign."
                >
                  <Select
                    id="reset-stats-campaign"
                    options={campaignOptions}
                    value={idCampaign || undefined}
                    onChange={handleCampaignChange}
                    placeholder={pageLoading ? 'Loading…' : 'All campaigns'}
                    className="w-full"
                    disabled={formLocked}
                    allowClear
                  />
                </Field>

                <Field
                  title="Funnel"
                  required
                  htmlFor="reset-stats-funnel"
                  description="Required. Select the funnel to reset stats for."
                >
                  <Select
                    id="reset-stats-funnel"
                    options={funnelOptions}
                    value={idFunnel || undefined}
                    onChange={setIdFunnel}
                    placeholder={pageLoading ? 'Loading…' : 'Select funnel'}
                    className="w-full"
                    disabled={formLocked || funnelOptions.length === 0}
                  />
                </Field>

                <Field
                  title="Traffic source"
                  htmlFor="reset-stats-traffic-source"
                  description="Optional. Limit to one traffic source."
                >
                  <Select
                    id="reset-stats-traffic-source"
                    options={trafficSourceOptions}
                    value={idTrafficSource || undefined}
                    onChange={setIdTrafficSource}
                    placeholder={pageLoading ? 'Loading…' : 'All traffic sources'}
                    className="w-full"
                    disabled={formLocked || noTrafficSources}
                    allowClear
                  />
                </Field>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
                <Field
                  title="Date-time range"
                  required
                  htmlFor="reset-stats-datetime-range"
                  description="Start and end are interpreted in the selected timezone."
                >
                  <DateTimeRangePicker
                    showTime
                    autoConfirmCalendarSteps={false}
                    allowClear={false}
                    value={range}
                    onChange={handleRangeChange}
                    presets={rangePresets}
                    className={cn('w-full [&_.ant-picker]:w-full', 'h-control-md')}
                  />
                </Field>

                <Field
                  title="Timezone"
                  htmlFor="reset-stats-timezone"
                  description="Interprets the date range in this timezone (same as reporting)."
                >
                  <TimezoneSelect
                    id="reset-stats-timezone"
                    value={timezone}
                    onChange={setTimezone}
                    className="w-full"
                    disabled={formLocked}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button onClick={handleCalculate} disabled={isCalculating || formLocked}>
                {isCalculating && (
                  <span className="mr-2 inline-flex">
                    <Icon name="loader-2" size="md" animation="spin" />
                  </span>
                )}
                Calculate
              </Button>

              <Button
                danger
                type="primary"
                onClick={openConfirmModal}
                disabled={previewCount === null || previewCount === 0 || formLocked || !idFunnel}
              >
                Reset stats
              </Button>
            </div>

            {previewCount !== null && (
              <Alert
                type="warning"
                showIcon
                message={`${previewCount.toLocaleString()} record${previewCount !== 1 ? 's' : ''} will be deleted`}
                description="Confirm below to permanently remove these statistics. This cannot be undone."
              />
            )}
          </div>
        </Spin>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        onCancel={closeConfirmModal}
        title="Reset statistics"
        description={`This will permanently delete ${previewCount?.toLocaleString() ?? 0} record(s). This action cannot be undone.`}
        confirmText="Delete records"
        onConfirm={handleReset}
        loading={isDeleting}
        danger
      />
    </PageShell>
  )
}
