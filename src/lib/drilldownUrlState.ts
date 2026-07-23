import type { SortingState } from '@tanstack/react-table'
import type { ColumnFilterValue } from '@/lib/drilldownColumnFilters'
import type { DrilldownTimeAttribution } from '@/store/drilldown'
import type { UrlTrackingFieldLevelMeta } from '@/lib/urlTrackingFieldGrouping'

/**
 * Compact, versioned URL-state contract for the Flat Table drilldown report so a report
 * configuration can be bookmarked / shared via the browser URL.
 *
 * Design notes:
 * - Everything serialized here is non-sensitive report *configuration* (date range, groupings,
 *   filters, sorting, visible metrics). Never serialize account ids, session tokens, user data,
 *   or fetched report rows.
 * - The payload is a single JSON object, base64url-encoded, carried in one query param
 *   ({@link DRILLDOWN_URL_STATE_PARAM}). Versioned via {@link DRILLDOWN_URL_STATE_VERSION} so a
 *   stale/foreign link decodes to `null` instead of corrupting current store state.
 * - Decoding is fail-safe: any malformed, truncated, or version-mismatched input returns `null`.
 */

export const DRILLDOWN_URL_STATE_VERSION = 1

/** Single query param that carries the encoded Flat Table report state. */
export const DRILLDOWN_URL_STATE_PARAM = 'r'

export interface DrilldownGroupingFilter {
  whitelist: string[]
  blacklist: string[]
}

export interface DrilldownUrlState {
  dateRange: { start: string; end: string } | null
  timezone: string | null
  groupings: string[]
  groupingFilters: Record<number, DrilldownGroupingFilter>
  urlTrackingFieldByLevel: Record<number, UrlTrackingFieldLevelMeta>
  filtersEnabled: boolean
  columnFilters: Record<string, ColumnFilterValue>
  sorting: SortingState
  /** Visible metric column ids (registry ids, e.g. `visits`, `revenue`). */
  visibleMetricColumnIds: string[]
  pageSize: number
  showFilteredTraffic: boolean
  timeAttribution: DrilldownTimeAttribution
}

/** Wire envelope: short keys keep the encoded payload compact. */
interface UrlStateEnvelope {
  v: number
  ds?: string
  de?: string
  tz?: string
  g?: string[]
  gf?: Record<string, [string[], string[]]>
  tf?: Record<string, UrlTrackingFieldLevelMeta>
  fe?: 0 | 1
  cf?: Record<string, [ColumnFilterValue['kind'], string, string]>
  s?: Array<[string, 0 | 1]>
  m?: string[]
  ps?: number
  sf?: 0 | 1
  ta?: DrilldownTimeAttribution
}

const VALID_FILTER_KINDS: ReadonlySet<ColumnFilterValue['kind']> = new Set(['numeric', 'text'])
const VALID_TIME_ATTRIBUTION: ReadonlySet<DrilldownTimeAttribution> = new Set(['entrance', 'event'])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

// --- base64url <-> UTF-8 JSON ---------------------------------------------

function toBase64Url(json: string): string {
  // Encode as UTF-8 first so non-ASCII grouping values / filters survive btoa().
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

// --- encode ----------------------------------------------------------------

function encodeGroupingFilters(
  filters: Record<number, DrilldownGroupingFilter>,
): Record<string, [string[], string[]]> | undefined {
  const out: Record<string, [string[], string[]]> = {}
  for (const [level, filter] of Object.entries(filters)) {
    const whitelist = filter?.whitelist ?? []
    const blacklist = filter?.blacklist ?? []
    if (whitelist.length === 0 && blacklist.length === 0) continue
    out[level] = [whitelist, blacklist]
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function encodeColumnFilters(
  filters: Record<string, ColumnFilterValue>,
): Record<string, [ColumnFilterValue['kind'], string, string]> | undefined {
  const out: Record<string, [ColumnFilterValue['kind'], string, string]> = {}
  for (const [columnId, filter] of Object.entries(filters)) {
    if (!filter || typeof filter.value !== 'string' || !filter.value.trim()) continue
    out[columnId] = [filter.kind, filter.operator, filter.value]
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * Serialize Flat Table report state to a base64url string suitable for a query param,
 * or `null` when there is nothing meaningful to share (so callers can drop the param).
 */
export function encodeDrilldownUrlState(state: DrilldownUrlState): string | null {
  const envelope: UrlStateEnvelope = { v: DRILLDOWN_URL_STATE_VERSION }

  if (state.dateRange?.start && state.dateRange?.end) {
    envelope.ds = state.dateRange.start
    envelope.de = state.dateRange.end
  }
  if (state.timezone) envelope.tz = state.timezone
  if (state.groupings.length > 0) envelope.g = state.groupings

  const gf = encodeGroupingFilters(state.groupingFilters)
  if (gf) envelope.gf = gf

  if (Object.keys(state.urlTrackingFieldByLevel).length > 0) {
    envelope.tf = state.urlTrackingFieldByLevel
  }
  if (state.filtersEnabled) envelope.fe = 1

  const cf = encodeColumnFilters(state.columnFilters)
  if (cf) envelope.cf = cf

  if (state.sorting.length > 0) {
    envelope.s = state.sorting.map((sort) => [String(sort.id), sort.desc ? 1 : 0])
  }
  if (state.visibleMetricColumnIds.length > 0) envelope.m = state.visibleMetricColumnIds
  if (Number.isFinite(state.pageSize) && state.pageSize > 0) envelope.ps = state.pageSize
  if (state.showFilteredTraffic) envelope.sf = 1
  if (state.timeAttribution && state.timeAttribution !== 'entrance') {
    envelope.ta = state.timeAttribution
  }

  // Nothing beyond the version tag → not worth a URL param.
  if (Object.keys(envelope).length <= 1) return null

  try {
    return toBase64Url(JSON.stringify(envelope))
  } catch {
    return null
  }
}

// --- decode ----------------------------------------------------------------

function decodeGroupingFilters(raw: unknown): Record<number, DrilldownGroupingFilter> {
  const out: Record<number, DrilldownGroupingFilter> = {}
  if (!isPlainObject(raw)) return out
  for (const [level, value] of Object.entries(raw)) {
    const levelNum = Number(level)
    if (!Number.isInteger(levelNum) || levelNum < 0) continue
    if (!Array.isArray(value) || value.length !== 2) continue
    const [whitelist, blacklist] = value
    if (!isStringArray(whitelist) || !isStringArray(blacklist)) continue
    if (whitelist.length === 0 && blacklist.length === 0) continue
    out[levelNum] = { whitelist, blacklist }
  }
  return out
}

function decodeUrlTrackingFieldByLevel(raw: unknown): Record<number, UrlTrackingFieldLevelMeta> {
  const out: Record<number, UrlTrackingFieldLevelMeta> = {}
  if (!isPlainObject(raw)) return out
  for (const [level, value] of Object.entries(raw)) {
    const levelNum = Number(level)
    if (!Number.isInteger(levelNum) || levelNum < 0) continue
    if (!isPlainObject(value)) continue
    const { fieldId, trafficSourceId, trafficSourceName, index1Based } = value
    if (
      typeof fieldId !== 'string' ||
      typeof trafficSourceId !== 'string' ||
      typeof trafficSourceName !== 'string' ||
      typeof index1Based !== 'number' ||
      !Number.isFinite(index1Based)
    ) {
      continue
    }
    out[levelNum] = { fieldId, trafficSourceId, trafficSourceName, index1Based }
  }
  return out
}

function decodeColumnFilters(raw: unknown): Record<string, ColumnFilterValue> {
  const out: Record<string, ColumnFilterValue> = {}
  if (!isPlainObject(raw)) return out
  for (const [columnId, value] of Object.entries(raw)) {
    if (!Array.isArray(value) || value.length !== 3) continue
    const [kind, operator, filterValue] = value
    if (
      typeof kind !== 'string' ||
      !VALID_FILTER_KINDS.has(kind as ColumnFilterValue['kind']) ||
      typeof operator !== 'string' ||
      typeof filterValue !== 'string' ||
      !filterValue.trim()
    ) {
      continue
    }
    out[columnId] = {
      kind,
      operator,
      value: filterValue,
    } as ColumnFilterValue
  }
  return out
}

function decodeSorting(raw: unknown): SortingState {
  if (!Array.isArray(raw)) return []
  const out: SortingState = []
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length !== 2) continue
    const [id, desc] = entry
    if (typeof id !== 'string' || !id) continue
    out.push({ id, desc: desc === 1 || desc === true })
  }
  return out
}

/**
 * Decode a base64url query-param value back into {@link DrilldownUrlState}.
 *
 * Returns `null` for any input that is malformed, truncated, not the expected version, or not a
 * recognizable envelope — callers then fall back to their persisted store / defaults. Each nested
 * structure is validated and bad entries are dropped so a partially-corrupt link still hydrates the
 * good parts without throwing.
 */
export function decodeDrilldownUrlState(encoded: string | null | undefined): DrilldownUrlState | null {
  if (!encoded) return null
  const json = fromBase64Url(encoded)
  if (json === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (!isPlainObject(parsed)) return null

  const envelope = parsed as unknown as UrlStateEnvelope
  if (envelope.v !== DRILLDOWN_URL_STATE_VERSION) return null

  const dateRange =
    typeof envelope.ds === 'string' && typeof envelope.de === 'string' && envelope.ds && envelope.de
      ? { start: envelope.ds, end: envelope.de }
      : null

  const pageSize =
    typeof envelope.ps === 'number' && Number.isFinite(envelope.ps) && envelope.ps > 0
      ? Math.floor(envelope.ps)
      : 0

  const timeAttribution: DrilldownTimeAttribution =
    typeof envelope.ta === 'string' && VALID_TIME_ATTRIBUTION.has(envelope.ta)
      ? envelope.ta
      : 'entrance'

  return {
    dateRange,
    timezone: typeof envelope.tz === 'string' && envelope.tz ? envelope.tz : null,
    groupings: isStringArray(envelope.g) ? envelope.g : [],
    groupingFilters: decodeGroupingFilters(envelope.gf),
    urlTrackingFieldByLevel: decodeUrlTrackingFieldByLevel(envelope.tf),
    filtersEnabled: envelope.fe === 1,
    columnFilters: decodeColumnFilters(envelope.cf),
    sorting: decodeSorting(envelope.s),
    visibleMetricColumnIds: isStringArray(envelope.m) ? envelope.m : [],
    pageSize,
    showFilteredTraffic: envelope.sf === 1,
    timeAttribution,
  }
}
