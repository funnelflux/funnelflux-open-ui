import { useCallback, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { Button, Input, Select } from 'antd'
import type { FunnelKeyValuePair, FunnelPostbackOverrideRow } from '@/types/funnel'
import { cn } from '@/lib/utils'

const { TextArea } = Input

const POSTBACK_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'postbackUrl', label: 'Postback URL' },
  { value: 'pixelUrl', label: 'Pixel URL' },
  { value: 'javascript', label: 'JavaScript' },
] as const

type PostbackType = (typeof POSTBACK_TYPES)[number]['value']

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

export function FunnelAdvancedSettings({ className }: { className?: string }) {
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

      <div className="p-4 space-y-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="customTokens" className="text-xs font-medium block">
              Custom tokens
            </label>
            <TextArea
              id="customTokens"
              rows={5}
              placeholder="token1=value_one&#10;token2=value_two"
              className="font-mono text-xs"
              value={customTokensText}
              onChange={(e) => setCustomTokensText(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">One <code className="font-mono">key=value</code> per line.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="accuParams" className="text-xs font-medium block">
              Accumulate these URL params
            </label>
            <TextArea
              id="accuParams"
              rows={5}
              placeholder="param1=value&#10;param2=value"
              className="font-mono text-xs"
              value={accuParamsText}
              onChange={(e) => setAccuParamsText(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Passed through on funnel links as query pairs.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">Incoming traffic cost overrides</span>
            <Button
              htmlType="button"
              variant="outlined"
              size="small"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={addCostRow}
            >
              Add override
            </Button>
          </div>
          <div className="space-y-2">
            {meta.incomingTrafficCostOverrides.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No overrides — traffic uses default costs.</p>
            )}
            {meta.incomingTrafficCostOverrides.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Traffic source ID"
                  className="font-mono text-xs flex-1 min-w-[140px]"
                  value={row.key}
                  onChange={(e) => updateCostRow(i, 'key', e.target.value)}
                />
                <Input
                  placeholder="Cost"
                  className="w-28 font-mono text-xs"
                  value={row.value}
                  onChange={(e) => updateCostRow(i, 'value', e.target.value)}
                />
                <Button
                  htmlType="button"
                  type="text"
                  size="small"
                  shape="circle"
                  aria-label="Remove override"
                  className="shrink-0"
                  icon={<Trash2 className="h-4 w-4 text-destructive" />}
                  onClick={() => removeCostRow(i)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">Traffic source postback overrides</span>
            <Button
              htmlType="button"
              variant="outlined"
              size="small"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={addPbRow}
            >
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
                  <div className="flex-1 min-w-[160px] space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Traffic source ID</span>
                    <Input
                      className="font-mono text-xs"
                      size="small"
                      value={row.idTrafficSource}
                      onChange={(e) => updatePbRow(i, { idTrafficSource: e.target.value })}
                    />
                  </div>
                  <div className="w-44 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</span>
                    <Select<PostbackType>
                      className="w-full"
                      size="small"
                      value={row.postbackType as PostbackType}
                      onChange={(v) => updatePbRow(i, { postbackType: v })}
                      options={POSTBACK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                    />
                  </div>
                  <Button
                    htmlType="button"
                    type="text"
                    size="small"
                    shape="circle"
                    aria-label="Remove postback"
                    icon={<Trash2 className="h-4 w-4 text-destructive" />}
                    onClick={() => removePbRow(i)}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Postback URL / code</span>
                  <TextArea
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
    </section>
  )
}
