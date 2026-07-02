import { describe, expect, it } from 'vitest'
import {
  resolveColumnsForFilters,
  withReportColumnFilters,
} from '@/pages/reports/drilldownReportRequest'
import type { DrilldownRequest, Report } from '@/types/stats'

const reportColumns = [
  { name: 'Element: Campaign', type: 'grouping' },
  { name: 'Revenue', type: 'metric' },
  { name: 'Entrances', type: 'metric' },
] as Report['columns']

const request = {
  timeRange: {
    start: { date: '2026-06-08', time: '00:00:00' },
    end: { date: '2026-06-08', time: '23:59:59' },
  },
  timeZone: { name: 'UTC' },
  groupings: [{ groupBy: 'Element: Campaign', whitelistFilters: [], blacklistFilters: [] }],
  paging: { start: 0, length: 100 },
} as unknown as DrilldownRequest

describe('withReportColumnFilters', () => {
  it('builds Flat Report text and metric column filters', () => {
    expect(withReportColumnFilters(request, reportColumns, {
      'grouping-0': { kind: 'text', operator: 'contains', value: 'brand' },
      revenue: { kind: 'numeric', operator: '>', value: '10' },
    }).columnFilters).toEqual({
      filterColumns: [
        { columnName: 'Element: Campaign', filter: '*brand*' },
        { columnName: 'Revenue', filter: '>10' },
      ],
    })
  })

  it('builds Tree Report filters for initial and lazy child requests', () => {
    const treeRequest = { ...request, options: { viewType: 'tree' as const } }
    const filters = {
      name: { kind: 'text' as const, operator: 'equals' as const, value: 'Campaign A' },
      visits: { kind: 'numeric' as const, operator: '>=' as const, value: '5' },
    }
    const initial = withReportColumnFilters(treeRequest, reportColumns, filters)
    const lazyChild = withReportColumnFilters(
      {
        ...initial,
        groupings: [{ groupBy: 'Element: Campaign', whitelistFilters: ['camp-1'], blacklistFilters: [] }],
      },
      reportColumns,
      filters,
    )

    expect(initial.columnFilters).toEqual({
      filterColumns: [
        { columnName: 'Element: Campaign', filter: 'Campaign A' },
        { columnName: 'Entrances', filter: '>=5' },
      ],
    })
    expect(lazyChild.columnFilters).toEqual(initial.columnFilters)
  })

  it('drops header/dimension filters when report columns are not yet available', () => {
    // Regression guard: before the first report response (report === undefined) the UI ids cannot
    // be mapped to API column names, so filters are silently dropped. resolveColumnsForFilters must
    // be used to recover them from the last-known column shape.
    const dropped = withReportColumnFilters(request, undefined, {
      'grouping-0': { kind: 'text', operator: 'contains', value: 'brand' },
    })
    expect(dropped.columnFilters).toBeUndefined()
  })

  it('encodes a pending header filter on the first Apply once columns are known via fallback', () => {
    // User entered a header filter (held in columnFilters state) while the live report was
    // transiently undefined. On Apply we resolve columns from the last-known snapshot so the
    // grouping/header filter still reaches the API as columnFilters.filterColumns.
    const pendingFilters = {
      'grouping-0': { kind: 'text' as const, operator: 'contains' as const, value: 'brand' },
      revenue: { kind: 'numeric' as const, operator: '>' as const, value: '10' },
    }
    const liveColumns: Report['columns'] | undefined = undefined
    const columns = resolveColumnsForFilters(liveColumns, reportColumns)

    const applied = withReportColumnFilters(request, columns, pendingFilters)

    expect(applied.columnFilters).toEqual({
      filterColumns: [
        { columnName: 'Element: Campaign', filter: '*brand*' },
        { columnName: 'Revenue', filter: '>10' },
      ],
    })
  })

  it('resolveColumnsForFilters prefers live columns and falls back to last-known', () => {
    const liveColumns = [{ name: 'Element: Funnel', type: 'grouping' }] as Report['columns']
    expect(resolveColumnsForFilters(liveColumns, reportColumns)).toBe(liveColumns)
    expect(resolveColumnsForFilters(undefined, reportColumns)).toBe(reportColumns)
    expect(resolveColumnsForFilters([] as Report['columns'], reportColumns)).toBe(reportColumns)
    expect(resolveColumnsForFilters(undefined, null)).toBeUndefined()
  })
})
