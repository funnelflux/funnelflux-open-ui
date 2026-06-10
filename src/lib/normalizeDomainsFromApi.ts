import type { Domain } from '@/types/ui'

export function normalizeDomainValue(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    if (typeof record.domain === 'string') return record.domain
  }
  return ''
}

/**
 * `/system/domain/list/` returns an array of domain host strings.
 * Tracking-default state is authoritative from `/system/domain/default/`.
 */
export function normalizeDomainsFromApiList(raw: unknown, trackingDefault = ''): Domain[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `domain:${index}:${item}`,
        domain: item,
        isDefault: item === trackingDefault,
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
      isDefault: domain === trackingDefault || Boolean(record.isDefault),
    }
  })
}
