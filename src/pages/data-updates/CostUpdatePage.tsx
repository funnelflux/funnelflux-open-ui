import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui-kit/icons'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Field,
  Input,
  PageShell,
  Select,
  Spin,
  TimezoneSelect,
  useToastApi,
} from '@/components/ui-kit'
import type { ReportingDayMeta, SelectOption } from '@/components/ui-kit'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { BackgroundJobResponse, CostUpload } from '@/types/stats'
import type { KeyValuePairTreeItem } from '@/types/generated/data'
import type { UpdateCostPageData } from '@/types/generated/ui'
import { cn, getErrorMessage } from '@/lib/utils'

const DATE_FMT = 'YYYY-MM-DD'

function localCalendarReportingDay(): ReportingDayMeta {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const dayN = d.getDate()
  const ymd = `${y}-${String(m).padStart(2, '0')}-${String(dayN).padStart(2, '0')}`
  return { ymd, apiDate: { year: y, month: m, day: dayN } }
}

/** Funnels from update-cost page tree: campaign name — funnel name (same permission as cost update). */
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

  const trafficSourceOptions: SelectOption[] = useMemo(() => {
    const rows = costPageData?.availableTrafficSources ?? []
    return rows
      .filter((ts) => ts.id)
      .map((ts) => ({
        label: ts.name?.trim() || `Traffic source ${ts.id}`,
        value: ts.id,
        searchId: ts.id,
      }))
  }, [costPageData])

  const funnelOptions: SelectOption[] = useMemo(() => {
    const tree = costPageData?.availableCampaignsAndFunnels ?? []
    return [{ label: 'All funnels', value: '__none__' }, ...funnelOptionsFromCampaignTree(tree)]
  }, [costPageData])

  const formLocked = costPageLoading || costPageError
  const noTrafficSources =
    costPageSuccess && !costPageLoading && trafficSourceOptions.length === 0

  const [idTrafficSource, setIdTrafficSource] = useState('')
  const [idFunnel, setIdFunnel] = useState('')
  const [dateFromDay, setDateFromDay] = useState(() => localCalendarReportingDay())
  const [dateToDay, setDateToDay] = useState(() => localCalendarReportingDay())
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [totalCost, setTotalCost] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!idTrafficSource) {
      toast.error('Please select a traffic source')
      return
    }
    if (!totalCost || Number.isNaN(Number(totalCost))) {
      toast.error('Please enter a valid cost amount')
      return
    }

    const costAmount = Number(totalCost)
    if (costAmount < 0) {
      toast.error('Cost must be zero or greater')
      return
    }

    if (dateFromDay.ymd > dateToDay.ymd) {
      toast.error('Date from must be on or before date to')
      return
    }
    const timeRange = {
      start: { date: dateFromDay.apiDate, time: { hour: 0, minutes: 0 } },
      end: { date: dateToDay.apiDate, time: { hour: 23, minutes: 59 } },
    }
    const body: CostUpload = {
      idTrafficSource,
      ...(idFunnel && idFunnel !== '__none__' ? { idFunnel } : {}),
      timeRange,
      timeZone: { name: timezone, offset: 0 },
      costSegments: [
        {
          cost: costAmount,
          costType: 'costForWholeSegment',
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
      setTotalCost('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell
      title="Update Cost"
      subtitle="Manually update cost data for a traffic source over a date range."
    >
      <Card className="max-w-lg border-border" styles={{ body: { padding: 24 } }}>
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
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                title="Date from"
                required
                htmlFor="cost-update-date-from"
                description="Start of range (inclusive)."
              >
                <DatePicker
                  id="cost-update-date-from"
                  className={cn('w-full h-control-md')}
                  format={DATE_FMT}
                  reportingValue={dateFromDay}
                  onChange={(_d, _s, reporting) => {
                    if (reporting) setDateFromDay(reporting)
                  }}
                  allowClear={false}
                  disabled={formLocked}
                />
              </Field>
              <Field
                title="Date to"
                required
                htmlFor="cost-update-date-to"
                description="End of range (inclusive)."
              >
                <DatePicker
                  id="cost-update-date-to"
                  className={cn('w-full h-control-md')}
                  format={DATE_FMT}
                  reportingValue={dateToDay}
                  onChange={(_d, _s, reporting) => {
                    if (reporting) setDateToDay(reporting)
                  }}
                  allowClear={false}
                  disabled={formLocked}
                />
              </Field>
            </div>

            <Field
              title="Timezone"
              htmlFor="cost-update-timezone"
              description="Used with the date range to align days with your reporting timezone."
            >
              <TimezoneSelect
                id="cost-update-timezone"
                value={timezone}
                onChange={setTimezone}
                className="w-full"
                disabled={formLocked}
              />
            </Field>

            <Field
              title="Total cost"
              required
              htmlFor="cost-update-total"
              description="Total spend for the selected source (and funnel, if any) across the date range."
            >
              <Input
                id="cost-update-total"
                type="number"
                step="0.01"
                min="0"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="0.00"
                disabled={formLocked}
                className="w-full"
              />
            </Field>

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
