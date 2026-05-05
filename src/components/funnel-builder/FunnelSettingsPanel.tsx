import { useMemo, useState, type ChangeEvent } from 'react'
import { Button, Field, Input, InputNumber, Select } from '@/components/ui-kit'
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
      <Field title="Funnel name" htmlFor="funnel-settings-name" required>
        <Input
          id="funnel-settings-name"
          className="max-w-3xl"
          value={meta.funnelName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateMeta({ funnelName: e.target.value })}
          placeholder="Funnel name"
          autoComplete="off"
        />
      </Field>

      <div className="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          title="Default cost per entrance"
          htmlFor="funnel-settings-cost"
          description="Optional baseline cost applied when traffic source cost is missing."
        >
          <InputNumber
            id="funnel-settings-cost"
            step={0.001}
            min={0}
            value={meta.defaultCostPerEntrance}
            onChange={(v) => updateMeta({ defaultCostPerEntrance: Number(v ?? 0) })}
            className="w-full"
          />
        </Field>
        <Field title="Funnel ID" description={meta.idFunnel ? undefined : 'Saved funnels will show an ID.'}>
          <Input
            value={meta.idFunnel || '—'}
            disabled
            className="font-mono text-xs"
            aria-label="Funnel ID"
          />
        </Field>
      </div>

      <Field title="Notes" htmlFor="funnel-settings-notes" className="max-w-3xl">
        <Input.TextArea
          id="funnel-settings-notes"
          className="min-h-[5.5rem] resize-y text-sm"
          value={meta.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateMeta({ notes: e.target.value })}
          placeholder="Optional notes for this funnel…"
          autoSize={{ minRows: 3 }}
        />
      </Field>

      <div className="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          title="Campaign name"
          description={!isNew ? 'Campaign is fixed after the funnel is created.' : undefined}
        >
          <Select
            className="w-full"
            value={meta.idCampaign || undefined}
            onChange={(v: string) => updateMeta({ idCampaign: v })}
            disabled={!isNew}
            placeholder="Select campaign…"
            options={campaignOptions}
          />
        </Field>
        <Field title="Campaign ID">
          <Input
            value={meta.idCampaign || '—'}
            disabled
            className="font-mono text-xs"
            aria-label="Campaign ID"
          />
        </Field>
      </div>

      <div className="border-t pt-2">
        <Button
          htmlType="button"
          type="text"
          className="w-full justify-start px-0 font-medium"
          onClick={() => setAdvancedOpen((o) => !o)}
          iconName={advancedOpen ? 'chevron-down' : 'chevron-right'}
          iconSize="md"
        >
          Advanced settings
        </Button>

        {advancedOpen && (
          <div className="mt-3 rounded-lg border bg-muted/10 p-3">
            <FunnelAdvancedSettings className="border-0 bg-transparent shadow-none" />
          </div>
        )}
      </div>
    </div>
  )
}
