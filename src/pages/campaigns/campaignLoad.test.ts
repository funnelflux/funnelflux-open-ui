import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCampaignPageData } from './campaignLoad'
import * as drilldownMod from '@/api/drilldown'
import * as campaignTreeUtils from './campaignTreeUtils'
import type { Report } from '@/types/stats'

vi.mock('@/api/drilldown', () => ({
  fetchAllFlatDrilldownRows: vi.fn(),
}))

vi.mock('./campaignTreeUtils', async () => {
  const actual = await vi.importActual<typeof import('./campaignTreeUtils')>('./campaignTreeUtils')
  return {
    ...actual,
    fetchCampaignHierarchyWire: vi.fn(),
  }
})

describe('loadCampaignPageData', () => {
  const emptyReport: Report = {
    columns: [{ name: 'Element: Funnel', type: 'grouping' }],
    rows: [],
    totals: { cells: [{ raw: '', formatted: '' }] },
    rowsReturned: 0,
    rowsTotal: 0,
  }

  beforeEach(() => {
    vi.mocked(drilldownMod.fetchAllFlatDrilldownRows).mockReset()
    vi.mocked(campaignTreeUtils.fetchCampaignHierarchyWire).mockReset()
  })

  it('attributes errors to campaign hierarchy when hierarchy fails alone', async () => {
    vi.mocked(campaignTreeUtils.fetchCampaignHierarchyWire).mockRejectedValueOnce(new Error('network down'))
    vi.mocked(drilldownMod.fetchAllFlatDrilldownRows).mockResolvedValueOnce(emptyReport)

    await expect(
      loadCampaignPageData({
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-02'),
        timezone: 'UTC',
      }),
    ).rejects.toThrow(/Campaign hierarchy failed:.*network down/)
  })

  it('attributes errors to campaign stats when drilldown fails alone', async () => {
    vi.mocked(campaignTreeUtils.fetchCampaignHierarchyWire).mockResolvedValueOnce({ campaigns: [] })
    vi.mocked(drilldownMod.fetchAllFlatDrilldownRows).mockRejectedValueOnce(new Error('drilldown boom'))

    await expect(
      loadCampaignPageData({
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-02'),
        timezone: 'UTC',
      }),
    ).rejects.toThrow(/Campaign stats failed:.*drilldown boom/)
  })

  it('includes both failure messages when hierarchy and stats both fail', async () => {
    vi.mocked(campaignTreeUtils.fetchCampaignHierarchyWire).mockRejectedValueOnce(new Error('a'))
    vi.mocked(drilldownMod.fetchAllFlatDrilldownRows).mockRejectedValueOnce(new Error('b'))

    await expect(
      loadCampaignPageData({
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-02'),
        timezone: 'UTC',
      }),
    ).rejects.toThrow('Campaign hierarchy failed: a. Campaign stats failed: b')
  })
})
