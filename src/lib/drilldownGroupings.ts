import {
  URL_TRACKING_FIELD_GROUP_BY,
  isUrlTrackingFieldGroupingToken,
  type UrlTrackingFieldLevelMeta,
} from '@/lib/urlTrackingFieldGrouping'

/** API includes this sentinel; it is not a real drilldown grouping. */
export const DRILLDOWN_GROUPING_EXCLUDE = new Set(['Empty'])

export const MAX_DRILLDOWN_GROUPING_LEVELS = 10

const CATEGORY_ORDER = [
  'Time',
  'Location',
  'Element',
  'Traffic',
  'Third Parties',
  'Device',
  'Connection',
  'Hit',
  'Click',
  'Insight',
  'Other',
]

export function filterDrilldownGroupingOptions(list: string[] | undefined): string[] {
  return (list ?? []).filter((g) => Boolean(g?.trim()) && !DRILLDOWN_GROUPING_EXCLUDE.has(g))
}

/**
 * Display label: drop `Category: ` prefix (API uses `Time: Date`, `Element: Campaign`, etc.).
 */
export function drilldownGroupingShortLabel(full: string): string {
  if (!full.trim()) return ''
  if (full.trim() === URL_TRACKING_FIELD_GROUP_BY) return 'URL tracking field'
  const sep = ': '
  const i = full.indexOf(sep)
  if (i === -1) return full.trim()
  return full.slice(i + sep.length).trim()
}

export function drilldownGroupingCategory(full: string): string {
  if (!full.trim()) return 'Other'
  if (full === URL_TRACKING_FIELD_GROUP_BY || /^__TRACKING_FIELD_\d+__$/.test(full.trim()))
    return 'Traffic'
  const sep = ': '
  const i = full.indexOf(sep)
  if (i === -1) return 'Other'
  return full.slice(0, i)
}

export function buildDrilldownGroupingSelectOptions(
  availableFull: string[],
  usedFull: Set<string>,
  urlSlotOption?: { value: string; label: string } | null,
): Array<{ label: string; options: { label: string; value: string }[] }> {
  const filtered = availableFull.filter((g) => !usedFull.has(g))
  const byCat = new Map<string, { label: string; value: string }[]>()
  for (const full of filtered) {
    const cat = drilldownGroupingCategory(full)
    const short = drilldownGroupingShortLabel(full)
    if (!byCat.has(cat)) byCat.set(cat, [])
    byCat.get(cat)!.push({ label: short, value: full })
  }
  if (urlSlotOption) {
    const cat = drilldownGroupingCategory(URL_TRACKING_FIELD_GROUP_BY)
    if (!byCat.has(cat)) byCat.set(cat, [])
    const arr = byCat.get(cat)!
    if (!arr.some((o) => o.value === urlSlotOption.value)) {
      arr.push({ label: urlSlotOption.label, value: urlSlotOption.value })
    }
  }
  for (const arr of byCat.values()) {
    arr.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
  }
  const orderIdx = (cat: string) => {
    const j = CATEGORY_ORDER.indexOf(cat)
    return j === -1 ? 1000 : j
  }
  return [...byCat.entries()]
    .sort(([a], [b]) => {
      const d = orderIdx(a) - orderIdx(b)
      if (d !== 0) return d
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    })
    .map(([label, options]) => ({ label, options }))
}

/** Reorder one grouping level and keep filters aligned by position. */
export function reorderGroupingLevels(
  groupings: string[],
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>,
  fromIndex: number,
  toIndex: number,
):
  | {
      groupings: string[]
      groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
    }
  | null {
  const n = groupings.length
  if (n === 0 || fromIndex === toIndex) return null
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= n || toIndex >= n) return null

  const nextGroupings = [...groupings]
  const [moved] = nextGroupings.splice(fromIndex, 1)
  nextGroupings.splice(toIndex, 0, moved)

  const filtersList = groupings.map(
    (_, i) => groupingFilters[i] ?? { whitelist: [] as string[], blacklist: [] as string[] },
  )
  const [movedF] = filtersList.splice(fromIndex, 1)
  filtersList.splice(toIndex, 0, movedF)

  const nextFilters: Record<number, { whitelist: string[]; blacklist: string[] }> = {}
  filtersList.forEach((f, i) => {
    nextFilters[i] = f
  })
  return { groupings: nextGroupings, groupingFilters: nextFilters }
}

/** Reindex a per-level sidecar when one level is removed (same index rules as grouping filters). */
export function removeLevelFromRecord<T>(
  record: Record<number, T>,
  removeIndex: number,
  prevLevelCount: number,
): Record<number, T> {
  const out: Record<number, T> = {}
  for (let old = 0; old < prevLevelCount; old++) {
    if (old === removeIndex) continue
    const newIdx = old < removeIndex ? old : old - 1
    if (Object.prototype.hasOwnProperty.call(record, old)) {
      out[newIdx] = record[old]!
    }
  }
  return out
}

export function reorderLevelRecord<T>(
  record: Record<number, T>,
  levelCount: number,
  fromIndex: number,
  toIndex: number,
): Record<number, T> | null {
  if (levelCount <= 0 || fromIndex === toIndex) return null
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= levelCount || toIndex >= levelCount) return null

  const values: (T | undefined)[] = []
  for (let i = 0; i < levelCount; i++) {
    values.push(Object.prototype.hasOwnProperty.call(record, i) ? record[i] : undefined)
  }
  const [moved] = values.splice(fromIndex, 1)
  values.splice(toIndex, 0, moved)

  const out: Record<number, T> = {}
  values.forEach((v, i) => {
    if (v !== undefined) out[i] = v
  })
  return out
}

export function validateGroupingStackForRequest(
  groupings: string[],
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>,
  urlTrackingFieldByLevel?: Record<number, UrlTrackingFieldLevelMeta | null | undefined>,
):
  | {
      ok: true
      levels: Array<{
        groupBy: string
        whitelistFilters: string[]
        blacklistFilters: string[]
      }>
    }
  | { ok: false; message: string } {
  const hasGap = groupings.some(
    (g, i) => !g.trim() && groupings.slice(i + 1).some((x) => x.trim()),
  )
  if (hasGap) {
    return {
      ok: false,
      message: 'Fill each grouping level in order before skipping ahead.',
    }
  }
  const active: string[] = []
  for (const g of groupings) {
    if (!g.trim()) break
    active.push(g.trim())
  }
  if (active.length === 0) {
    return { ok: false, message: 'Select at least one grouping.' }
  }
  if (urlTrackingFieldByLevel) {
    for (let i = 0; i < active.length; i++) {
      const g = active[i]!
      if (!isUrlTrackingFieldGroupingToken(g)) continue
      const meta = urlTrackingFieldByLevel[i]
      if (!meta?.fieldId?.trim()) {
        return {
          ok: false,
          message: `Choose a URL tracking field for level ${i + 1} (tracking fields button next to filters).`,
        }
      }
    }
  }

  const levels = active.map((groupBy, index) => ({
    groupBy,
    whitelistFilters: groupingFilters[index]?.whitelist ?? [],
    blacklistFilters: groupingFilters[index]?.blacklist ?? [],
  }))
  return { ok: true, levels }
}
