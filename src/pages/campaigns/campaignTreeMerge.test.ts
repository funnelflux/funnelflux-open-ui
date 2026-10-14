import { describe, expect, it } from 'vitest'
import { paginateAtomicCategorySegments } from '@/lib/entity-table/engine/paginateCategorySegments'
import {
  buildCampaignFunnelRowsFromGrid,
  buildSortedCampaignSegments,
  filterCampaignFunnelRows,
} from '@/pages/campaigns/campaignTreeMerge'
import type { CampaignArchiveTab, CampaignRow } from '@/pages/campaigns/campaignTreeAdapter'
import { setArchiveOnStatic } from '@/pages/campaigns/campaignStaticPatch'
import {
  buildCampaignTreeStaticData,
  selectFunnelsForTab,
  type CampaignTreeStaticData,
} from '@/pages/campaigns/campaignTreeStatic'
import type { Campaign } from '@/types/entities'
import type { Report } from '@/types/stats'

function makeStatic(): CampaignTreeStaticData {
  return {
    campaigns: [{ id: 'c1', name: 'Campaign A', isArchived: false }],
    orderedFunnels: [
      { id: 'f1', name: 'Funnel One', campaignId: 'c1', campaignName: 'Campaign A', isArchived: false, campaignIsArchived: false },
      { id: 'f2', name: 'Funnel Two', campaignId: 'c1', campaignName: 'Campaign A', isArchived: false, campaignIsArchived: false },
    ],
  }
}

function funnelRow(
  id: string,
  campaignId: string,
  campaignName: string,
  entrances: number,
): CampaignRow {
  return {
    id,
    funnelId: id,
    name: `Funnel ${id}`,
    campaignId,
    campaignName,
    categoryId: campaignId,
    cells: [
      { raw: id, formatted: `Funnel ${id}` },
      { raw: entrances, formatted: String(entrances) },
    ],
  }
}

describe('filterCampaignFunnelRows', () => {
  it('finds funnels outside the first page by name', () => {
    const report: Report = {
      columns: [{ name: 'Element: Funnel', type: 'grouping' }],
      rows: [],
      totals: { cells: [] },
      rowsReturned: 0,
      rowsTotal: 0,
    }
    const funnelRows = buildCampaignFunnelRowsFromGrid(makeStatic(), report)
    const matches = filterCampaignFunnelRows(funnelRows, 'funnel two')
    expect(matches).toHaveLength(1)
    expect(matches[0]?.funnelId).toBe('f2')
  })

  it('includes all funnels when the campaign name matches', () => {
    const report: Report = {
      columns: [{ name: 'Element: Funnel', type: 'grouping' }],
      rows: [],
      totals: { cells: [] },
      rowsReturned: 0,
      rowsTotal: 0,
    }
    const funnelRows = buildCampaignFunnelRowsFromGrid(makeStatic(), report)
    const matches = filterCampaignFunnelRows(funnelRows, 'campaign a')
    expect(matches).toHaveLength(2)
  })
})

describe('buildCampaignFunnelRowsFromGrid', () => {
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

    const funnelRows = buildCampaignFunnelRowsFromGrid(makeStatic(), report)

    expect(funnelRows).toHaveLength(2)
    expect(funnelRows[0]?.funnelId).toBe('f1')
    expect(funnelRows[0]?.cells[1]).toEqual({ raw: 0, formatted: '0' })
    expect(funnelRows[1]?.funnelId).toBe('f2')
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

    const funnelRows = buildCampaignFunnelRowsFromGrid(makeStatic(), report)

    expect(funnelRows).toHaveLength(2)
    expect(funnelRows.find((row) => row.funnelId === 'f2')?.cells[1]).toEqual({ raw: 42, formatted: '42' })
    expect(funnelRows.find((row) => row.funnelId === 'f1')?.cells[1]).toEqual({ raw: 0, formatted: '0' })
  })
})

describe('buildSortedCampaignSegments', () => {
  const columns = [
    { name: 'Element: Funnel', type: 'grouping' as const },
    { name: 'Entrances', type: 'metric' as const },
  ]
  const sorting = [{ id: 'visits', desc: true }]

  it('orders campaigns by aggregated header totals and keeps funnels grouped once', () => {
    const rows = [
      funnelRow('a1', 'a', 'Campaign A', 100),
      funnelRow('a2', 'a', 'Campaign A', 0),
      funnelRow('b1', 'b', 'Campaign B', 50),
    ]

    const segments = buildSortedCampaignSegments(rows, columns, sorting)
    expect(segments.map((segment) => segment.header?.campaignId)).toEqual(['a', 'b'])
    expect(segments[0]?.header?.cells[1]).toMatchObject({ raw: 100 })
    expect(segments[0]?.items.map((row) => row.id)).toEqual(['a1', 'a2'])

    const page = paginateAtomicCategorySegments(segments, 1, 2)
    const headers = page.pageRows.filter((row) => row._isCategoryHeader)
    expect(headers).toHaveLength(1)
    expect(headers[0]?.campaignId).toBe('b')
  })

  it('keeps header totals equal to the sum of visible child rows on the page', () => {
    const rows = [
      funnelRow('a1', 'a', 'Campaign A', 100),
      funnelRow('a2', 'a', 'Campaign A', 8),
      funnelRow('a3', 'a', 'Campaign A', 4),
      funnelRow('a4', 'a', 'Campaign A', 2),
      funnelRow('b1', 'b', 'Campaign B', 50),
    ]

    const segments = buildSortedCampaignSegments(rows, columns, sorting)
    const page = paginateAtomicCategorySegments(segments, 0, 2)
    const header = page.pageRows.find((row) => row._isCategoryHeader)
    const children = page.pageRows.filter((row) => !row._isCategoryHeader)
    const childSum = children.reduce((sum, row) => sum + Number(row.cells[1]?.raw ?? 0), 0)

    expect(header?.cells[1]).toMatchObject({ raw: childSum })
    expect(children.map((row) => row.id)).toEqual(['a1', 'a2', 'a3', 'a4'])
  })

  it('does not place a lower-ranked campaign before a higher-ranked campaign on later pages', () => {
    const rows = [
      funnelRow('a1', 'a', 'Campaign A', 100),
      funnelRow('a2', 'a', 'Campaign A', 0),
      funnelRow('b1', 'b', 'Campaign B', 90),
    ]

    const segments = buildSortedCampaignSegments(rows, columns, sorting)
    const page = paginateAtomicCategorySegments(segments, 1, 2)
    const dataRows = page.pageRows.filter((row) => !row._isCategoryHeader)
    expect(dataRows.map((row) => row.id)).toEqual(['b1'])
  })
})

describe('buildCampaignTreeStaticData', () => {
  it('orders campaigns and each campaign\'s funnels by name regardless of payload order', () => {
    const data = buildCampaignTreeStaticData(
      [
        { idCampaign: 'z', campaignName: 'Zulu', isArchived: false },
        { idCampaign: 'a', campaignName: 'Alpha', isArchived: false },
      ] as Campaign[],
      [
        { id: 'z2', name: 'Zeta', idCampaign: 'z' },
        { id: 'a2', name: 'Beta', idCampaign: 'a' },
        { id: 'z1', name: 'Eta', idCampaign: 'z' },
        { id: 'a1', name: 'Alef', idCampaign: 'a' },
      ],
    )
    expect(data.campaigns.map((c) => c.id)).toEqual(['a', 'z'])
    expect(data.orderedFunnels.map((f) => f.id)).toEqual(['a1', 'a2', 'z1', 'z2'])
  })
})

describe('campaign archive tabs', () => {
  // Active campaign "live" with one archived funnel; archived campaign "old" with one non-archived funnel.
  const staticData = buildCampaignTreeStaticData(
    [
      { idCampaign: 'live', campaignName: 'Live', isArchived: false },
      { idCampaign: 'old', campaignName: 'Old', isArchived: true },
    ] as Campaign[],
    [
      { id: 'live-on', name: 'Live 1', idCampaign: 'live', isArchived: false },
      { id: 'live-off', name: 'Live 2', idCampaign: 'live', isArchived: true },
      { id: 'old-on', name: 'Old 1', idCampaign: 'old', isArchived: false },
      { id: 'orphan', name: 'Orphan', idCampaign: 'missing', isArchived: false },
    ],
  )
  const ids = (tab: CampaignArchiveTab) => selectFunnelsForTab(staticData, tab).map((f) => f.id)

  it('active shows only non-archived funnels under non-archived campaigns', () => {
    expect(ids('active')).toEqual(['live-on'])
  })

  it('archived shows archived funnels under active campaigns and every funnel of archived campaigns', () => {
    expect(ids('archived')).toEqual(['live-off', 'old-on'])
  })

  it('all shows every funnel whose campaign exists', () => {
    expect(ids('all')).toEqual(['live-on', 'live-off', 'old-on'])
  })

  it('header archive state follows the campaign while funnel rows keep their own flag', () => {
    const report: Report = {
      columns: [{ name: 'Element: Funnel', type: 'grouping' }],
      rows: [],
      totals: { cells: [] },
      rowsReturned: 0,
      rowsTotal: 0,
    }
    const archivedTab = { ...staticData, orderedFunnels: selectFunnelsForTab(staticData, 'archived') }
    const rows = buildCampaignFunnelRowsFromGrid(archivedTab, report)
    const segments = buildSortedCampaignSegments(rows, report.columns, [])
    const live = segments.find((s) => s.header?.campaignId === 'live')
    const old = segments.find((s) => s.header?.campaignId === 'old')

    expect(live?.header?.isArchived).toBe(false)
    expect(live?.items.map((r) => [r.id, r.isArchived])).toEqual([['live-off', true]])
    expect(old?.header?.isArchived).toBe(true)
    expect(old?.items.map((r) => [r.id, r.isArchived])).toEqual([['old-on', false]])
  })

  it('archiving a funnel moves it from active to archived', () => {
    const next = setArchiveOnStatic(staticData, null, 'live-on', true)
    expect(selectFunnelsForTab(next, 'active')).toEqual([])
    expect(selectFunnelsForTab(next, 'archived').map((f) => f.id)).toEqual(['live-on', 'live-off', 'old-on'])
  })

  it('restoring a campaign returns its non-archived funnels to active and unflags the campaign', () => {
    const next = setArchiveOnStatic(staticData, 'old', null, false)
    expect(next.campaigns.find((c) => c.id === 'old')?.isArchived).toBe(false)
    expect(selectFunnelsForTab(next, 'active').map((f) => f.id)).toEqual(['live-on', 'old-on'])
    expect(selectFunnelsForTab(next, 'archived').map((f) => f.id)).toEqual(['live-off'])
  })

  it('archiving a campaign hides all its funnels from active', () => {
    const next = setArchiveOnStatic(staticData, 'live', null, true)
    expect(selectFunnelsForTab(next, 'active')).toEqual([])
    expect(selectFunnelsForTab(next, 'archived').map((f) => f.id)).toEqual(['live-on', 'live-off', 'old-on'])
  })
})

describe('campaign client pagination', () => {
  it('paginates search hits across the full funnel list', () => {
    const staticData = makeStatic()
    staticData.orderedFunnels.push({
      id: 'f99',
      name: 'Unique Zebra Funnel',
      campaignId: 'c1',
      campaignName: 'Campaign A',
      isArchived: false,
      campaignIsArchived: false,
    })

    const report: Report = {
      columns: [{ name: 'Element: Funnel', type: 'grouping' }],
      rows: [],
      totals: { cells: [] },
      rowsReturned: 0,
      rowsTotal: 0,
    }

    const funnelRows = buildCampaignFunnelRowsFromGrid(staticData, report)
    const filtered = filterCampaignFunnelRows(funnelRows, 'zebra')
    const segments = buildSortedCampaignSegments(filtered, report.columns ?? [], [])
    const page = paginateAtomicCategorySegments(segments, 0, 1)

    expect(page.totalDataCount).toBe(1)
    expect(page.pageRows[1]?.name).toBe('Unique Zebra Funnel')
  })

  it('includes zero-visit funnels when paginating at small page sizes', () => {
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
            { raw: 5, formatted: '5' },
          ],
        },
      ],
      totals: { cells: [] },
      rowsReturned: 1,
      rowsTotal: 1,
    }

    const funnelRows = buildCampaignFunnelRowsFromGrid(makeStatic(), report)
    const segments = buildSortedCampaignSegments(funnelRows, report.columns ?? [], [])
    const page = paginateAtomicCategorySegments(segments, 0, 1)

    expect(page.totalDataCount).toBe(2)
    expect(page.pageRows.some((row) => row.funnelId === 'f1')).toBe(true)
    expect(page.pageRows.some((row) => row.funnelId === 'f2')).toBe(true)
  })
})
