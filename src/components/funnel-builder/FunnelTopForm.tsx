import { useFunnelEditorStore } from '@/store/funnelEditor'
import { useCampaignsList } from '@/api/hooks'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
        <Label htmlFor="funnelName" className="text-xs text-muted-foreground mb-1">
          Funnel Name
        </Label>
        <Input
          id="funnelName"
          placeholder="Enter funnel name..."
          className="h-9"
          value={meta.funnelName}
          onChange={(e) => updateMeta({ funnelName: e.target.value })}
        />
      </div>

      <div className="w-64">
        <Label htmlFor="idCampaign" className="text-xs text-muted-foreground mb-1">
          Campaign
        </Label>
        <Select
          value={meta.idCampaign}
          onValueChange={(v) => updateMeta({ idCampaign: v })}
          disabled={!isNew}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select campaign..." />
          </SelectTrigger>
          <SelectContent>
            {campaigns?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-36">
        <Label htmlFor="defaultCost" className="text-xs text-muted-foreground mb-1">
          Default CPV
        </Label>
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
