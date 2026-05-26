import { describe, expect, it } from 'vitest'
import { buildCampaignTreeDrilldownRequest, buildFlatAssetDrilldownRequest } from './request'
import { MAX_ASSET_TABLE_PAGE_SIZE } from './pagination'

describe('buildFlatAssetDrilldownRequest', () => {
  it('builds a flat drilldown body with groupings and optional metrics', () => {
    const from = new Date('2025-01-01T00:00:00.000Z')
    const to = new Date('2025-01-02T00:00:00.000Z')
    const body = buildFlatAssetDrilldownRequest({
      dateFrom: from,
      dateTo: to,
      timezone: 'America/New_York',
      groupBy: 'Pages: Some Page',
      metrics: ['Entrances'],
    })
    expect(body.timeZone).toEqual({ name: 'America/New_York' })
    expect(body.groupings?.[0]?.groupBy).toBe('Pages: Some Page')
    expect(body.options?.viewType).toBe('flat')
    expect(body.responseFormat).toBe('compact-v1')
    expect(body.metrics).toEqual(['Entrances'])
    expect(body.paging).toBeUndefined()
  })

  it('requests backend-owned active missing asset rows', () => {
    const body = buildFlatAssetDrilldownRequest({
      dateFrom: new Date('2025-01-01T00:00:00.000Z'),
      dateTo: new Date('2025-01-02T00:00:00.000Z'),
      timezone: 'UTC',
      groupBy: 'Element: Lander',
      groupings: ['Element: Lander-Offer Category', 'Element: Lander'],
      metrics: ['Entrances'],
      includeMissingAssets: true,
      assetStatus: 'active',
    })

    expect(body.groupings?.map((g) => g.groupBy)).toEqual([
      'Element: Lander-Offer Category',
      'Element: Lander',
    ])
    expect(body.options).toMatchObject({
      viewType: 'flat',
      includeMissingAssets: true,
      assetStatus: 'active',
    })
    expect(body.responseFormat).toBe('compact-v1')
  })

  it('passes archived missing asset status', () => {
    const body = buildFlatAssetDrilldownRequest({
      dateFrom: new Date('2025-01-01T00:00:00.000Z'),
      dateTo: new Date('2025-01-02T00:00:00.000Z'),
      timezone: 'UTC',
      groupBy: 'Third Parties: Traffic Source',
      metrics: ['Entrances'],
      includeMissingAssets: true,
      assetStatus: 'archived',
    })

    expect(body.options?.assetStatus).toBe('archived')
    expect(body.options?.includeMissingAssets).toBe(true)
  })

  it('passes all missing asset status', () => {
    const body = buildFlatAssetDrilldownRequest({
      dateFrom: new Date('2025-01-01T00:00:00.000Z'),
      dateTo: new Date('2025-01-02T00:00:00.000Z'),
      timezone: 'UTC',
      groupBy: 'Third Parties: Offer Source',
      metrics: ['Entrances'],
      includeMissingAssets: true,
      assetStatus: 'all',
    })

    expect(body.options?.assetStatus).toBe('all')
    expect(body.options?.showArchivedAssets).toBeUndefined()
  })
})

describe('buildCampaignTreeDrilldownRequest', () => {
  it('caps length at MAX_ASSET_TABLE_PAGE_SIZE and uses funnel grouping', () => {
    const from = new Date('2025-03-01T00:00:00.000Z')
    const to = new Date('2025-03-02T00:00:00.000Z')
    const body = buildCampaignTreeDrilldownRequest({
      dateFrom: from,
      dateTo: to,
      timezone: 'UTC',
      groupBy: 'Element: Funnel',
      pageIndex: 1,
      pageSize: 9999,
      sorting: { sortingColumns: [{ columnName: 'Entrances', order: 'desc' }] },
    })
    expect(body.groupings?.[0]?.groupBy).toBe('Element: Funnel')
    expect(body.paging).toEqual({
      start: MAX_ASSET_TABLE_PAGE_SIZE,
      length: MAX_ASSET_TABLE_PAGE_SIZE,
    })
    expect(body.sorting).toEqual({
      sortingColumns: [{ columnName: 'Entrances', order: 'desc' }],
    })
  })

  it('computes start from pageIndex and clamped page size', () => {
    const from = new Date('2025-01-01T00:00:00.000Z')
    const to = new Date('2025-01-02T00:00:00.000Z')
    const body = buildCampaignTreeDrilldownRequest({
      dateFrom: from,
      dateTo: to,
      timezone: 'UTC',
      groupBy: 'Element: Funnel',
      pageIndex: 2,
      pageSize: 50,
    })
    expect(body.paging).toEqual({ start: 100, length: 50 })
  })
})
