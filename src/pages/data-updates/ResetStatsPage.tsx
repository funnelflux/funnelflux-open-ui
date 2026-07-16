import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@/components/ui-kit/icons'
import {
  Alert,
  Button,
  Card,
  DateTimeRangePicker,
  FormField,
  Input,
  PageShell,
  ConfirmModal,
  Select,
  Spin,
  TimezoneSelect,
  useToastApi,
} from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import { api } from '@/api/client'
import { executeObservedRequest } from '@/api/observedRequest'
import { useTrafficSources } from '@/api/hooks/useTrafficSources'
import { invalidateAllStats } from '@/api/invalidations'
import { queryKeys } from '@/api/queryKeys'
import { DATE_PRESETS, getPresetRange } from '@/lib/date-presets'
import { toApiDateTimeForReportingZone } from '@/lib/statsDateRange'
import type { CurrentPeriod, ResetStatsOptions, ResetStatsPageData } from '@/types/generated/ui'
import type { IntegerValue } from '@/types/stats'
import { cn, getErrorMessage } from '@/lib/utils'

function buildResetStatsBody(
  dateFrom: Date,
  dateTo: Date,
  timezone: string,
  idCampaign: string,
  idFunnel: string,
  idTrafficSource: string,
  idVisitor: string,
): ResetStatsOptions {
  const currentPeriod: CurrentPeriod = {
    timeRange: {
      start: toApiDateTimeForReportingZone(dateFrom, timezone),
      end: toApiDateTimeForReportingZone(dateTo, timezone),
    },
    timeZone: { name: timezone, offset: 0 },
  }
  const body: ResetStatsOptions = { currentPeriod }
  if (idCampaign) body.idCampaign = idCampaign
  if (idFunnel) body.idFunnel = idFunnel
  if (idTrafficSource) body.idTrafficSource = idTrafficSource
  if (idVisitor) body.idVisitor = idVisitor
  return body
}

/** API may return int32 as number or numeric string (ClickHouse via PHP). */
function parseIntegerValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value))
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return 0
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return Math.max(0, Math.trunc(parsed))
  }
  return 0
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
  const queryClient = useQueryClient()
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
  const [idVisitor, setIdVisitor] = useState('')
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

  const handleVisitorIdChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setIdVisitor(event.target.value)
  }, [])

  const openConfirmModal = useCallback(() => {
    setConfirmOpen(true)
  }, [])

  const closeConfirmModal = useCallback(() => {
    setConfirmOpen(false)
  }, [])

  function getRequestBody(): ResetStatsOptions | null {
    const dateFrom = range[0]
    const dateTo = range[1]
    if (!dateFrom || !dateTo || dateFrom.getTime() > dateTo.getTime()) return null
    try {
      return buildResetStatsBody(
        dateFrom,
        dateTo,
        timezone,
        idCampaign,
        idFunnel,
        idTrafficSource,
        idVisitor,
      )
    } catch {
      return null
    }
  }

  async function handleCalculate() {
    const body = getRequestBody()
    if (!body) {
      toast.error('Invalid date range')
      return
    }
    setIsCalculating(true)
    setPreviewCount(null)
    try {
      const result = await executeObservedRequest(queryClient, () =>
        api.post<IntegerValue>('/ui/resetstats/calculate/', body),
      )
      setPreviewCount(parseIntegerValue(result.value))
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsCalculating(false)
    }
  }

  async function handleReset() {
    const body = getRequestBody()
    if (!body) {
      toast.error('Invalid date range')
      return
    }
    setIsDeleting(true)
    try {
      await executeObservedRequest(queryClient, () =>
        api.delete('/ui/resetstats/delete/', undefined, body),
      )
      toast.success('Stats reset successfully')
      setPreviewCount(null)
      closeConfirmModal()
      void invalidateAllStats(queryClient)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <PageShell
      title="Reset Stats"
      subtitle="Delete statistics data for a date-time range. Optional filters narrow scope (campaign, funnel, traffic source, visitor ID)."
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
                <FormField
                  label="Campaign"
                  htmlFor="reset-stats-campaign"
                  help="Optional. Narrow available funnels and scope by campaign."
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
                </FormField>

                <FormField
                  label="Funnel"
                  htmlFor="reset-stats-funnel"
                  help="Optional. Leave empty for all funnels (optionally scoped by campaign)."
                >
                  <Select
                    id="reset-stats-funnel"
                    options={funnelOptions}
                    value={idFunnel || undefined}
                    onChange={setIdFunnel}
                    placeholder={pageLoading ? 'Loading…' : 'All funnels'}
                    className="w-full"
                    disabled={formLocked || funnelOptions.length === 0}
                    allowClear
                  />
                </FormField>

                <FormField
                  label="Traffic source"
                  htmlFor="reset-stats-traffic-source"
                  help="Optional. Limit to one traffic source."
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
                </FormField>
              </div>

              <FormField
                label="Visitor ID"
                htmlFor="reset-stats-visitor-id"
                help="Optional. Restrict reset to a single visitor ID."
              >
                <Input
                  id="reset-stats-visitor-id"
                  value={idVisitor}
                  onChange={handleVisitorIdChange}
                  placeholder="Specific visitor ID…"
                  className="w-full max-w-md"
                  disabled={formLocked}
                />
              </FormField>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]">
                <FormField
                  label="Date-time range"
                  required
                  htmlFor="reset-stats-datetime-range"
                  help="Start and end are interpreted in the selected timezone."
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
                </FormField>

                <FormField
                  label="Timezone"
                  htmlFor="reset-stats-timezone"
                  help="Interprets the date range in this timezone (same as reporting)."
                >
                  <TimezoneSelect
                    id="reset-stats-timezone"
                    value={timezone}
                    onChange={setTimezone}
                    className="w-full"
                    disabled={formLocked}
                  />
                </FormField>
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
                disabled={previewCount === null || previewCount === 0 || formLocked}
              >
                Reset Stats
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
