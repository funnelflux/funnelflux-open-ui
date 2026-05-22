import { useMemo, type ChangeEvent } from 'react'
import { Collapse, Field, Input, InputNumber, Select } from '@/components/ui-kit'
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

  const campaignOptions = useMemo(
    () => campaigns?.map((c) => ({ label: c.name, value: c.id })) ?? [],
    [campaigns],
  )

  return (
    <div className="space-y-6">
      <Field title="Funnel name" htmlFor="funnel-settings-name" required>
        <Input
          id="funnel-settings-name"
          className="w-full"
          value={meta.funnelName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateMeta({ funnelName: e.target.value })}
          placeholder="Funnel name"
          autoComplete="off"
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

      <Field title="Notes" htmlFor="funnel-settings-notes">
        <Input.TextArea
          id="funnel-settings-notes"
          className="min-h-[5.5rem] resize-y text-sm"
          value={meta.notes}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateMeta({ notes: e.target.value })}
          placeholder="Optional notes for this funnel…"
          autoSize={{ minRows: 3 }}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

      <Collapse
        bordered={false}
        expandIconPosition="end"
        className={[
          'rounded-lg border border-border/70 bg-muted/25 shadow-sm',
          '[&_.ant-collapse-item]:border-0',
          '[&_.ant-collapse-header]:!items-center [&_.ant-collapse-header]:!rounded-t-lg [&_.ant-collapse-header]:!py-3.5 [&_.ant-collapse-header]:!px-4',
          '[&_.ant-collapse-content-box]:!px-4 [&_.ant-collapse-content-box]:!pb-4',
        ].join(' ')}
        items={[
          {
            key: 'advanced',
            label: (
              <div className="flex min-w-0 flex-col gap-0.5 pr-2 text-left">
                <span className="text-sm font-semibold text-foreground">Advanced settings</span>
                <span className="text-xs font-normal leading-snug text-muted-foreground">
                  Custom tokens, URL params, traffic cost overrides, and postback overrides
                </span>
              </div>
            ),
            children: <FunnelAdvancedSettings embedded />,
          },
        ]}
      />
    </div>
  )
}
