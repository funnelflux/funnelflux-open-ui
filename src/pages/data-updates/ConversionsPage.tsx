import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/shared/Toaster'
import { api } from '@/api/client'
import { getErrorMessage } from '@/lib/utils'

export function ConversionsPage() {
  const toast = useToast()
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
    <div className="space-y-6">
      <PageHeader
        title="Update Conversions"
        subtitle="Submit conversion data in CSV format"
      />

      <div className="max-w-2xl space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="csv-data">
            Conversion Data
          </Label>
          <p className="text-xs text-muted-foreground">
            One conversion per line: hit_id, transaction_id, payout
          </p>
          <Textarea
            id="csv-data"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder={"abc123, txn_001, 5.00\ndef456, txn_002, 12.50"}
            rows={12}
            className="font-mono text-xs"
          />
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting || !csvData.trim()}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Conversions
        </Button>
      </div>
    </div>
  )
}
