import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, Input, Select } from 'antd'
import { PageHeader } from '@/components/shared/PageHeader'
import { TimezoneSelect, useToastApi } from '@/components/ui-kit'
import { useCampaignsList, useTrafficSources } from '@/api/hooks'
import { api } from '@/api/client'
import type { CostUpdateRequest } from '@/types/ui'
import { getErrorMessage } from '@/lib/utils'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function CostUpdatePage() {
  const toast = useToastApi()
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
          <label className="text-sm font-medium">Traffic Source *</label>
          <Select value={idTrafficSource || undefined} onChange={setIdTrafficSource} placeholder="Select traffic source" className="w-full">
            {(trafficSources ?? []).map((ts) => (
              <Select.Option key={ts.idTrafficSource} value={ts.idTrafficSource}>
                {ts.trafficSourceName}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* Campaign (optional) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Campaign (optional)</label>
          <Select value={idCampaign || undefined} onChange={setIdCampaign} placeholder="All campaigns" className="w-full">
            <Select.Option value="__none__">All campaigns</Select.Option>
            {(campaigns ?? []).map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
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
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Cost
        </Button>
      </form>
    </div>
  )
}
