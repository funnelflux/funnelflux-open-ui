import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, Input, PageShell, useToastApi } from '@/components/ui-kit'
import { api } from '@/api/client'
import type { BackgroundJobResponse, ConvertedHit, ConversionsUpload } from '@/types/stats'
import { getErrorMessage } from '@/lib/utils'

/** One line per conversion: `hit_id, transaction_id, payout` (transaction and payout optional). */
function csvTextToConvertedHits(text: string): ConvertedHit[] {
  const hits: ConvertedHit[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const parts = line.split(',').map((part) => part.trim())
    const idHit = parts[0]
    if (!idHit) continue
    const entry: ConvertedHit = {
      idHit,
      transaction: parts[1] ?? '',
    }
    if (parts.length >= 3 && parts[2] !== '') {
      const payout = Number(parts[2])
      if (Number.isNaN(payout)) {
        throw new Error(`Invalid payout "${parts[2]}" in line: ${line}`)
      }
      entry.payout = payout
    }
    hits.push(entry)
  }
  return hits
}

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

    let hits: ConvertedHit[]
    try {
      hits = csvTextToConvertedHits(trimmed)
    } catch (parseErr) {
      toast.error(getErrorMessage(parseErr))
      return
    }

    if (hits.length === 0) {
      toast.error('No valid rows. Use: hit_id, transaction_id, payout (one per line).')
      return
    }

    const body: ConversionsUpload = {
      hits,
      postbackCalls: 'none',
      notificationWhenComplete: false,
    }

    setIsSubmitting(true)
    try {
      const res = await api.put<BackgroundJobResponse>('/stats/update/conversions/', body)
      const jobCount = res.jobIds?.length ?? 0
      toast.success(
        jobCount > 0
          ? `Queued ${jobCount} background job${jobCount === 1 ? '' : 's'}.`
          : 'Conversion update submitted.',
      )
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
