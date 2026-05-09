import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/ui-kit/icons'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Field,
  PageShell,
  ConfirmModal,
  Spin,
  TimezoneSelect,
  useToastApi,
  VirtualizedMultiSelect,
} from '@/components/ui-kit'
import type { ReportingDayMeta, SelectOption } from '@/components/ui-kit'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import type { CurrentPeriod, ResetStatsPageData } from '@/types/generated/ui'
import type { IntegerValue } from '@/types/stats'
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

/** Matches PHP `ResetStatsOptions` (includes `idCampaign` used by the server; omitted from OpenAPI stub). */
type ResetStatsRequestBody = {
  currentPeriod: CurrentPeriod
  idCampaign?: string
  idTrafficSource?: string
}

function buildResetStatsBody(
  dateFromDay: ReportingDayMeta,
  dateToDay: ReportingDayMeta,
  timezone: string,
  campaignIds: string[],
  trafficSourceIds: string[],
): ResetStatsRequestBody {
  const currentPeriod: CurrentPeriod = {
    timeRange: {
      start: { date: dateFromDay.apiDate, time: { hour: 0, minutes: 0 } },
      end: { date: dateToDay.apiDate, time: { hour: 23, minutes: 59 } },
    },
    timeZone: { name: timezone, offset: 0 },
  }
  const body: ResetStatsRequestBody = { currentPeriod }
  if (campaignIds.length === 1) body.idCampaign = campaignIds[0]
  if (trafficSourceIds.length === 1) body.idTrafficSource = trafficSourceIds[0]
  return body
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

  const campaignOptions: SelectOption[] = useMemo(() => {
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

  const trafficSourceOptions: SelectOption[] = useMemo(() => {
    const rows = pageData?.availableTrafficSources ?? []
    return rows
      .filter((ts) => ts.id)
      .map((ts) => ({
        label: ts.name?.trim() || `Traffic source ${ts.id}`,
        value: ts.id,
        searchId: ts.id,
      }))
  }, [pageData])

  const formLocked = pageLoading || pageError
  const noTrafficSources =
    pageSuccess && !pageLoading && trafficSourceOptions.length === 0

  const [campaignIds, setCampaignIds] = useState<string[]>([])
  const [trafficSourceIds, setTrafficSourceIds] = useState<string[]>([])
  const [dateFromDay, setDateFromDay] = useState(() => localCalendarReportingDay())
  const [dateToDay, setDateToDay] = useState(() => localCalendarReportingDay())
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  )

  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function getRequestBody(): ResetStatsRequestBody | null {
    if (dateFromDay.ymd > dateToDay.ymd) return null
    try {
      return buildResetStatsBody(
        dateFromDay,
        dateToDay,
        timezone,
        campaignIds,
        trafficSourceIds,
      )
    } catch {
      return null
    }
  }

  async function handleCalculate() {
    if (dateFromDay.ymd > dateToDay.ymd) {
      toast.error('Date from must be on or before date to')
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
    if (dateFromDay.ymd > dateToDay.ymd) {
      toast.error('Date from must be on or before date to')
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
      setConfirmOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <PageShell
      title="Reset Stats"
      subtitle="Delete statistics data for a date range. Optional filters limit the scope."
    >
      <Card className="max-w-lg border-border" styles={{ body: { padding: 24 } }}>
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
          <div className="space-y-5">
            <Field
              title="Campaign"
              htmlFor="reset-stats-campaign"
              description="Optional. Only a single chosen campaign narrows deletion; leave empty or select several for unrestricted scope."
            >
              <VirtualizedMultiSelect
                id="reset-stats-campaign"
                options={campaignOptions}
                value={campaignIds}
                onChange={setCampaignIds}
                placeholder={
                  pageLoading ? 'Loading…' : 'Search campaigns (optional)'
                }
                className="w-full"
                disabled={formLocked}
                selectAll
              />
            </Field>

            <Field
              title="Traffic source"
              htmlFor="reset-stats-traffic-source"
              description="Optional. Only one chosen traffic source narrows deletion; leave empty or select several for unrestricted scope."
            >
              <VirtualizedMultiSelect
                id="reset-stats-traffic-source"
                options={trafficSourceOptions}
                value={trafficSourceIds}
                onChange={setTrafficSourceIds}
                placeholder={
                  pageLoading
                    ? 'Loading…'
                    : 'Search traffic sources (optional)'
                }
                className="w-full"
                disabled={formLocked || noTrafficSources}
                selectAll
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                title="Date from"
                required
                htmlFor="reset-stats-date-from"
                description="Start of range (inclusive)."
              >
                <DatePicker
                  id="reset-stats-date-from"
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
                htmlFor="reset-stats-date-to"
                description="End of range (inclusive)."
              >
                <DatePicker
                  id="reset-stats-date-to"
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
                onClick={() => setConfirmOpen(true)}
                disabled={previewCount === null || previewCount === 0 || formLocked}
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
        onCancel={() => setConfirmOpen(false)}
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
