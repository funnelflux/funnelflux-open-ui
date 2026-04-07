import { useMemo, useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Button, Input } from 'antd'
import { PageShell, ConfirmModal, SmartSelect, useToastApi } from '@/components/ui-kit'
import type { SmartSelectOption } from '@/components/ui-kit'
import { useCampaignsList, useTrafficSources } from '@/api/hooks'
import { api } from '@/api/client'
import { getErrorMessage } from '@/lib/utils'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ResetStatsPage() {
  const toast = useToastApi()
  const { data: campaigns } = useCampaignsList()
  const { data: trafficSources } = useTrafficSources()

  const campaignOptions: SmartSelectOption[] = useMemo(
    () => [
      { label: 'All campaigns', value: '__none__' },
      ...(campaigns ?? []).map((c) => ({ label: c.name, value: c.id, searchId: c.id })),
    ],
    [campaigns],
  )

  const trafficSourceOptions: SmartSelectOption[] = useMemo(
    () => [
      { label: 'All traffic sources', value: '__none__' },
      ...(trafficSources ?? []).map((ts) => ({ label: ts.trafficSourceName, value: ts.idTrafficSource, searchId: ts.idTrafficSource })),
    ],
    [trafficSources],
  )

  const [idCampaign, setIdCampaign] = useState('')
  const [idTrafficSource, setIdTrafficSource] = useState('')
  const [dateFrom, setDateFrom] = useState(todayString())
  const [dateTo, setDateTo] = useState(todayString())

  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function getFilters() {
    return {
      idCampaign: idCampaign || undefined,
      idTrafficSource: idTrafficSource || undefined,
      dateFrom,
      dateTo,
    }
  }

  async function handleCalculate() {
    setIsCalculating(true)
    setPreviewCount(null)
    try {
      const result = await api.post<{ count: number }>(
        '/ui/resetstats/calculate/',
        getFilters(),
      )
      setPreviewCount(result.count ?? 0)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsCalculating(false)
    }
  }

  async function handleReset() {
    setIsDeleting(true)
    try {
      await api.post('/ui/resetstats/delete/', getFilters())
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
      subtitle="Delete statistics data for a specific date range and filters"
    >
      <div className="max-w-lg space-y-4">
        {/* Campaign */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Campaign (optional)</label>
          <SmartSelect options={campaignOptions} value={idCampaign || undefined} onChange={setIdCampaign} placeholder="All campaigns" className="w-full" />
        </div>

        {/* Traffic Source */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Traffic Source (optional)</label>
          <SmartSelect options={trafficSourceOptions} value={idTrafficSource || undefined} onChange={setIdTrafficSource} placeholder="All traffic sources" className="w-full" />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="reset-date-from" className="text-sm font-medium">Date From</label>
            <Input
              id="reset-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reset-date-to" className="text-sm font-medium">Date To</label>
            <Input
              id="reset-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleCalculate}
            disabled={isCalculating}
          >
            {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calculate
          </Button>

          <Button
            danger type="primary"
            onClick={() => setConfirmOpen(true)}
            disabled={previewCount === null || previewCount === 0}
          >
            Reset Stats
          </Button>
        </div>

        {/* Preview Count */}
        {previewCount !== null && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>{previewCount.toLocaleString()}</strong> record{previewCount !== 1 ? 's' : ''} will be deleted.
            </span>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        title="Reset Statistics"
        description={`This will permanently delete ${previewCount?.toLocaleString() ?? 0} record(s). This action cannot be undone.`}
        confirmText="Delete Records"
        onConfirm={handleReset}
        loading={isDeleting}
        danger
      />
    </PageShell>
  )
}
