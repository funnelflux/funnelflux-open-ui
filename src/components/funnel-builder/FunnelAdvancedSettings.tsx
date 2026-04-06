import { useFunnelEditorStore } from '@/store/funnelEditor'
import { Collapse, Input, Switch } from 'antd'

export function FunnelAdvancedSettings() {
  const meta = useFunnelEditorStore((s) => s.meta)
  const updateMeta = useFunnelEditorStore((s) => s.updateMeta)

  return (
    <Collapse
      className="border-t"
      items={[{
        key: 'advanced',
        label: <span className="text-sm font-medium">Advanced Settings</span>,
        children: (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Redirect URLs */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Redirect URLs</h4>
              <div>
                <label htmlFor="defaultRedirectUrl" className="text-xs text-muted-foreground">
                  Default Redirect URL
                </label>
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
                <label htmlFor="defaultOverflowUrl" className="text-xs text-muted-foreground">
                  Overflow URL
                </label>
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
                  onChange={(v) => updateMeta({ deduplicateByIp: v })}
                />
                <label htmlFor="deduplicateByIp" className="text-sm font-medium">
                  Deduplicate by IP
                </label>
              </div>
              {meta.deduplicateByIp && (
                <div>
                  <label htmlFor="deduplicateWindowHours" className="text-xs text-muted-foreground">
                    Window (hours)
                  </label>
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
        ),
      }]}
    />
  )
}
