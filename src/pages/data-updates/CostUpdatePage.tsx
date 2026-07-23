import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  format,
  getHours,
  getMinutes,
  isSameMinute,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { Icon } from '@/components/ui-kit/icons'
import {
  Alert,
  Button,
  Card,
  ConfirmModal,
  DateTimeRangePicker,
  Divider,
  FormField,
  Input,
  PageShell,
  Segmented,
  Select,
  Spin,
  TimezoneSelect,
  Typography,
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
import { cn, getErrorMessage } from '@/lib/utils'
import type { BackgroundJobResponse, CostUpload } from '@/types/stats'
import type { KeyValuePairTreeItem } from '@/types/generated/data'
import type { TrafficSourceInfo, UpdateCostPageData } from '@/types/generated/ui'

type CostMode = 'total' | 'perEntrance'

function presetRanges(tz: string): { label: string; value: [Date, Date] }[] {
  return DATE_PRESETS.map((preset) => {
    const range = getPresetRange(preset.value, tz)
    return {
      label: preset.label,
      value: [range.from, range.to],
    }
  })
}

function initialRangeForTimezone(tz: string): [Date, Date] {
  const range = getPresetRange('today', tz)
  return [range.from, range.to]
}

/** Traffic sources from BFF may be empty or keys may vary; merge with data API list. */
function normalizeTrafficSourceRow(row: TrafficSourceInfo | Record<string, unknown>): {
  id: string
  name: string
} | null {
  const anyRow = row as Record<string, unknown>
  const rawId = anyRow.id ?? anyRow.idTrafficSource
  const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : ''
  if (!id) return null
  const nameRaw = anyRow.name
  const name =
    typeof nameRaw === 'string' && nameRaw.trim() !== ''
      ? nameRaw.trim()
      : `Traffic source ${id}`
  return { id, name }
}

/** Funnels from update-cost page tree: campaign name — funnel name. */
function funnelOptionsFromCampaignTree(tree: KeyValuePairTreeItem[]): SelectOption[] {
  const out: SelectOption[] = []
  for (const campaign of tree) {
    const campaignName = campaign.item.value
    for (const funnel of campaign.children ?? []) {
      const id = funnel.item.key
      const name = funnel.item.value
      if (!id || !name) continue
      out.push({
        label: `${campaignName} — ${name}`,
        value: id,
        searchId: id,
      })
    }
  }
  return out
}

export function CostUpdatePage() {
  const toast = useToastApi()
  const queryClient = useQueryClient()
  const {
    data: costPageData,
    isError: costPageError,
    error: costPageErr,
    isLoading: costPageLoading,
    isSuccess: costPageSuccess,
  } = useQuery({
    queryKey: queryKeys.dataUpdates.updateCostPage(),
    queryFn: () => api.get<UpdateCostPageData>('/ui/updatecost/load/'),
  })

  const { data: trafficSourcesFromDataApi } = useTrafficSources()

  const trafficSourceOptions: SelectOption[] = useMemo(() => {
    const byId = new Map<string, SelectOption>()
    for (const row of costPageData?.availableTrafficSources ?? []) {
      const normalized = normalizeTrafficSourceRow(row)
      if (!normalized) continue
      byId.set(normalized.id, {
        label: normalized.name,
        value: normalized.id,
        searchId: normalized.id,
      })
    }
    for (const entity of trafficSourcesFromDataApi ?? []) {
      const id = entity.idTrafficSource?.trim()
      if (!id || byId.has(id)) continue
      const name =
        entity.trafficSourceName?.trim() || `Traffic source ${id}`
      byId.set(id, { label: name, value: id, searchId: id })
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [costPageData, trafficSourcesFromDataApi])

  const funnelOptions: SelectOption[] = useMemo(() => {
    const tree = costPageData?.availableCampaignsAndFunnels ?? []
    return [{ label: 'All funnels', value: '__none__' }, ...funnelOptionsFromCampaignTree(tree)]
  }, [costPageData])

  const formLocked = costPageLoading || costPageError
  const noTrafficSources =
    costPageSuccess && !costPageLoading && trafficSourceOptions.length === 0

  const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [idTrafficSource, setIdTrafficSource] = useState('')
  const [idFunnel, setIdFunnel] = useState('')
  const [timezone, setTimezone] = useState(defaultTz)
  const [range, setRange] = useState<[Date, Date]>(() =>
    initialRangeForTimezone(defaultTz),
  )
  const [costMode, setCostMode] = useState<CostMode>('total')
  const [costAmountRaw, setCostAmountRaw] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const rangePresets = useMemo(() => presetRanges(timezone), [timezone])

  const handleTimezoneChange = useCallback((nextTz: string) => {
    setTimezone(nextTz)
  }, [])

  const handleRangeChange = useCallback(
    (dates: [Date | null, Date | null] | null) => {
      const start = dates?.[0]
      const end = dates?.[1]
      if (!start || !end) return

      let endAdjusted = end
      if (
        isSameMinute(start, end) &&
        getHours(start) === 0 &&
        getMinutes(start) === 0
      ) {
        endAdjusted = setMilliseconds(setSeconds(setMinutes(setHours(start, 23), 59), 59), 999)
      }
      setRange([start, endAdjusted])
    },
    [],
  )

  const handleCostModeChange = useCallback((value: string | number) => {
    if (value === 'total' || value === 'perEntrance') {
      setCostMode(value)
    }
  }, [])

  /** Validate, then ask for confirmation — this rewrites historical cost data. */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!idTrafficSource) {
      toast.error('Please select a traffic source')
      return
    }
    if (!costAmountRaw || Number.isNaN(Number(costAmountRaw))) {
      toast.error('Please enter a valid cost amount')
      return
    }
    if (Number(costAmountRaw) < 0) {
      toast.error('Cost must be zero or greater')
      return
    }
    if (range[0].getTime() > range[1].getTime()) {
      toast.error('Start must be on or before end')
      return
    }

    setConfirmOpen(true)
  }

  async function submitCostUpdate() {
    const costAmount = Number(costAmountRaw)
    const [fromDate, toDate] = range
    const timeRange = {
      start: toApiDateTimeForReportingZone(fromDate, timezone),
      end: toApiDateTimeForReportingZone(toDate, timezone),
    }
    const costType =
      costMode === 'total' ? 'costForWholeSegment' : 'costPerEntrance'

    const body: CostUpload = {
      idTrafficSource,
      ...(idFunnel && idFunnel !== '__none__' ? { idFunnel } : {}),
      timeRange,
      timeZone: { name: timezone, offset: 0 },
      costSegments: [
        {
          cost: costAmount,
          costType,
          applyToFilteredTraffic: false,
        },
      ],
      notificationWhenComplete: false,
    }

    setIsSubmitting(true)
    try {
      const res = await executeObservedRequest(queryClient, () =>
        api.put<BackgroundJobResponse>('/stats/update/cost/', body),
      )
      const jobCount = res.jobIds?.length ?? 0
      toast.success(
        jobCount > 0
          ? `Queued ${jobCount} background job${jobCount === 1 ? '' : 's'}.`
          : 'Cost update submitted.',
      )
      setCostAmountRaw('')
      setConfirmOpen(false)
      void invalidateAllStats(queryClient)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatInReportingZone = (d: Date) =>
    format(new TZDate(d.getTime(), timezone), 'yyyy-MM-dd HH:mm')

  const confirmTrafficSourceLabel =
    trafficSourceOptions.find((option) => option.value === idTrafficSource)?.label ??
    idTrafficSource
  const confirmFunnelLabel =
    idFunnel && idFunnel !== '__none__'
      ? funnelOptions.find((option) => option.value === idFunnel)?.label ?? idFunnel
      : 'All funnels'
  const confirmDescription =
    `This retroactively rewrites historical cost data and cannot be undone. ` +
    `Traffic source: ${confirmTrafficSourceLabel}. Funnel: ${confirmFunnelLabel}. ` +
    `Range: ${formatInReportingZone(range[0])} to ${formatInReportingZone(range[1])} (${timezone}). ` +
    `Cost: ${costAmountRaw || '0'} ${costMode === 'total' ? 'total across the range' : 'per entrance'}.`

  return (
    <PageShell
      title="Cost Updates"
      subtitle="Manually update cost data for a traffic source over a date and time range."
    >
      <Card className="max-w-4xl border-border" styles={{ body: { padding: 24 } }}>
        {costPageError && (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Could not load form options"
            description={getErrorMessage(costPageErr)}
          />
        )}
        {noTrafficSources && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="No traffic sources available"
            description="There are no traffic sources to assign cost to, or your account has no sources yet."
          />
        )}

        <Spin spinning={costPageLoading}>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <Typography.Title level={5} className="mb-3 mt-0">
                    Scope
                  </Typography.Title>
                  <FormField
                    label="Traffic source"
                    required
                    htmlFor="cost-update-traffic-source"
                    help="Source this cost will be attributed to in reporting."
                  >
                    <Select
                      id="cost-update-traffic-source"
                      options={trafficSourceOptions}
                      value={idTrafficSource || undefined}
                      onChange={setIdTrafficSource}
                      placeholder={costPageLoading ? 'Loading…' : 'Select traffic source'}
                      className="w-full"
                      disabled={formLocked || noTrafficSources}
                    />
                  </FormField>

                  <FormField
                    label="Funnel"
                    htmlFor="cost-update-funnel"
                    help="Optional. Limit the cost update to one funnel; leave as “All funnels” to apply account-wide for this source."
                    className="mt-4"
                  >
                    <Select
                      id="cost-update-funnel"
                      options={funnelOptions}
                      value={idFunnel || undefined}
                      onChange={setIdFunnel}
                      placeholder="All funnels"
                      className="w-full"
                      disabled={formLocked}
                    />
                  </FormField>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <Typography.Title level={5} className="mb-3 mt-0">
                    Time range
                  </Typography.Title>
                  <FormField
                    label="Timezone"
                    htmlFor="cost-update-timezone"
                    help="Dates and times are interpreted in this timezone for the API."
                  >
                    <TimezoneSelect
                      id="cost-update-timezone"
                      value={timezone}
                      onChange={handleTimezoneChange}
                      className="w-full"
                      disabled={formLocked}
                    />
                  </FormField>

                  <FormField
                    label="From — to"
                    required
                    htmlFor="cost-update-datetime-range"
                    help="Inclusive range with date and time. Presets apply in one step; if you pick dates in the calendar, confirm with OK. (Auto-advance is off here so presets stay reliable.)"
                    className="mt-4"
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
                </div>
              </div>
            </div>

            <Divider className="my-0" />

            <div className="space-y-5">
              <Typography.Title level={5} className="mb-0 mt-0">
                Cost
              </Typography.Title>
              <FormField label="How to apply" htmlFor="cost-update-mode">
                <Segmented
                  id="cost-update-mode"
                  block
                  value={costMode}
                  onChange={handleCostModeChange}
                  disabled={formLocked}
                  options={[
                    { label: 'Total cost', value: 'total' },
                    { label: 'Cost per entrance', value: 'perEntrance' },
                  ]}
                />
              </FormField>
              <FormField
                label={costMode === 'total' ? 'Amount (total)' : 'Amount (per entrance)'}
                required
                htmlFor="cost-update-amount"
                help={
                  costMode === 'total'
                    ? 'Total spend for the selected source (and funnel, if any) across the range.'
                    : 'Fixed cost applied to each entrance in the range.'
                }
              >
                <Input
                  id="cost-update-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costAmountRaw}
                  onChange={(e) => setCostAmountRaw(e.target.value)}
                  placeholder="0.00"
                  disabled={formLocked}
                  className="w-full max-w-md"
                />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="primary"
                htmlType="submit"
                disabled={isSubmitting || !idTrafficSource || formLocked || noTrafficSources}
              >
                {isSubmitting && (
                  <span className="mr-2 inline-flex">
                    <Icon name="loader-2" size="md" animation="spin" />
                  </span>
                )}
                Update Cost
              </Button>
            </div>
          </form>
        </Spin>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        title="Update historical cost"
        description={confirmDescription}
        confirmText="Update Cost"
        onConfirm={() => void submitCostUpdate()}
        loading={isSubmitting}
        danger
      />
    </PageShell>
  )
}
