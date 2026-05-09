import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { Icon } from '@/components/ui-kit/icons'
import {
  Alert,
  Button,
  Card,
  DateTimeRangePicker,
  Divider,
  Field,
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
import { useTrafficSources } from '@/api/hooks/useTrafficSources'
import { queryKeys } from '@/api/queryKeys'
import { DATE_PRESETS, getPresetRange } from '@/lib/date-presets'
import { toApiDateTimeForReportingZone } from '@/lib/statsDateRange'
import { cn, getErrorMessage } from '@/lib/utils'
import type { BackgroundJobResponse, CostUpload } from '@/types/stats'
import type { KeyValuePairTreeItem } from '@/types/generated/data'
import type { TrafficSourceInfo, UpdateCostPageData } from '@/types/generated/ui'

type CostMode = 'total' | 'perEntrance'

function presetRangesDayjs(tz: string): { label: string; value: [Dayjs, Dayjs] }[] {
  return DATE_PRESETS.map((preset) => {
    const range = getPresetRange(preset.value, tz)
    return {
      label: preset.label,
      value: [dayjs(range.from), dayjs(range.to)] as [Dayjs, Dayjs],
    }
  })
}

function initialRangeForTimezone(tz: string): [Dayjs, Dayjs] {
  const range = getPresetRange('today', tz)
  return [dayjs(range.from), dayjs(range.to)]
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
  out.sort((a, b) => a.label.localeCompare(b.label))
  return out
}

export function CostUpdatePage() {
  const toast = useToastApi()
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
  const [rangeDayjs, setRangeDayjs] = useState<[Dayjs, Dayjs]>(() =>
    initialRangeForTimezone(defaultTz),
  )
  const [costMode, setCostMode] = useState<CostMode>('total')
  const [costAmountRaw, setCostAmountRaw] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rangePresets = useMemo(() => presetRangesDayjs(timezone), [timezone])

  const handleTimezoneChange = useCallback((nextTz: string) => {
    setTimezone(nextTz)
  }, [])

  const handleRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      const start = dates?.[0]
      const end = dates?.[1]
      if (start?.isValid() && end?.isValid()) {
        setRangeDayjs([start, end])
      }
    },
    [],
  )

  const handleCostModeChange = useCallback((value: string | number) => {
    if (value === 'total' || value === 'perEntrance') {
      setCostMode(value)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!idTrafficSource) {
      toast.error('Please select a traffic source')
      return
    }
    if (!costAmountRaw || Number.isNaN(Number(costAmountRaw))) {
      toast.error('Please enter a valid cost amount')
      return
    }

    const costAmount = Number(costAmountRaw)
    if (costAmount < 0) {
      toast.error('Cost must be zero or greater')
      return
    }

    const startMs = rangeDayjs[0].valueOf()
    const endMs = rangeDayjs[1].valueOf()
    if (startMs > endMs) {
      toast.error('Start must be on or before end')
      return
    }

    const fromDate = rangeDayjs[0].toDate()
    const toDate = rangeDayjs[1].toDate()
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
      const res = await api.put<BackgroundJobResponse>('/stats/update/cost/', body)
      const jobCount = res.jobIds?.length ?? 0
      toast.success(
        jobCount > 0
          ? `Queued ${jobCount} background job${jobCount === 1 ? '' : 's'}.`
          : 'Cost update submitted.',
      )
      setCostAmountRaw('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell
      title="Update Cost"
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
                  <Field
                    title="Traffic source"
                    required
                    htmlFor="cost-update-traffic-source"
                    description="Source this cost will be attributed to in reporting."
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
                  </Field>

                  <Field
                    title="Funnel"
                    htmlFor="cost-update-funnel"
                    description="Optional. Limit the cost update to one funnel; leave as “All funnels” to apply account-wide for this source."
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
                  </Field>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <Typography.Title level={5} className="mb-3 mt-0">
                    Time range
                  </Typography.Title>
                  <Field
                    title="Timezone"
                    htmlFor="cost-update-timezone"
                    description="Dates and times are interpreted in this timezone for the API."
                  >
                    <TimezoneSelect
                      id="cost-update-timezone"
                      value={timezone}
                      onChange={handleTimezoneChange}
                      className="w-full"
                      disabled={formLocked}
                    />
                  </Field>

                  <Field
                    title="From — to"
                    required
                    htmlFor="cost-update-datetime-range"
                    description="Inclusive range with date and time (same control as drilldown reports)."
                    className="mt-4"
                  >
                    <DateTimeRangePicker
                      showTime
                      allowClear={false}
                      value={rangeDayjs}
                      onChange={handleRangeChange}
                      presets={rangePresets}
                      className={cn('w-full [&_.ant-picker]:w-full', 'h-control-md')}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <Divider className="my-0" />

            <div className="space-y-5">
              <Typography.Title level={5} className="mb-0 mt-0">
                Cost
              </Typography.Title>
              <Field title="How to apply" htmlFor="cost-update-mode">
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
              </Field>
              <Field
                title={costMode === 'total' ? 'Amount (total)' : 'Amount (per entrance)'}
                required
                htmlFor="cost-update-amount"
                description={
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
              </Field>
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
                Update cost
              </Button>
            </div>
          </form>
        </Spin>
      </Card>
    </PageShell>
  )
}
