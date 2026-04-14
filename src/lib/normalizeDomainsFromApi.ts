import type { Domain } from '@/types/ui'

/**
 * `/system/domain/list/` returns an array of domain host strings (see DBTableDomains::listAllDomains).
 * First entry is always the default tracking domain.
 */
export function normalizeDomainsFromApiList(raw: unknown): Domain[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `domain:${index}:${item}`,
        domain: item,
        isDefault: index === 0,
      }
    }
    const record = item as Record<string, unknown>
    const domain = typeof record.domain === 'string' ? record.domain : String(record.domain ?? '')
    const id =
      typeof record.id === 'string' || typeof record.id === 'number'
        ? String(record.id)
        : `domain:${index}:${domain}`
    return {
      id,
      domain,
      isDefault: Boolean(record.isDefault),
    }
  })
}
