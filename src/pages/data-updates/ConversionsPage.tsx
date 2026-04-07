import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, Input } from 'antd'
import { PageShell, useToastApi } from '@/components/ui-kit'
import { api } from '@/api/client'
import { getErrorMessage } from '@/lib/utils'

export function ConversionsPage() {
  const toast = useToastApi()
  const [csvData, setCsvData] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    const trimmed = csvData.trim()
    if (!trimmed) {
      toast.error('Please enter conversion data')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/stats/update/conversions/', { data: trimmed })
      toast.success('Conversions updated successfully')
      setCsvData('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell
      title="Update Conversions"
      subtitle="Submit conversion data in CSV format"
    >
      <div className="max-w-2xl space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="csv-data" className="text-sm font-medium">
            Conversion Data
          </label>
          <p className="text-xs text-muted-foreground">
            One conversion per line: hit_id, transaction_id, payout
          </p>
          <Input.TextArea
            id="csv-data"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder={"abc123, txn_001, 5.00\ndef456, txn_002, 12.50"}
            rows={12}
            className="font-mono text-xs"
          />
        </div>

        <Button type="primary" onClick={handleSubmit} disabled={isSubmitting || !csvData.trim()}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Conversions
        </Button>
      </div>
    </PageShell>
  )
}
