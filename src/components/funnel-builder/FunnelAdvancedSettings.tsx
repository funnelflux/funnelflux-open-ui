import { useFunnelEditorStore } from '@/store/funnelEditor'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function FunnelAdvancedSettings() {
  const meta = useFunnelEditorStore((s) => s.meta)
  const updateMeta = useFunnelEditorStore((s) => s.updateMeta)

  return (
    <Accordion type="single" collapsible className="border-t">
      <AccordionItem value="advanced" className="border-b-0">
        <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline">
          Advanced Settings
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Redirect URLs */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Redirect URLs</h4>
              <div>
                <Label htmlFor="defaultRedirectUrl" className="text-xs text-muted-foreground">
                  Default Redirect URL
                </Label>
                <Input
                  id="defaultRedirectUrl"
                  placeholder="https://..."
                  className="h-8 mt-1 text-sm"
                  value={meta.defaultRedirectUrl}
                  onChange={(e) => updateMeta({ defaultRedirectUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fallback URL when no valid path exists
                </p>
              </div>
              <div>
                <Label htmlFor="defaultOverflowUrl" className="text-xs text-muted-foreground">
                  Overflow URL
                </Label>
                <Input
                  id="defaultOverflowUrl"
                  placeholder="https://..."
                  className="h-8 mt-1 text-sm"
                  value={meta.defaultOverflowUrl}
                  onChange={(e) => updateMeta({ defaultOverflowUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Redirect when capacity is reached
                </p>
              </div>
            </div>

            {/* Deduplication */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Deduplication</h4>
              <div className="flex items-center gap-3">
                <Switch
                  id="deduplicateByIp"
                  checked={meta.deduplicateByIp}
                  onCheckedChange={(v) => updateMeta({ deduplicateByIp: v })}
                />
                <Label htmlFor="deduplicateByIp" className="text-sm">
                  Deduplicate by IP
                </Label>
              </div>
              {meta.deduplicateByIp && (
                <div>
                  <Label htmlFor="deduplicateWindowHours" className="text-xs text-muted-foreground">
                    Window (hours)
                  </Label>
                  <Input
                    id="deduplicateWindowHours"
                    type="number"
                    min="0"
                    max="720"
                    className="h-8 mt-1 text-sm w-24"
                    value={meta.deduplicateWindowHours}
                    onChange={(e) => updateMeta({ deduplicateWindowHours: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
