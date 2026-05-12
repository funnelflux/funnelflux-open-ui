import { useCallback, useState } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { Button, Field, Input, PageShell, useToastApi } from '@/components/ui-kit'
import { api } from '@/api/client'
import type { BackgroundJobResponse, ConvertedHit, ConversionsUpload } from '@/types/stats'
import { getErrorMessage } from '@/lib/utils'

const POSTBACK_OPTIONS: ReadonlyArray<{
  value: NonNullable<ConversionsUpload['postbackCalls']>
  label: string
}> = [
  { value: 'none', label: 'Do not fire my Traffic Source Postback URLs' },
  {
    value: 'onlyOnce',
    label: 'Fire my Traffic Source Postback URLs for the Hits below that have not fired yet',
  },
  {
    value: 'all',
    label: 'Fire my Traffic Source Postback URLs for all the Hits below (even if already fired in the past)',
  },
]

/** One line per conversion: `hit_id[:transaction_id][, payout]` */
function csvTextToConvertedHits(text: string): ConvertedHit[] {
  const hits: ConvertedHit[] = []
  const lines = text.split(/\r?\n/)
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex]
    const line = rawLine.trim()
    if (!line) continue

    const commaIndex = line.indexOf(',')
    const idAndTransactionPart = (commaIndex >= 0 ? line.slice(0, commaIndex) : line).trim()
    const payoutPart = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : ''

    const colonIndex = idAndTransactionPart.indexOf(':')
    const idHit = (colonIndex >= 0
      ? idAndTransactionPart.slice(0, colonIndex)
      : idAndTransactionPart).trim()
    const transaction = (colonIndex >= 0 ? idAndTransactionPart.slice(colonIndex + 1) : '').trim()

    if (!idHit) {
      throw new Error(`Line ${lineIndex + 1}: hit id is required.`)
    }

    const entry: ConvertedHit = {
      idHit,
      transaction,
    }

    if (payoutPart !== '') {
      const payout = Number(payoutPart)
      if (Number.isNaN(payout)) {
        throw new Error(`Line ${lineIndex + 1}: invalid payout "${payoutPart}".`)
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

  const handlePostbackCallsChange = useCallback((value: NonNullable<ConversionsUpload['postbackCalls']>) => {
    setPostbackCalls(value)
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
      subtitle="Upload conversions (and optional payouts) line-by-line."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-muted-foreground">
          To edit your conversions and/or conversion payouts, enter conversion data one per line in the textarea below.
        </p>

        <fieldset className="space-y-3">
          {POSTBACK_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name="postbackCalls"
                checked={postbackCalls === option.value}
                onChange={() => handlePostbackCallsChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>

        <Field title="Conversion Data" required htmlFor="conversions-csv-data">
          <Input.TextArea
            id="conversions-csv-data"
            value={csvData}
            onChange={handleCsvChange}
            placeholder={'108\n108:main, 47.00\n108:special, 27.00\n108, -1'}
            rows={10}
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
            Update Conversions
          </Button>
        </div>

        <div className="space-y-3 text-xs text-muted-foreground">
          <p>Each line of data must follow this format: HIT-ID[:OPTIONAL-TRANSACTION-ID][, OPTIONAL-PAYOUT].</p>
          <p>
            The HIT-ID is mandatory, the remaining data is optional.
          </p>
          <p>
            If you list <code>108</code>, <code>123</code>, <code>267</code>, those hits are recorded as converted and the default offer payout is used.
          </p>
          <p>
            If you list <code>108, 20.50</code>, <code>123, 17.00</code>, <code>267, 32.00</code>, those hits are recorded with the specified payouts.
          </p>
          <p>
            If you list <code>108:main, 47.00</code> and <code>108:special, 27.00</code>, the same hit can be recorded with different transaction IDs and payouts.
          </p>
          <p>
            You can delete converted hits by setting payout to <code>-1</code>, e.g. <code>108, -1</code> or <code>108:special, -1</code>.
          </p>
        </div>
      </form>
    </PageShell>
  )
}
