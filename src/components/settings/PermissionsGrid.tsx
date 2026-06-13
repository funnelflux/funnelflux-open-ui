import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Input, Switch } from '@/components/ui-kit'
import type { Permissions } from '@/types/api'
import {
  flattenRestrictIds,
  formatRestrictIds,
  parseRestrictIdsInput,
} from '@/lib/parseRestrictIds'

interface PermissionsGridProps {
  value: Permissions
  onChange: (next: Permissions) => void
}

export type PermissionsGridHandle = {
  flushRestrictDrafts: () => Permissions
}

type RestrictField = 'restrictTo' | 'restrictToAssetIds' | 'restrictToCategoryIds'

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

function draftKey(sectionKey: string, field: RestrictField): string {
  return `${sectionKey}.${field}`
}

function readRestrictIds(
  permissions: Permissions,
  sectionKey: keyof Permissions,
  field: RestrictField,
): string[] {
  const section = permissions[sectionKey] as Record<string, unknown>
  const raw = section[field]
  return Array.isArray(raw) ? flattenRestrictIds(raw.map(String)) : []
}

function applyRestrictIds(
  permissions: Permissions,
  sectionKey: keyof Permissions,
  field: RestrictField,
  ids: string[],
): Permissions {
  return {
    ...permissions,
    [sectionKey]: {
      ...permissions[sectionKey],
      [field]: ids,
    },
  }
}

interface CommaSeparatedIdsInputProps {
  draftText: string
  onDraftChange: (next: string) => void
  onFocus: () => void
  onCommit: (text: string) => void
  placeholder?: string
}

function CommaSeparatedIdsInput({
  draftText,
  onDraftChange,
  onFocus,
  onCommit,
  placeholder,
}: CommaSeparatedIdsInputProps) {
  return (
    <Input
      value={draftText}
      onChange={(event) => onDraftChange(event.target.value)}
      onFocus={onFocus}
      onBlur={(event) => onCommit(event.target.value)}
      placeholder={placeholder}
    />
  )
}

function collectRestrictFields(permissions: Permissions): Array<{
  sectionKey: keyof Permissions
  field: RestrictField
  ids: string[]
}> {
  const entries: Array<{ sectionKey: keyof Permissions; field: RestrictField; ids: string[] }> = []

  for (const section of SECTIONS) {
    const sectionValue = permissions[section.key] as Record<string, unknown>
    if ('restrictTo' in sectionValue) {
      entries.push({
        sectionKey: section.key,
        field: 'restrictTo',
        ids: readRestrictIds(permissions, section.key, 'restrictTo'),
      })
    }
    if (section.assetRestrictions) {
      entries.push(
        {
          sectionKey: section.key,
          field: 'restrictToAssetIds',
          ids: readRestrictIds(permissions, section.key, 'restrictToAssetIds'),
        },
        {
          sectionKey: section.key,
          field: 'restrictToCategoryIds',
          ids: readRestrictIds(permissions, section.key, 'restrictToCategoryIds'),
        },
      )
    }
  }

  return entries
}

export const PermissionsGrid = forwardRef<PermissionsGridHandle, PermissionsGridProps>(
  function PermissionsGrid({ value, onChange }, ref) {
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const focusedKeysRef = useRef<Set<string>>(new Set())

    const valueSignature = useMemo(
      () =>
        collectRestrictFields(value)
          .map((entry) => `${entry.sectionKey}.${entry.field}:${entry.ids.join('|')}`)
          .join(';'),
      [value],
    )

    useEffect(() => {
      queueMicrotask(() => {
        setDrafts((prev) => {
          const next = { ...prev }
          for (const entry of collectRestrictFields(value)) {
            const key = draftKey(String(entry.sectionKey), entry.field)
            if (!focusedKeysRef.current.has(key)) {
              next[key] = formatRestrictIds(entry.ids)
            }
          }
          return next
        })
      })
    }, [value, valueSignature])

    const getDraftText = (sectionKey: keyof Permissions, field: RestrictField, ids: string[]) => {
      const key = draftKey(String(sectionKey), field)
      return drafts[key] ?? formatRestrictIds(ids)
    }


    const flushRestrictDrafts = useCallback((): Permissions => {
      let next = value
      for (const entry of collectRestrictFields(value)) {
        const key = draftKey(String(entry.sectionKey), entry.field)
        const text = drafts[key] ?? formatRestrictIds(entry.ids)
        const parsed = parseRestrictIdsInput(text)
        next = applyRestrictIds(next, entry.sectionKey, entry.field, parsed)
      }
      onChange(next)
      return next
    }, [drafts, onChange, value])

    useImperativeHandle(ref, () => ({ flushRestrictDrafts }), [flushRestrictDrafts])

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
                  <span className="block text-sm font-medium text-foreground">Restrict To</span>
                  <CommaSeparatedIdsInput
                    draftText={getDraftText(
                      section.key,
                      'restrictTo',
                      readRestrictIds(value, section.key, 'restrictTo'),
                    )}
                    onDraftChange={(text) => {
                      const key = draftKey(String(section.key), 'restrictTo')
                      setDrafts((prev) => ({ ...prev, [key]: text }))
                    }}
                    onFocus={() => {
                      focusedKeysRef.current.add(draftKey(String(section.key), 'restrictTo'))
                    }}
                    onCommit={(text) => {
                      const key = draftKey(String(section.key), 'restrictTo')
                      focusedKeysRef.current.delete(key)
                      const parsed = parseRestrictIdsInput(text)
                      const normalized = formatRestrictIds(parsed)
                      setDrafts((prev) => ({ ...prev, [key]: normalized }))
                      onChange(applyRestrictIds(value, section.key, 'restrictTo', parsed))
                    }}
                    placeholder="Comma-separated IDs"
                  />
                </div>
              ) : null}

              {section.assetRestrictions ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {(['restrictToAssetIds', 'restrictToCategoryIds'] as const).map((restrictField) => (
                    <div key={restrictField} className="space-y-1.5">
                      <span className="block text-sm font-medium text-foreground">
                        {restrictField === 'restrictToAssetIds'
                          ? 'Restrict To Asset IDs'
                          : 'Restrict To Category IDs'}
                      </span>
                      <CommaSeparatedIdsInput
                        draftText={getDraftText(
                          section.key,
                          restrictField,
                          readRestrictIds(value, section.key, restrictField),
                        )}
                        onDraftChange={(text) => {
                          const key = draftKey(String(section.key), restrictField)
                          setDrafts((prev) => ({ ...prev, [key]: text }))
                        }}
                        onFocus={() => {
                          focusedKeysRef.current.add(draftKey(String(section.key), restrictField))
                        }}
                        onCommit={(text) => {
                          const key = draftKey(String(section.key), restrictField)
                          focusedKeysRef.current.delete(key)
                          const parsed = parseRestrictIdsInput(text)
                          const normalized = formatRestrictIds(parsed)
                          setDrafts((prev) => ({ ...prev, [key]: normalized }))
                          onChange(applyRestrictIds(value, section.key, restrictField, parsed))
                        }}
                        placeholder={
                          restrictField === 'restrictToAssetIds'
                            ? 'Comma-separated asset IDs'
                            : 'Comma-separated category IDs'
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  },
)
