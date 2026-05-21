import { describe, expect, it } from 'vitest'
import { buildCampaignTreePageData, filterOrderedFunnelsBySearch } from '@/pages/campaigns/campaignTreeMerge'
import type { CampaignTreeStaticData } from '@/pages/campaigns/campaignTreeStatic'
import type { Report } from '@/types/stats'

function makeStatic(): CampaignTreeStaticData {
  return {
    campaigns: [
      {
        id: 'c1',
        name: 'Campaign A',
        funnels: [
          { id: 'f1', name: 'Funnel One' },
          { id: 'f2', name: 'Funnel Two' },
        ],
      },
    ],
    campaignArchivedById: new Map([['c1', false]]),
    funnelById: new Map([
      ['f1', { campaignId: 'c1', campaignName: 'Campaign A', isArchived: false }],
      ['f2', { campaignId: 'c1', campaignName: 'Campaign A', isArchived: false }],
    ]),
    orderedFunnels: [
      { id: 'f1', name: 'Funnel One', campaignId: 'c1', campaignName: 'Campaign A', isArchived: false },
      { id: 'f2', name: 'Funnel Two', campaignId: 'c1', campaignName: 'Campaign A', isArchived: false },
    ],
  }
}

describe('filterOrderedFunnelsBySearch', () => {
  it('finds funnels outside the first page by name', () => {
    const matches = filterOrderedFunnelsBySearch(makeStatic(), 'funnel two')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.id).toBe('f2')
  })

  it('includes all funnels when the campaign name matches', () => {
    const matches = filterOrderedFunnelsBySearch(makeStatic(), 'campaign a')
    expect(matches).toHaveLength(2)
  })
})

describe('buildCampaignTreePageData', () => {
  it('shows hierarchy funnels with zero stats when drilldown rows are empty', () => {
    const report: Report = {
      columns: [
        { name: 'Element: Funnel', type: 'grouping' },
        { name: 'Entrances', type: 'metric' },
      ],
      rows: [],
      totals: { cells: [] },
      rowsReturned: 0,
      rowsTotal: 0,
    }

    const page = buildCampaignTreePageData(makeStatic(), report, { pageIndex: 0, pageSize: 50 })

    expect(page.totalRows).toBe(2)
    expect(page.rows).toHaveLength(3)
    expect(page.rows[0]._isCategoryHeader).toBe(true)
    expect(page.rows[1].funnelId).toBe('f1')
    expect(page.rows[1].name).toBe('Funnel One')
    expect(page.rows[1].cells[1]).toEqual({ raw: 0, formatted: '0' })
    expect(page.rows[2].funnelId).toBe('f2')
  })

  it('paginates search hits across the full hierarchy list', () => {
    const staticData = makeStatic()
    staticData.orderedFunnels.push({
      id: 'f99',
      name: 'Unique Zebra Funnel',
      campaignId: 'c1',
      campaignName: 'Campaign A',
      isArchived: false,
    })
    staticData.funnelById.set('f99', {
      campaignId: 'c1',
      campaignName: 'Campaign A',
      isArchived: false,
    })

    const report: Report = {
      columns: [{ name: 'Element: Funnel', type: 'grouping' }],
      rows: [],
      totals: { cells: [] },
      rowsReturned: 0,
      rowsTotal: 0,
    }

    const page = buildCampaignTreePageData(staticData, report, {
      pageIndex: 0,
      pageSize: 1,
      search: 'zebra',
    })

    expect(page.totalRows).toBe(1)
    expect(page.rows[1]?.name).toBe('Unique Zebra Funnel')
  })

  it('merges drilldown stats onto hierarchy funnels when rows exist', () => {
    const report: Report = {
      columns: [
        { name: 'Element: Funnel', type: 'grouping' },
        { name: 'Entrances', type: 'metric' },
      ],
      rows: [
        {
          rowId: 'r1',
          cells: [
            { raw: 'f2', formatted: 'Funnel Two' },
            { raw: 42, formatted: '42' },
          ],
        },
      ],
      totals: { cells: [] },
      rowsReturned: 1,
      rowsTotal: 1,
    }

    const page = buildCampaignTreePageData(makeStatic(), report, { pageIndex: 0, pageSize: 50 })

    expect(page.rows).toHaveLength(2)
    expect(page.rows[1].funnelId).toBe('f2')
    expect(page.rows[1].cells[1]).toEqual({ raw: 42, formatted: '42' })
  })
})
