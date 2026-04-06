import { useFunnelEditorStore } from '@/store/funnelEditor'
import { useCampaignsList } from '@/api/hooks'
import { Input, Select } from 'antd'

interface FunnelTopFormProps {
  isNew: boolean
}

export function FunnelTopForm({ isNew }: FunnelTopFormProps) {
  const meta = useFunnelEditorStore((s) => s.meta)
  const updateMeta = useFunnelEditorStore((s) => s.updateMeta)
  const { data: campaigns } = useCampaignsList()

  return (
    <div className="flex items-end gap-4 p-4 border-b bg-background">
      <div className="flex-1 min-w-0">
        <label htmlFor="funnelName" className="text-xs text-muted-foreground mb-1">
          Funnel Name
        </label>
        <Input
          id="funnelName"
          placeholder="Enter funnel name..."
          className="h-9"
          value={meta.funnelName}
          onChange={(e) => updateMeta({ funnelName: e.target.value })}
        />
      </div>

      <div className="w-64">
        <label htmlFor="idCampaign" className="text-xs text-muted-foreground mb-1">
          Campaign
        </label>
        <Select
          value={meta.idCampaign || undefined}
          onChange={(v) => updateMeta({ idCampaign: v })}
          disabled={!isNew}
          placeholder="Select campaign..."
          className="w-full"
          options={campaigns?.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>

      <div className="w-36">
        <label htmlFor="defaultCost" className="text-xs text-muted-foreground mb-1">
          Default CPV
        </label>
        <Input
          id="defaultCost"
          type="number"
          step="0.001"
          min="0"
          className="h-9"
          value={meta.defaultCostPerEntrance}
          onChange={(e) => updateMeta({ defaultCostPerEntrance: Number(e.target.value) })}
        />
      </div>
    </div>
  )
}
