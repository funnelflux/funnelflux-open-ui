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

  it('continues paging when rowsTotal and totalRecords are zero but a full page was returned', async () => {
    const fullPage = (start: number): Report => ({
      columns: [
        { name: 'Element: Funnel', type: 'grouping' },
        { name: 'Entrances', type: 'metric' },
      ],
      rows: Array.from({ length: 2 }, (_, i) => ({
        rowId: `row-${start + i}`,
        cells: [
          { raw: String(start + i), formatted: `Funnel ${start + i}` },
          { raw: 1, formatted: '1' },
        ],
      })),
      totals: { cells: [] },
      rowsReturned: 2,
      rowsTotal: 0,
      paging: { start, length: 2, totalRecords: 0 },
    })

    vi.mocked(api.postDrilldown)
      .mockResolvedValueOnce(fullPage(0))
      .mockResolvedValueOnce({
        ...fullPage(2),
        rows: [
          {
            rowId: 'row-2',
            cells: [
              { raw: '2', formatted: 'Funnel 2' },
              { raw: 1, formatted: '1' },
            ],
          },
        ],
        rowsReturned: 1,
        rowsTotal: 3,
        paging: { start: 2, length: 1, totalRecords: 3 },
      })

    const request: DrilldownRequest = {
      timeRange: {} as DrilldownRequest['timeRange'],
      timeZone: { name: 'UTC' },
      groupings: [{ groupBy: 'Element: Funnel', whitelistFilters: [], blacklistFilters: [] }],
      options: { viewType: 'flat' },
    }

    const merged = await fetchAllFlatDrilldownRows(request, { pageSize: 2 })

    expect(api.postDrilldown).toHaveBeenCalledTimes(2)
    expect(merged.rows).toHaveLength(3)
    expect(merged.isComplete).toBe(true)
  })

  it('calls onFirstPage once for multi-page fetches and marks the final report complete', async () => {
    vi.mocked(api.postDrilldown)
      .mockResolvedValueOnce(report(0, 2, 3))
      .mockResolvedValueOnce(report(2, 1, 3))

    const onFirstPage = vi.fn()
    const request: DrilldownRequest = {
      timeRange: {} as DrilldownRequest['timeRange'],
      timeZone: { name: 'UTC' },
      groupings: [{ groupBy: 'Element: Campaign', whitelistFilters: [], blacklistFilters: [] }],
      options: { viewType: 'flat' },
    }

    const merged = await fetchAllFlatDrilldownRows(request, { pageSize: 2, onFirstPage })

    expect(onFirstPage).toHaveBeenCalledTimes(1)
    expect(onFirstPage.mock.calls[0]?.[0]).toMatchObject({
      rowsReturned: 2,
      isComplete: false,
    })
    expect(merged.rows).toHaveLength(3)
    expect(merged.isComplete).toBe(true)
  })

  it('does not call onFirstPage when a single page covers the full result', async () => {
    vi.mocked(api.postDrilldown).mockResolvedValueOnce(report(0, 1, 1))

    const onFirstPage = vi.fn()
    const request: DrilldownRequest = {
      timeRange: {} as DrilldownRequest['timeRange'],
      timeZone: { name: 'UTC' },
      groupings: [{ groupBy: 'Element: Campaign', whitelistFilters: [], blacklistFilters: [] }],
      options: { viewType: 'flat' },
    }

    const merged = await fetchAllFlatDrilldownRows(request, { pageSize: 2, onFirstPage })

    expect(onFirstPage).not.toHaveBeenCalled()
    expect(merged.isComplete).toBe(true)
  })
})
