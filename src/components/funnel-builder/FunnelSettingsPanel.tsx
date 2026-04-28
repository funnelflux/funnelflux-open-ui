import { useMemo, useState, type ChangeEvent } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { Input, Select } from '@/components/ui-kit'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { useCampaignsList } from '@/api/hooks'
import { FunnelAdvancedSettings } from '@/components/funnel-builder/FunnelAdvancedSettings'

interface FunnelSettingsPanelProps {
  isNew: boolean
}

export function FunnelSettingsPanel({ isNew }: FunnelSettingsPanelProps) {
  const meta = useFunnelEditorStore((s) => s.meta)
  const updateMeta = useFunnelEditorStore((s) => s.updateMeta)
  const { data: campaigns } = useCampaignsList()

  const [advancedOpen, setAdvancedOpen] = useState(false)

  const campaignOptions = useMemo(
    () => campaigns?.map((c) => ({ label: c.name, value: c.id })) ?? [],
    [campaigns],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="funnel-settings-name" className="block text-sm font-medium text-foreground">
          Funnel name <span className="text-destructive">*</span>
        </label>
        <Input
          id="funnel-settings-name"
          size="middle"
          className="h-10 max-w-3xl"
          value={meta.funnelName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateMeta({ funnelName: e.target.value })}
          placeholder="Funnel name"
          autoComplete="off"
        />
      </div>

      <div className="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="funnel-settings-cost" className="block text-sm font-medium text-foreground">
            Default cost per entrance
          </label>
          <Input
            id="funnel-settings-cost"
            type="number"
            step={0.001}
            min={0}
            size="middle"
            className="h-10"
            value={meta.defaultCostPerEntrance}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              updateMeta({ defaultCostPerEntrance: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">Funnel ID</span>
          <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 font-mono text-xs text-muted-foreground">
            {meta.idFunnel || '—'}
          </div>
        </div>
      </div>

      <div className="space-y-2 max-w-3xl">
        <label htmlFor="funnel-settings-notes" className="block text-sm font-medium text-foreground">
          Notes
        </label>
        <Input.TextArea
          id="funnel-settings-notes"
          className="min-h-[5.5rem] resize-y text-sm"
          value={meta.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateMeta({ notes: e.target.value })}
          placeholder="Optional notes for this funnel…"
          autoSize={{ minRows: 3 }}
        />
      </div>

      <div className="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">Campaign name</span>
          <Select
            className="h-10 w-full"
            size="middle"
            value={meta.idCampaign || undefined}
            onChange={(v: string) => updateMeta({ idCampaign: v })}
            disabled={!isNew}
            placeholder="Select campaign…"
            options={campaignOptions}
          />
          {!isNew && (
            <p className="text-[11px] text-muted-foreground">Campaign is fixed after the funnel is created.</p>
          )}
        </div>
        <div className="space-y-2">
          <span className="block text-sm font-medium text-foreground">Campaign ID</span>
          <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 font-mono text-xs text-muted-foreground">
            {meta.idCampaign || '—'}
          </div>
        </div>
      </div>

      <div className="border-t pt-2">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-md py-2 text-left text-sm font-medium text-foreground hover:bg-muted/50"
        >
          {advancedOpen ? (
            <span className="shrink-0 text-muted-foreground"><Icon name="chevron-down" size="md" aria-hidden /></span>
          ) : (
            <span className="shrink-0 text-muted-foreground"><Icon name="chevron-right" size="md" aria-hidden /></span>
          )}
          <span>Advanced settings</span>
        </button>

        {advancedOpen && (
          <div className="mt-3 rounded-lg border bg-muted/10 p-3">
            <FunnelAdvancedSettings className="border-0 bg-transparent shadow-none" />
          </div>
        )}
      </div>
    </div>
  )
}
