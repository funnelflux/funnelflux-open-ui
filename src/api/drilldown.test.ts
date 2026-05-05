import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAllFlatDrilldownRows } from '@/api/drilldown'
import { api } from '@/api/client'
import type { DrilldownRequest, Report } from '@/types/stats'

vi.mock('@/api/client', () => ({
  api: {
    postDrilldown: vi.fn(),
  },
}))

function report(start: number, rowsReturned: number, rowsTotal: number): Report {
  return {
    columns: [
      { name: 'Element: Campaign', type: 'grouping' },
      { name: 'Entrances', type: 'metric' },
    ],
    rows: Array.from({ length: rowsReturned }, (_, i) => ({
      rowId: `row-${start + i}`,
      cells: [
        { raw: String(start + i), formatted: `Row ${start + i}` },
        { raw: 1, formatted: '1' },
      ],
    })),
    totals: { cells: [] },
    rowsReturned,
    rowsTotal,
  }
}

describe('fetchAllFlatDrilldownRows', () => {
  beforeEach(() => {
    vi.mocked(api.postDrilldown).mockReset()
  })

  it('preserves metrics across paged requests', async () => {
    vi.mocked(api.postDrilldown)
      .mockResolvedValueOnce(report(0, 2, 3))
      .mockResolvedValueOnce(report(2, 1, 3))

    const request: DrilldownRequest = {
      timeRange: {} as DrilldownRequest['timeRange'],
      timeZone: { name: 'UTC' },
      groupings: [{ groupBy: 'Element: Campaign', whitelistFilters: [], blacklistFilters: [] }],
      options: { viewType: 'flat' },
      metrics: ['Entrances', 'Revenue'],
    }

    await fetchAllFlatDrilldownRows(request, { pageSize: 2 })

    expect(api.postDrilldown).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api.postDrilldown).mock.calls[0]?.[0]).toMatchObject({
      metrics: ['Entrances', 'Revenue'],
      paging: { start: 0, length: 2 },
    })
    expect(vi.mocked(api.postDrilldown).mock.calls[1]?.[0]).toMatchObject({
      metrics: ['Entrances', 'Revenue'],
      paging: { start: 2, length: 2 },
    })
  })
})
