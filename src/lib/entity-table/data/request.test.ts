import { describe, expect, it } from 'vitest'
import { buildFlatAssetDrilldownRequest } from './request'

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
    expect(body.timeRange?.start?.date).toEqual({ year: 2024, month: 12, day: 31 })
    expect(body.timeRange?.end?.date).toEqual({ year: 2025, month: 1, day: 1 })
    expect(body.timeRange?.start?.time).toEqual({ hour: 0, minutes: 0 })
    expect(body.timeRange?.end?.time).toEqual({ hour: 23, minutes: 59 })
    expect(body.groupings?.[0]?.groupBy).toBe('Pages: Some Page')
    expect(body.options?.viewType).toBe('flat')
    expect(body.responseFormat).toBe('compact-v1')
    expect(body.metrics).toEqual(['Entrances'])
    expect(body.paging).toBeUndefined()
  })

  it('resolves legacy Etc/GMT timezone ids before sending to the API', () => {
    const body = buildFlatAssetDrilldownRequest({
      dateFrom: new Date('2025-01-01T00:00:00.000Z'),
      dateTo: new Date('2025-01-02T00:00:00.000Z'),
      timezone: 'Etc/GMT-2',
      groupBy: 'Campaigns: Campaign',
    })
    expect(body.timeZone).toEqual({ name: 'Europe/Athens' })
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
