import { describe, expect, it } from 'vitest'
import {
  DRILLDOWN_URL_STATE_VERSION,
  decodeDrilldownUrlState,
  encodeDrilldownUrlState,
  type DrilldownUrlState,
} from '@/lib/drilldownUrlState'

function baseState(overrides: Partial<DrilldownUrlState> = {}): DrilldownUrlState {
  return {
    dateRange: { start: '2026-01-01T00:00:00.000Z', end: '2026-01-31T23:59:59.000Z' },
    timezone: 'America/New_York',
    groupings: ['Element: Campaign', 'Element: Funnel'],
    groupingFilters: {},
    urlTrackingFieldByLevel: {},
    filtersEnabled: false,
    columnFilters: {},
    sorting: [{ id: 'visits', desc: true }],
    visibleMetricColumnIds: ['visits', 'revenue', 'cost'],
    pageSize: 100,
    showFilteredTraffic: false,
    timeAttribution: 'entrance',
    ...overrides,
  }
}

describe('encode/decode round trip', () => {
  it('round-trips a fully populated state', () => {
    const state = baseState({
      groupingFilters: { 0: { whitelist: ['a', 'b'], blacklist: [] }, 1: { whitelist: [], blacklist: ['x'] } },
      urlTrackingFieldByLevel: {
        1: { fieldId: 'utm_source', trafficSourceId: 'ts-1', trafficSourceName: 'Google', index1Based: 1 },
      },
      filtersEnabled: true,
      columnFilters: {
        'grouping-0': { kind: 'text', operator: 'contains', value: 'foo' },
        revenue: { kind: 'numeric', operator: '>', value: '20' },
      },
      sorting: [{ id: 'revenue', desc: false }],
      showFilteredTraffic: true,
      timeAttribution: 'event',
    })

    const encoded = encodeDrilldownUrlState(state)
    expect(encoded).toBeTruthy()
    const decoded = decodeDrilldownUrlState(encoded)
    expect(decoded).toEqual(state)
  })

  it('round-trips non-ASCII grouping filter values', () => {
    const state = baseState({
      groupingFilters: { 0: { whitelist: ['Iñtërnâtiônàližætiøn', '日本語'], blacklist: [] } },
    })
    const decoded = decodeDrilldownUrlState(encodeDrilldownUrlState(state))
    expect(decoded?.groupingFilters).toEqual(state.groupingFilters)
  })

  it('omits empty grouping/column filters and default time attribution', () => {
    const encoded = encodeDrilldownUrlState(
      baseState({
        groupingFilters: { 0: { whitelist: [], blacklist: [] } },
        columnFilters: { revenue: { kind: 'numeric', operator: '>', value: '   ' } },
      }),
    )
    const decoded = decodeDrilldownUrlState(encoded)
    expect(decoded?.groupingFilters).toEqual({})
    expect(decoded?.columnFilters).toEqual({})
    expect(decoded?.timeAttribution).toBe('entrance')
  })

  it('returns null when there is nothing meaningful to encode', () => {
    const encoded = encodeDrilldownUrlState({
      dateRange: null,
      timezone: null,
      groupings: [],
      groupingFilters: {},
      urlTrackingFieldByLevel: {},
      filtersEnabled: false,
      columnFilters: {},
      sorting: [],
      visibleMetricColumnIds: [],
      pageSize: 0,
      showFilteredTraffic: false,
      timeAttribution: 'entrance',
    })
    expect(encoded).toBeNull()
  })
})

describe('decode fail-safe behaviour', () => {
  it('returns null for empty/undefined input', () => {
    expect(decodeDrilldownUrlState(null)).toBeNull()
    expect(decodeDrilldownUrlState(undefined)).toBeNull()
    expect(decodeDrilldownUrlState('')).toBeNull()
  })

  it('returns null for non-base64 garbage', () => {
    expect(decodeDrilldownUrlState('!!!not base64!!!')).toBeNull()
  })

  it('returns null for valid base64 that is not JSON', () => {
    expect(decodeDrilldownUrlState(btoa('not json at all'))).toBeNull()
  })

  it('returns null for a mismatched/stale version', () => {
    const encoded = encodeDrilldownUrlState(baseState())
    const json = JSON.parse(atob(encoded!.replace(/-/g, '+').replace(/_/g, '/')))
    json.v = DRILLDOWN_URL_STATE_VERSION + 1
    const stale = btoa(JSON.stringify(json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(decodeDrilldownUrlState(stale)).toBeNull()
  })

  it('drops malformed nested entries but keeps the good ones', () => {
    const envelope = {
      v: DRILLDOWN_URL_STATE_VERSION,
      g: ['Element: Campaign', 42], // 42 is invalid -> whole array rejected
      gf: { 0: [['a'], []], 1: ['bad'] }, // level 1 malformed
      cf: { revenue: ['numeric', '>', '5'], bad: ['unknownKind', '=', '1'] },
      s: [['visits', 1], ['bad-entry']],
    }
    const encoded = btoa(JSON.stringify(envelope)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const decoded = decodeDrilldownUrlState(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded?.groupings).toEqual([]) // mixed-type array rejected
    expect(decoded?.groupingFilters).toEqual({ 0: { whitelist: ['a'], blacklist: [] } })
    expect(decoded?.columnFilters).toEqual({ revenue: { kind: 'numeric', operator: '>', value: '5' } })
    expect(decoded?.sorting).toEqual([{ id: 'visits', desc: true }])
  })

  it('coerces an invalid time attribution to the default', () => {
    const envelope = { v: DRILLDOWN_URL_STATE_VERSION, ta: 'nonsense', tz: 'UTC' }
    const encoded = btoa(JSON.stringify(envelope)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(decodeDrilldownUrlState(encoded)?.timeAttribution).toBe('entrance')
  })
})
