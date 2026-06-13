import type { Permissions } from '@/types/api'

/** Split comma/space/newline-separated ID text into distinct IDs. */
export function parseRestrictIdsInput(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** Flatten API arrays that may contain legacy merged "id1 id2" entries. */
export function flattenRestrictIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of ids) {
    for (const id of parseRestrictIdsInput(entry)) {
      if (!seen.has(id)) {
        seen.add(id)
        out.push(id)
      }
    }
  }
  return out
}

export function formatRestrictIds(ids: string[]): string {
  return flattenRestrictIds(ids).join(', ')
}

export function normalizePermissionsRestrictIds(permissions: Permissions): Permissions {
  const SECTION_KEYS: Array<{
    sectionKey: keyof Permissions
    fields: Array<'restrictTo' | 'restrictToAssetIds' | 'restrictToCategoryIds'>
  }> = [
    { sectionKey: 'campaigns', fields: ['restrictTo'] },
    { sectionKey: 'trafficSources', fields: ['restrictTo'] },
    { sectionKey: 'offerSources', fields: ['restrictTo'] },
    { sectionKey: 'offers', fields: ['restrictToAssetIds', 'restrictToCategoryIds'] },
    { sectionKey: 'landers', fields: ['restrictToAssetIds', 'restrictToCategoryIds'] },
  ]

  let next = permissions
  for (const { sectionKey, fields } of SECTION_KEYS) {
    for (const field of fields) {
      const section = permissions[sectionKey] as Record<string, unknown>
      const raw = section[field]
      if (!Array.isArray(raw)) continue
      const flattened = flattenRestrictIds(raw.map(String))
      if (flattened.join('\0') !== raw.map(String).join('\0')) {
        next = {
          ...next,
          [sectionKey]: {
            ...next[sectionKey],
            [field]: flattened,
          },
        }
      }
    }
  }
  return next
}
