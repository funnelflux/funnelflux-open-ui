import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { TimezoneSelector } from '@/components/shared/TimezoneSelector'
import { useToast } from '@/components/shared/Toaster'
import { useCampaignsList, useTrafficSources } from '@/api/hooks'
import { api } from '@/api/client'
import type { CostUpdateRequest } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function CostUpdatePage() {
  const toast = useToast()
  const { data: trafficSources } = useTrafficSources()
  const { data: campaigns } = useCampaignsList()

  const [idTrafficSource, setIdTrafficSource] = useState('')
  const [idCampaign, setIdCampaign] = useState('')
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
    if (!totalCost || isNaN(Number(totalCost))) {
      toast.error('Please enter a valid cost amount')
      return
    }

    const payload: CostUpdateRequest = {
      idTrafficSource,
      idCampaign: idCampaign || undefined,
      dateFrom,
      dateTo,
      timezone,
      totalCost: Number(totalCost),
    }

    setIsSubmitting(true)
    try {
      await api.post('/stats/update/cost/', payload)
      toast.success('Cost updated successfully')
      setTotalCost('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Update Cost"
        subtitle="Manually update cost data for a traffic source"
      />

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {/* Traffic Source */}
        <div className="space-y-1.5">
          <Label>Traffic Source *</Label>
          <Select value={idTrafficSource} onValueChange={setIdTrafficSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select traffic source" />
            </SelectTrigger>
            <SelectContent>
              {(trafficSources ?? []).map((ts) => (
                <SelectItem key={ts.idTrafficSource} value={ts.idTrafficSource}>
                  {ts.trafficSourceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campaign (optional) */}
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

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="date-from">Date From</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-to">Date To</Label>
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
          <Label>Timezone</Label>
          <TimezoneSelector value={timezone} onChange={setTimezone} />
        </div>

        {/* Total Cost */}
        <div className="space-y-1.5">
          <Label htmlFor="total-cost">Total Cost *</Label>
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

        <Button type="submit" disabled={isSubmitting || !idTrafficSource}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Cost
        </Button>
      </form>
    </div>
  )
}
