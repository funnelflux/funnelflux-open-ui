import { useCallback, useState } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Card, Field, Input, PageShell, Select, useToastApi } from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import { api } from '@/api/client'
import type { BackgroundJobResponse, ConvertedHit, ConversionsUpload } from '@/types/stats'
import { getErrorMessage } from '@/lib/utils'

const POSTBACK_OPTIONS: SelectOption[] = [
  { label: 'Do not fire postback URLs', value: 'none', searchId: 'none' },
  { label: 'Fire only for hits not yet fired', value: 'onlyOnce', searchId: 'onlyOnce' },
  {
    label: 'Fire for all hits (even if already fired)',
    value: 'all',
    searchId: 'all',
  },
]

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
  const [postbackCalls, setPostbackCalls] = useState<NonNullable<ConversionsUpload['postbackCalls']>>(
    'none',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCsvChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvData(event.target.value)
  }, [])

  const handlePostbackCallsChange = useCallback((value: string) => {
    setPostbackCalls(value as NonNullable<ConversionsUpload['postbackCalls']>)
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
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
      postbackCalls,
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
      subtitle="Submit conversion rows for processing; optional traffic-source postbacks can fire based on your selection."
    >
      <Card className="max-w-2xl border-border" styles={{ body: { padding: 24 } }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            title="Postback firing"
            htmlFor="conversions-postback-calls"
            description="Whether to trigger traffic-source postback URLs for the hits in your upload."
          >
            <Select
              id="conversions-postback-calls"
              options={POSTBACK_OPTIONS}
              value={postbackCalls}
              onChange={handlePostbackCallsChange}
              className="w-full"
            />
          </Field>

          <Field
            title="Conversion data"
            required
            htmlFor="conversions-csv-data"
            description="One conversion per line: hit_id, transaction_id, payout (transaction and payout optional)."
          >
            <Input.TextArea
              id="conversions-csv-data"
              value={csvData}
              onChange={handleCsvChange}
              placeholder={"abc123, txn_001, 5.00\ndef456, txn_002, 12.50"}
              rows={12}
              className="font-mono text-xs"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="primary"
              htmlType="submit"
              disabled={isSubmitting || !csvData.trim()}
            >
              {isSubmitting && (
                <span className="mr-2 inline-flex">
                  <Icon name="loader-2" size="md" animation="spin" />
                </span>
              )}
              Update conversions
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  )
}
