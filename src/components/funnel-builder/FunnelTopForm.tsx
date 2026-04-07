import { useMemo } from 'react'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { useCampaignsList } from '@/api/hooks'
import { Input } from 'antd'
import { FormField, SmartSelect } from '@/components/ui-kit'
import type { SmartSelectOption } from '@/components/ui-kit'

interface FunnelTopFormProps {
  isNew: boolean
}

export function FunnelTopForm({ isNew }: FunnelTopFormProps) {
  const meta = useFunnelEditorStore((s) => s.meta)
  const updateMeta = useFunnelEditorStore((s) => s.updateMeta)
  const { data: campaigns } = useCampaignsList()

  const campaignOptions: SmartSelectOption[] = useMemo(
    () => (campaigns ?? []).map((c) => ({ label: c.name, value: c.id, searchId: c.id })),
    [campaigns],
  )

  return (
    <div className="flex items-end gap-4 p-4 border-b bg-background">
      <div className="flex-1 min-w-0">
        <FormField label="Funnel Name" htmlFor="funnelName">
          <Input
            id="funnelName"
            placeholder="Enter funnel name..."
            className="h-9"
            value={meta.funnelName}
            onChange={(e) => updateMeta({ funnelName: e.target.value })}
          />
        </FormField>
      </div>

      <div className="w-64">
        <FormField label="Campaign" htmlFor="idCampaign">
          <SmartSelect
            options={campaignOptions}
            value={meta.idCampaign || undefined}
            onChange={(v) => updateMeta({ idCampaign: v })}
            disabled={!isNew}
            placeholder="Select campaign..."
            className="w-full"
          />
        </FormField>
      </div>

      <div className="w-36">
        <FormField label="Default CPV" htmlFor="defaultCost">
          <Input
            id="defaultCost"
            type="number"
            step="0.001"
            min="0"
            className="h-9"
            value={meta.defaultCostPerEntrance}
            onChange={(e) => updateMeta({ defaultCostPerEntrance: Number(e.target.value) })}
          />
        </FormField>
      </div>
    </div>
  )
}
