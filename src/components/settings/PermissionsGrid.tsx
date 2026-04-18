import { Input, Switch } from '@/components/ui-kit'
import type { Permissions } from '@/types/api'

interface PermissionsGridProps {
  value: Permissions
  onChange: (next: Permissions) => void
}

const SECTIONS: Array<{
  key: keyof Permissions
  label: string
  fields: string[]
  assetRestrictions?: boolean
}> = [
  { key: 'stats', label: 'Stats', fields: ['enabled', 'canView', 'canEditCustomViews'] },
  { key: 'campaigns', label: 'Campaigns', fields: ['enabled', 'canView', 'canCreateNew', 'canEdit', 'canArchive', 'canDelete'] },
  { key: 'trafficSources', label: 'Traffic Sources', fields: ['enabled', 'canView', 'canCreateNew', 'canEdit', 'canArchive', 'canDelete'] },
  { key: 'offerSources', label: 'Offer Sources', fields: ['enabled', 'canView', 'canCreateNew', 'canEdit', 'canArchive', 'canDelete'] },
  { key: 'offers', label: 'Offers', fields: ['enabled', 'canView', 'canCreateNew', 'canEdit', 'canArchive', 'canDelete'], assetRestrictions: true },
  { key: 'landers', label: 'Landers', fields: ['enabled', 'canView', 'canCreateNew', 'canEdit', 'canArchive', 'canDelete'], assetRestrictions: true },
  { key: 'systemLinks', label: 'System Links', fields: ['enabled', 'canView'] },
  { key: 'storedLinks', label: 'Stored Links', fields: ['enabled', 'canView', 'canCreateNew', 'canEdit', 'canDelete', 'canResetStats'] },
  { key: 'trafficFilters', label: 'Traffic Filters', fields: ['enabled', 'canView', 'canCreateNew', 'canEdit', 'canDelete', 'canApplyToPastStats'] },
  { key: 'dataUpdates', label: 'Data Updates', fields: ['enabled', 'canUpdateConversions', 'canUpdateTrafficCost', 'canResetStats'] },
  { key: 'systemUpdates', label: 'System Updates', fields: ['enabled', 'canView', 'canInstallUpdate'] },
] as const

function formatLabel(value: string): string {
  return value
    .replace(/^can/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
}

function parseList(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean)
}

export function PermissionsGrid({ value, onChange }: PermissionsGridProps) {
  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const sectionValue = value[section.key] as Record<string, boolean | string[]>

        return (
          <div key={section.key} className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-semibold">{section.label}</h3>

            <div className="grid gap-3 md:grid-cols-3">
              {section.fields.map((field) => (
                <div key={field} className="flex items-center justify-between rounded-md border p-3">
                  <label className="text-sm font-medium">{formatLabel(field)}</label>
                  <Switch
                    checked={Boolean(sectionValue[field])}
                    onChange={(checked) =>
                      onChange({
                        ...value,
                        [section.key]: {
                          ...value[section.key],
                          [field]: checked,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>

            {'restrictTo' in sectionValue ? (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Restrict To</label>
                <Input
                  value={Array.isArray(sectionValue.restrictTo) ? sectionValue.restrictTo.join(', ') : ''}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      [section.key]: {
                        ...value[section.key],
                        restrictTo: parseList(event.target.value),
                      },
                    })
                  }
                  placeholder="Comma-separated IDs"
                />
              </div>
            ) : null}

            {section.assetRestrictions ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Restrict To Asset IDs</label>
                  <Input
                    value={Array.isArray(sectionValue.restrictToAssetIds) ? sectionValue.restrictToAssetIds.join(', ') : ''}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        [section.key]: {
                          ...value[section.key],
                          restrictToAssetIds: parseList(event.target.value),
                        },
                      })
                    }
                    placeholder="Comma-separated asset IDs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Restrict To Category IDs</label>
                  <Input
                    value={Array.isArray(sectionValue.restrictToCategoryIds) ? sectionValue.restrictToCategoryIds.join(', ') : ''}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        [section.key]: {
                          ...value[section.key],
                          restrictToCategoryIds: parseList(event.target.value),
                        },
                      })
                    }
                    placeholder="Comma-separated category IDs"
                  />
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
