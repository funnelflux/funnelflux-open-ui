import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Input } from '@/components/ui-kit'
import { PageShell, Select, TimezoneSelect, useToastApi } from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import { useTrafficSources } from '@/api/hooks'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type {
  ApiDate,
  ApiDateTimeRange,
  BackgroundJobResponse,
  CostUpload,
} from '@/types/stats'
import type { IdName } from '@/types/entities'
import { getErrorMessage } from '@/lib/utils'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseIsoDateToApiDate(iso: string): ApiDate {
  const [yearStr, monthStr, dayStr] = iso.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!year || !month || !day) {
    throw new Error('Invalid date')
  }
  return { year, month, day }
}

function buildLocalDayRange(dateFrom: string, dateTo: string): ApiDateTimeRange {
  const startDate = parseIsoDateToApiDate(dateFrom)
  const endDate = parseIsoDateToApiDate(dateTo)
  return {
    start: { date: startDate, time: { hour: 0, minutes: 0 } },
    end: { date: endDate, time: { hour: 23, minutes: 59 } },
  }
}

export function CostUpdatePage() {
  const toast = useToastApi()
  const { data: trafficSources } = useTrafficSources()
  const { data: funnels } = useQuery({
    queryKey: [...queryKeys.funnels.all, 'list', 'prefixed-all'] as const,
    queryFn: () =>
      api
        .get<IdName[]>('/data/campaign/funnel/list/', {
          prefixWithCampaignNames: 'true',
        })
        .then((rows) =>
          rows.map((funnel) => ({
            ...funnel,
            id: String(funnel.id),
            name: funnel.name ?? '',
          })),
        ),
  })

  const trafficSourceOptions: SelectOption[] = useMemo(
    () =>
      (trafficSources ?? [])
        .filter((ts) => ts.idTrafficSource)
        .map((ts) => ({
          label: ts.trafficSourceName?.trim() || `Traffic source ${ts.idTrafficSource}`,
          value: ts.idTrafficSource,
          searchId: ts.idTrafficSource,
        })),
    [trafficSources],
  )

  const funnelOptions: SelectOption[] = useMemo(
    () => [
      { label: 'All funnels', value: '__none__' },
      ...(funnels ?? [])
        .filter((f) => f.id && f.name)
        .map((f) => ({ label: f.name, value: f.id, searchId: f.id })),
    ],
    [funnels],
  )

  const [idTrafficSource, setIdTrafficSource] = useState('')
  const [idFunnel, setIdFunnel] = useState('')
  const [dateFrom, setDateFrom] = useState(todayString())
  const [dateTo, setDateTo] = useState(todayString())
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

    let timeRange: ApiDateTimeRange
    try {
      timeRange = buildLocalDayRange(dateFrom, dateTo)
    } catch {
      toast.error('Invalid date range')
      return
    }

    if (dateFrom > dateTo) {
      toast.error('Date from must be on or before date to')
      return
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
      subtitle="Manually update cost data for a traffic source"
    >
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {/* Traffic Source */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Traffic Source *</label>
          <Select options={trafficSourceOptions} value={idTrafficSource || undefined} onChange={setIdTrafficSource} placeholder="Select traffic source" className="w-full" />
        </div>

        {/* Funnel (optional) — API field idFunnel */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Funnel (optional)</label>
          <Select options={funnelOptions} value={idFunnel || undefined} onChange={setIdFunnel} placeholder="All funnels" className="w-full" />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="date-from" className="text-sm font-medium">Date From</label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="date-to" className="text-sm font-medium">Date To</label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Timezone</label>
          <TimezoneSelect value={timezone} onChange={setTimezone} />
        </div>

        {/* Total Cost */}
        <div className="space-y-1.5">
          <label htmlFor="total-cost" className="text-sm font-medium">Total Cost *</label>
          <Input
            id="total-cost"
            type="number"
            step="0.01"
            min="0"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <Button type="primary" htmlType="submit" disabled={isSubmitting || !idTrafficSource}>
          {isSubmitting && <Icon name="loader-2" className="mr-2 h-4 w-4 animate-spin" />}
          Update Cost
        </Button>
      </form>
    </PageShell>
  )
}
