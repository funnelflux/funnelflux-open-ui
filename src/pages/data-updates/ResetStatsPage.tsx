import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
import { useCampaignsList, useTrafficSources } from '@/api/hooks'
import { api } from '@/api/client'
import { getErrorMessage } from '@/lib/utils'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ResetStatsPage() {
  const toast = useToast()
  const { data: campaigns } = useCampaignsList()
  const { data: trafficSources } = useTrafficSources()

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
    <div className="space-y-6">
      <PageHeader
        title="Reset Stats"
        subtitle="Delete statistics data for a specific date range and filters"
      />

      <div className="max-w-lg space-y-4">
        {/* Campaign */}
        <div className="space-y-1.5">
          <Label>Campaign (optional)</Label>
          <Select value={idCampaign} onValueChange={setIdCampaign}>
            <SelectTrigger>
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All campaigns</SelectItem>
              {(campaigns ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Traffic Source */}
        <div className="space-y-1.5">
          <Label>Traffic Source (optional)</Label>
          <Select value={idTrafficSource} onValueChange={setIdTrafficSource}>
            <SelectTrigger>
              <SelectValue placeholder="All traffic sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All traffic sources</SelectItem>
              {(trafficSources ?? []).map((ts) => (
                <SelectItem key={ts.idTrafficSource} value={ts.idTrafficSource}>
                  {ts.trafficSourceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-date-from">Date From</Label>
            <Input
              id="reset-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reset-date-to">Date To</Label>
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
            variant="outline"
            onClick={handleCalculate}
            disabled={isCalculating}
          >
            {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calculate
          </Button>

          <Button
            variant="destructive"
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset Statistics"
        description={`This will permanently delete ${previewCount?.toLocaleString() ?? 0} record(s). This action cannot be undone.`}
        confirmText="Delete Records"
        onConfirm={handleReset}
        isLoading={isDeleting}
      />
    </div>
  )
}
