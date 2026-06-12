import { describe, expect, it } from 'vitest'
import {
  buildDrilldownRequestForTab,
  buildQuickStatsLoadBody,
  narrowReportToQuickStatsColumns,
  QUICKSTATS_STANDARD_METRICS,
  STATS_GROUP_BY,
} from '@/lib/funnelQuickStats'

const args = {
  campaignId: 'campaign-1',
  funnelId: 'funnel-1',
  dateFrom: new Date('2026-06-01T00:00:00.000Z'),
  dateTo: new Date('2026-06-07T23:59:00.000Z'),
  timeZone: { name: 'UTC' },
}

describe('funnel quick stats request builders', () => {
  it('builds regular tabs as scoped drilldown requests with the standard quickstats metric set', () => {
    const body = buildDrilldownRequestForTab('day-parting', args)

    expect(body).toMatchObject({
      topLevelFilters: [
        {
          groupBy: STATS_GROUP_BY.elementFunnel,
          whitelistFilters: ['funnel-1'],
          blacklistFilters: [],
        },
      ],
      groupings: [{ groupBy: STATS_GROUP_BY.dayParting, whitelistFilters: [], blacklistFilters: [] }],
      options: {
        viewType: 'flat',
        idCampaignFilter: 'campaign-1',
        idFunnelFilter: 'funnel-1',
      },
      paging: { start: 0, length: 500 },
      sorting: { sortingColumns: [{ columnName: 'Entrances', order: 'desc' }] },
      metrics: [...QUICKSTATS_STANDARD_METRICS],
    })
  })

  it('builds quickstats load bodies with reporting-timezone wall clock fields', () => {
    const body = buildQuickStatsLoadBody('historical-perf', {
      ...args,
      timeZone: { name: 'Asia/Tehran' },
      // 2026-06-01 22:00 UTC is already 2026-06-02 in Tehran — UTC getters would send the wrong day.
      dateFrom: new Date('2026-06-01T22:00:00.000Z'),
      dateTo: new Date('2026-06-07T22:00:00.000Z'),
    })

    expect(body?.currentPeriod.timeRange.start.date).toEqual({ year: 2026, month: 6, day: 2 })
    expect(body?.currentPeriod.timeRange.end.date).toEqual({ year: 2026, month: 6, day: 8 })
  })

  it('keeps tree quickstats tabs on drilldown with the same standard metric set', () => {
    const body = buildDrilldownRequestForTab('conversion-paths-all-nodes', args)

    expect(body?.options?.viewType).toBe('tree')
    expect(body?.groupings).toEqual([
      { groupBy: STATS_GROUP_BY.conversionPathAllNodes, whitelistFilters: [], blacklistFilters: [] },
    ])
    expect(body?.metrics).toEqual([...QUICKSTATS_STANDARD_METRICS])
  })

  it('builds tracking-field tabs as scoped drilldown requests with tracking field mappings', () => {
    const body = buildDrilldownRequestForTab('tracking-fields', {
      ...args,
      trafficSourceId: 'traffic-source-1',
      trackingFieldName: 'campaign_id',
    })

    expect(body).toMatchObject({
      topLevelFilters: [
        {
          groupBy: STATS_GROUP_BY.elementFunnel,
          whitelistFilters: ['funnel-1'],
          blacklistFilters: [],
        },
        {
          groupBy: STATS_GROUP_BY.trafficSource,
          whitelistFilters: ['traffic-source-1'],
          blacklistFilters: [],
        },
      ],
      groupings: [{ groupBy: '__TRACKING_FIELD_1__', whitelistFilters: [], blacklistFilters: [] }],
      trackingFieldMappings: {
        __TRACKING_FIELD_1__: { id: 'campaign_id' },
      },
      metrics: [...QUICKSTATS_STANDARD_METRICS],
    })
  })

  it('projects legacy quickstats reports down to grouping plus standard metric columns', () => {
    const report = narrowReportToQuickStatsColumns({
      columns: [
        { name: 'Time: Day-Parting', type: 'grouping' },
        { name: 'Entrances', type: 'metric' },
        { name: 'Unique Entrances', type: 'metric' },
        { name: 'Revenue', type: 'metric' },
        { name: 'Unique CPe', type: 'metric' },
      ],
      rows: [
        {
          rowId: 'row-1',
          cells: [
            { formatted: 'Monday', raw: 'Monday' },
            { formatted: '12', raw: 12 },
            { formatted: '9', raw: 9 },
            { formatted: '45.00', raw: 45 },
            { formatted: '0.0000', raw: 0 },
          ],
        },
      ],
      totals: {
        cells: [
          { formatted: '', raw: '' },
          { formatted: '12', raw: 12 },
          { formatted: '9', raw: 9 },
          { formatted: '45.00', raw: 45 },
          { formatted: '0.0000', raw: 0 },
        ],
      },
      rowsReturned: 1,
      rowsTotal: 1,
    })

    expect(report.columns.map((column) => column.name)).toEqual(['Time: Day-Parting', 'Entrances', 'Revenue'])
    expect(report.rows[0]?.cells.map((cell) => cell.formatted)).toEqual(['Monday', '12', '45.00'])
    expect(report.totals.cells.map((cell) => cell.formatted)).toEqual(['', '12', '45.00'])
  })
})
