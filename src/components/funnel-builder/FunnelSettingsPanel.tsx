import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { useCampaignsList } from '@/api/hooks'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FunnelAdvancedSettings } from '@/components/funnel-builder/FunnelAdvancedSettings'

interface FunnelSettingsPanelProps {
  isNew: boolean
}

export function FunnelSettingsPanel({ isNew }: FunnelSettingsPanelProps) {
  const meta = useFunnelEditorStore((s) => s.meta)
  const updateMeta = useFunnelEditorStore((s) => s.updateMeta)
  const { data: campaigns } = useCampaignsList()

  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="funnel-settings-name">
          Funnel name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="funnel-settings-name"
          className="h-10 max-w-3xl"
          value={meta.funnelName}
          onChange={(e) => updateMeta({ funnelName: e.target.value })}
          placeholder="Funnel name"
          autoComplete="off"
        />
      </div>

      <div className="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="funnel-settings-cost">Default cost per entrance</Label>
          <Input
            id="funnel-settings-cost"
            type="number"
            step="0.001"
            min={0}
            className="h-10"
            value={meta.defaultCostPerEntrance}
            onChange={(e) => updateMeta({ defaultCostPerEntrance: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Funnel ID</Label>
          <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 font-mono text-xs text-muted-foreground">
            {meta.idFunnel || '—'}
          </div>
        </div>
      </div>

      <div className="space-y-2 max-w-3xl">
        <Label htmlFor="funnel-settings-notes">Notes</Label>
        <Textarea
          id="funnel-settings-notes"
          className="min-h-[5.5rem] resize-y text-sm"
          value={meta.notes}
          onChange={(e) => updateMeta({ notes: e.target.value })}
          placeholder="Optional notes for this funnel…"
        />
      </div>

      <div className="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Campaign name</Label>
          <Select
            value={meta.idCampaign}
            onValueChange={(v) => updateMeta({ idCampaign: v })}
            disabled={!isNew}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select campaign…" />
            </SelectTrigger>
            <SelectContent>
              {campaigns?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isNew && (
            <p className="text-[11px] text-muted-foreground">Campaign is fixed after the funnel is created.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Campaign ID</Label>
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
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
