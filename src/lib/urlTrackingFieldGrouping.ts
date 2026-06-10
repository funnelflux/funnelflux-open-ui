/** API list value for URL tracking dimensions (resolved via `trackingFieldMappings`). */
export const URL_TRACKING_FIELD_GROUP_BY = 'URL Tracking Field'

const TRACKING_FIELD_CONST_RE = /^__TRACKING_FIELD_(\d+)__$/

export interface UrlTrackingFieldLevelMeta {
  fieldId: string
  trafficSourceId: string
  trafficSourceName: string
  index1Based: number
}

export function isUrlTrackingFieldGroupingToken(groupBy: string): boolean {
  const g = groupBy.trim()
  if (!g) return false
  if (g === URL_TRACKING_FIELD_GROUP_BY) return true
  return TRACKING_FIELD_CONST_RE.test(g)
}

export function urlTrackingFieldSlotFromGrouping(groupBy: string): number | null {
  const m = groupBy.trim().match(TRACKING_FIELD_CONST_RE)
  if (!m) return null
  return Number.parseInt(m[1]!, 10)
}

export function trackingFieldConstantForSlot(slot: number): string {
  if (slot < 1 || slot > 10) {
    throw new RangeError('Tracking field slot must be between 1 and 10')
  }
  return `__TRACKING_FIELD_${slot}__`
}

export function nextFreeUrlTrackingFieldSlot(groupings: string[]): number {
  const used = new Set<number>()
  for (const g of groupings) {
    const s = urlTrackingFieldSlotFromGrouping(g)
    if (s != null) used.add(s)
  }
  for (let n = 1; n <= 10; n++) {
    if (!used.has(n)) return n
  }
  return 10
}

export function formatUrlTrackingFieldLabel(meta: UrlTrackingFieldLevelMeta): string {
  return `C${meta.index1Based} (${meta.fieldId})`
}

export function buildTrackingFieldMappingsForRequest(
  groupings: string[],
  urlTrackingFieldByLevel: Record<number, UrlTrackingFieldLevelMeta | null | undefined>,
): Record<string, { id: string }> {
  const out: Record<string, { id: string }> = {}
  for (let i = 0; i < groupings.length; i++) {
    const g = groupings[i]?.trim() ?? ''
    const slot = urlTrackingFieldSlotFromGrouping(g)
    const meta = urlTrackingFieldByLevel[i]
    if (slot == null || !meta) continue
    const constant = trackingFieldConstantForSlot(slot)
    out[constant] = { id: meta.fieldId }
  }
  return out
}
