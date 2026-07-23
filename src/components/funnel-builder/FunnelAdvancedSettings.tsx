import { Fragment, useCallback, useMemo } from 'react'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { Button, FormField, Input, Select } from '@/components/ui-kit'
import type { FunnelKeyValuePair, FunnelPostbackOverrideRow } from '@/types/funnel'
import { cn } from '@/lib/utils'

const POSTBACK_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'postbackUrl', label: 'Postback URL' },
  { value: 'pixelUrl', label: 'Pixel URL' },
  { value: 'javascript', label: 'JavaScript' },
] as const
const POSTBACK_TYPE_OPTIONS = POSTBACK_TYPES.map((t) => ({ label: t.label, value: t.value }))

function kvToLines(rows: FunnelKeyValuePair[]): string {
  return rows.map((r) => `${r.key}=${r.value}`).join('\n')
}

function linesToKv(text: string): FunnelKeyValuePair[] {
  return text
    .split('\n')
    .map((line) => {
      const eq = line.indexOf('=')
      if (eq === -1) return { key: line.trim(), value: '' }
      return { key: line.slice(0, eq).trim(), value: line.slice(eq + 1).trim() }
    })
    .filter((r) => r.key !== '' || r.value !== '')
}

export function FunnelAdvancedSettings({
  className,
  embedded = false,
}: {
  className?: string
  /** When true, omit outer card chrome (for Collapse panels). */
  embedded?: boolean
}) {
  const meta = useFunnelEditorStore((s) => s.meta)
  const updateMeta = useFunnelEditorStore((s) => s.updateMeta)

  const customTokensText = useMemo(() => kvToLines(meta.customTokens), [meta.customTokens])
  const accuParamsText = useMemo(() => kvToLines(meta.acculumatedUrlParams), [meta.acculumatedUrlParams])

  const setCustomTokensText = useCallback(
    (text: string) => updateMeta({ customTokens: linesToKv(text) }),
    [updateMeta],
  )
  const setAccuParamsText = useCallback(
    (text: string) => updateMeta({ acculumatedUrlParams: linesToKv(text) }),
    [updateMeta],
  )

  const updateCostRow = (index: number, field: 'key' | 'value', value: string) => {
    const next = [...meta.incomingTrafficCostOverrides]
    const row = next[index] ?? { key: '', value: '' }
    next[index] = { ...row, [field]: value }
    updateMeta({ incomingTrafficCostOverrides: next })
  }
  const addCostRow = () => {
    updateMeta({
      incomingTrafficCostOverrides: [...meta.incomingTrafficCostOverrides, { key: '', value: '' }],
    })
  }
  const removeCostRow = (index: number) => {
    updateMeta({
      incomingTrafficCostOverrides: meta.incomingTrafficCostOverrides.filter((_, i) => i !== index),
    })
  }

  const updatePbRow = (index: number, patch: Partial<FunnelPostbackOverrideRow>) => {
    const next = [...meta.postbackOverrides]
    next[index] = { ...next[index], ...patch } as FunnelPostbackOverrideRow
    updateMeta({ postbackOverrides: next })
  }
  const addPbRow = () => {
    updateMeta({
      postbackOverrides: [
        ...meta.postbackOverrides,
        { idTrafficSource: '', postbackType: 'none', postbackCode: '' },
      ],
    })
  }
  const removePbRow = (index: number) => {
    updateMeta({ postbackOverrides: meta.postbackOverrides.filter((_, i) => i !== index) })
  }

  const body = (
    <div className={cn('space-y-8', embedded ? 'pt-1' : 'p-4')}>
        <div className="grid gap-6 lg:grid-cols-2">
          <FormField
            label="Custom tokens"
            htmlFor="customTokens"
            help="One key=value per line."
          >
            <Input.TextArea
              id="customTokens"
              rows={5}
              placeholder={'token1=value_one\ntoken2=value_two'}
              className="font-mono text-xs"
              value={customTokensText}
              onChange={(e) => setCustomTokensText(e.target.value)}
            />
          </FormField>
          <FormField
            label="Accumulate these URL params"
            htmlFor="accuParams"
            help="Passed through on funnel links as query pairs."
          >
            <Input.TextArea
              id="accuParams"
              rows={5}
              placeholder={'param1=value\nparam2=value'}
              className="font-mono text-xs"
              value={accuParamsText}
              onChange={(e) => setAccuParamsText(e.target.value)}
            />
          </FormField>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">Incoming traffic cost overrides</span>
            <Button htmlType="button" type="default" iconName="plus" iconSize="sm" onClick={addCostRow}>
              Add override
            </Button>
          </div>
          {meta.incomingTrafficCostOverrides.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No overrides — traffic uses default costs.</p>
          ) : (
            <div
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2"
              aria-label="Incoming traffic cost overrides"
            >
              <span className="min-w-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Traffic source ID
              </span>
              <span className="min-w-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Cost
              </span>
              <span aria-hidden="true" />
              {meta.incomingTrafficCostOverrides.map((row, i) => (
                <Fragment key={i}>
                  <Input
                    placeholder="Traffic source ID"
                    className="min-w-0 w-full font-mono text-xs"
                    value={row.key}
                    onChange={(e) => updateCostRow(i, 'key', e.target.value)}
                  />
                  <Input
                    placeholder="Cost"
                    className="min-w-0 w-full font-mono text-xs"
                    value={row.value}
                    onChange={(e) => updateCostRow(i, 'value', e.target.value)}
                  />
                  <Button
                    htmlType="button"
                    type="text"
                    danger
                    className="!mx-0 justify-self-center"
                    iconName="trash-2"
                    aria-label="Remove cost override"
                    onClick={() => removeCostRow(i)}
                  />
                </Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">Traffic source postback overrides</span>
            <Button htmlType="button" type="default" iconName="plus" iconSize="sm" onClick={addPbRow}>
              Add postback
            </Button>
          </div>
          <div className="space-y-4">
            {meta.postbackOverrides.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No postback overrides.</p>
            )}
            {meta.postbackOverrides.map((row, i) => (
              <div key={i} className="rounded-md border bg-muted/30 p-3 space-y-2">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[160px]">
                    <span className="mb-1 block text-[10px] text-muted-foreground uppercase tracking-wide">
                      Traffic source ID
                    </span>
                    <Input
                      className="font-mono text-xs"
                      value={row.idTrafficSource}
                      onChange={(e) => updatePbRow(i, { idTrafficSource: e.target.value })}
                    />
                  </div>
                  <div className="w-44">
                    <span className="mb-1 block text-[10px] text-muted-foreground uppercase tracking-wide">
                      Type
                    </span>
                    <Select
                      className="w-full min-w-0 text-xs"
                      value={row.postbackType}
                      onChange={(v) => updatePbRow(i, { postbackType: v })}
                      options={POSTBACK_TYPE_OPTIONS}
                    />
                  </div>
                  <Button
                    htmlType="button"
                    type="text"
                    danger
                    iconName="trash-2"
                    aria-label="Remove postback override"
                    onClick={() => removePbRow(i)}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Postback URL / code</span>
                  <Input.TextArea
                    rows={2}
                    className="font-mono text-xs"
                    placeholder="https://… or script"
                    value={row.postbackCode}
                    onChange={(e) => updatePbRow(i, { postbackCode: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      <p className="text-[11px] text-muted-foreground border-t pt-4 leading-relaxed">
        <strong className="text-foreground/90">Legacy admin only:</strong> organic tracking JS snippets, IP anonymizer
        profile, and default tracking domain are not on the public V2 <code className="font-mono">Funnel</code> model —
        configure them in the classic PHP admin if you need them.
      </p>
    </div>
  )

  if (embedded) {
    return <div className={className}>{body}</div>
  }

  return (
    <section
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        className,
      )}
    >
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Advanced settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tokens, URL accumulation, traffic cost and postback overrides (V2 API). Other legacy-only options
          stay in the classic admin.
        </p>
      </div>
      {body}
    </section>
  )
}
