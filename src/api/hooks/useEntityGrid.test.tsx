import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEntityGrid } from '@/api/hooks/useEntityGrid'
import { api } from '@/api/client'
import { ENTITY_GRID_STATS_KEY } from '@/lib/entity-table/data/queryCache'
import { dateRangeQueryKey } from '@/lib/statsDateRange'

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    postDrilldown: vi.fn(),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useEntityGrid list-authoritative merge', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.postDrilldown).mockReset()
    vi.mocked(api.get).mockResolvedValue([
      {
        id: 'ts-1',
        name: 'Traffic A',
        categoryId: 'cat-1',
        isArchived: true,
      },
    ])
    vi.mocked(api.postDrilldown).mockResolvedValue({
      columns: [
        { name: 'Third Parties: Traffic Source', type: 'grouping' },
        { name: 'Entrances', type: 'metric' },
      ],
      rows: [
        {
          rowId: 'ts-1',
          cells: [
            ['Traffic A', 'ts-1'],
            ['0', 0],
          ],
        },
      ],
      totals: { cells: [['0', 0]] },
      rowsReturned: 1,
      rowsTotal: 1,
    })
  })

  it('merges list entities with drilldown stats when includeMissingAssets is enabled', async () => {
    const { result } = renderHook(
      () =>
        useEntityGrid({
          queryKeyPrefix: ['trafficSources'],
          listEndpoint: '/data/trafficsource/list/',
          groupBy: 'Third Parties: Traffic Source',
          dateFrom: new Date('2025-01-01T00:00:00.000Z'),
          dateTo: new Date('2025-01-02T00:00:00.000Z'),
          timezone: 'UTC',
          metricColumnIds: ['visits'],
          includeMissingAssets: true,
          assetStatus: 'archived',
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.mergedRows).toHaveLength(1))

    expect(api.get).toHaveBeenCalledWith('/data/trafficsource/list/', undefined)
    expect(api.postDrilldown).toHaveBeenCalledTimes(1)
    expect(vi.mocked(api.postDrilldown).mock.calls[0]?.[0]).toMatchObject({
      groupings: [{ groupBy: 'Third Parties: Traffic Source' }],
      options: {
        viewType: 'flat',
        includeMissingAssets: true,
        assetStatus: 'archived',
      },
      responseFormat: 'compact-v1',
      metrics: ['Entrances'],
    })
    expect(result.current.mergedRows[0]).toMatchObject({
      id: 'ts-1',
      name: 'Traffic A',
      categoryId: 'cat-1',
      isArchived: true,
      cells: [
        { formatted: 'Traffic A', raw: 'ts-1' },
        { formatted: '0', raw: 0 },
      ],
    })
  })

  it('passes list query params through to slim page list requests', async () => {
    renderHook(
      () =>
        useEntityGrid({
          queryKeyPrefix: ['pages'],
          listEndpoint: '/data/page/find/byStatus/',
          listParams: {
            pageType: 'offer',
            status: 'active',
            responseFormat: 'summary-v1',
            includeUrl: 'true',
            includePayout: 'true',
          },
          groupBy: 'Element: Offer',
          dateFrom: new Date('2025-01-01T00:00:00.000Z'),
          dateTo: new Date('2025-01-02T00:00:00.000Z'),
          timezone: 'UTC',
          metricColumnIds: ['visits'],
          includeMissingAssets: true,
          assetStatus: 'active',
        }),
      { wrapper },
    )

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/data/page/find/byStatus/', {
        pageType: 'offer',
        status: 'active',
        responseFormat: 'summary-v1',
        includeUrl: 'true',
        includePayout: 'true',
      }),
    )
  })

  it('omits drilldown-only rows that are not in the list cache (delete without list patch)', async () => {
    vi.mocked(api.postDrilldown).mockResolvedValue({
      columns: [
        { name: 'Third Parties: Traffic Source', type: 'grouping' },
        { name: 'Entrances', type: 'metric' },
      ],
      rows: [
        {
          rowId: 'ts-1',
          cells: [
            ['Traffic A', 'ts-1'],
            ['4', 4],
          ],
        },
        {
          rowId: 'missing-ts',
          cells: [
            ['Deleted / unknown source', 'missing-ts'],
            ['9', 9],
          ],
        },
      ],
      totals: { cells: [['13', 13]] },
      rowsReturned: 2,
      rowsTotal: 2,
    })

    const { result } = renderHook(
      () =>
        useEntityGrid({
          queryKeyPrefix: ['trafficSources'],
          listEndpoint: '/data/trafficsource/list/',
          groupBy: 'Third Parties: Traffic Source',
          dateFrom: new Date('2025-01-01T00:00:00.000Z'),
          dateTo: new Date('2025-01-02T00:00:00.000Z'),
          timezone: 'UTC',
          metricColumnIds: ['visits'],
          includeMissingAssets: true,
          assetStatus: 'all',
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.mergedRows).toHaveLength(1))

    expect(result.current.mergedRows[0]).toMatchObject({
      id: 'ts-1',
      name: 'Traffic A',
      categoryId: 'cat-1',
      isArchived: true,
    })
  })

  it('falls back to slim list rows when the missing-asset drilldown returns no rows', async () => {
    vi.mocked(api.get).mockResolvedValue([
      {
        idPage: 'offer-1',
        pageName: 'Offer A',
        categoryId: 'cat-offers',
        url: 'https://example.com/offer',
        payout: 55,
      },
    ])
    vi.mocked(api.postDrilldown).mockResolvedValue({
      columns: [
        { name: 'Element: Lander-Offer Category', type: 'grouping' },
        { name: 'Element: Offer', type: 'grouping' },
        { name: 'Entrances', type: 'metric' },
      ],
      rows: [],
      totals: { cells: [['0', 0]] },
      rowsReturned: 0,
      rowsTotal: 0,
    })

    const { result } = renderHook(
      () =>
        useEntityGrid({
          queryKeyPrefix: ['pages'],
          listEndpoint: '/data/page/find/byStatus/',
          listParams: {
            pageType: 'offer',
            status: 'active',
            responseFormat: 'summary-v1',
            includeUrl: 'true',
            includePayout: 'true',
          },
          groupBy: 'Element: Offer',
          groupings: ['Element: Lander-Offer Category', 'Element: Offer'],
          dateFrom: new Date('2025-01-01T00:00:00.000Z'),
          dateTo: new Date('2025-01-02T00:00:00.000Z'),
          timezone: 'UTC',
          mapListToEntities: (items) =>
            (items as Array<{
              idPage: string
              pageName: string
              categoryId?: string
              url?: string
              payout?: number
            }>).map((item) => ({
              id: item.idPage,
              name: item.pageName,
              categoryId: item.categoryId,
              url: item.url,
              payout: item.payout,
            })),
          metricColumnIds: ['visits'],
          includeMissingAssets: true,
          assetStatus: 'active',
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.mergedRows).toHaveLength(1))

    expect(result.current.mergedRows[0]).toMatchObject({
      id: 'offer-1',
      name: 'Offer A',
      categoryId: 'cat-offers',
      url: 'https://example.com/offer',
      payout: 55,
      cells: [
        { formatted: 'Offer A', raw: 'offer-1' },
        { formatted: '', raw: 0 },
        { formatted: '0', raw: 0 },
      ],
    })
  })

  it('overlays category-scoped drilldown stats onto list entities by entity id', async () => {
    vi.mocked(api.get).mockResolvedValue([
      { id: 'offer-1', name: 'Offer A', categoryId: 'cat-1' },
    ])
    vi.mocked(api.postDrilldown).mockResolvedValue({
      columns: [
        { name: 'Element: Lander-Offer Category', type: 'grouping' },
        { name: 'Element: Offer', type: 'grouping' },
        { name: 'Entrances', type: 'metric' },
      ],
      rows: [
        {
          rowId: 'cat-1/offer-1',
          cells: [
            ['Category A', 'cat-1'],
            ['Offer A', 'offer-1'],
            ['7', 7],
          ],
        },
      ],
      totals: { cells: [['7', 7]] },
      rowsReturned: 1,
      rowsTotal: 1,
    })

    const { result } = renderHook(
      () =>
        useEntityGrid({
          queryKeyPrefix: ['pages'],
          listEndpoint: '/data/page/find/byStatus/',
          groupBy: 'Element: Offer',
          groupings: ['Element: Lander-Offer Category', 'Element: Offer'],
          dateFrom: new Date('2025-01-01T00:00:00.000Z'),
          dateTo: new Date('2025-01-02T00:00:00.000Z'),
          timezone: 'UTC',
          metricColumnIds: ['visits'],
          includeMissingAssets: true,
          assetStatus: 'active',
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.mergedRows).toHaveLength(1))

    expect(result.current.mergedRows[0]).toMatchObject({
      id: 'offer-1',
      name: 'Offer A',
      categoryId: 'cat-1',
    })
  })

  it('reports isLoadingMore when cached stats are partial and the stats query is still fetching', async () => {
    vi.mocked(api.postDrilldown).mockImplementation(() => new Promise(() => {}))

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const dateFrom = new Date('2025-01-01T00:00:00.000Z')
    const dateTo = new Date('2025-01-02T00:00:00.000Z')
    const statsQueryKey = [
      'trafficSources',
      ENTITY_GRID_STATS_KEY,
      'Third Parties: Traffic Source',
      undefined,
      dateRangeQueryKey(dateFrom, dateTo, 'UTC'),
      ['Entrances'],
      true,
      'active',
    ] as const

    queryClient.setQueryData(statsQueryKey, {
      columns: [{ name: 'Third Parties: Traffic Source', type: 'grouping' }],
      rows: [],
      totals: { cells: [] },
      rowsReturned: 0,
      rowsTotal: 2,
      isComplete: false,
    })

    const { result } = renderHook(
      () =>
        useEntityGrid({
          queryKeyPrefix: ['trafficSources'],
          listEndpoint: '/data/trafficsource/list/',
          groupBy: 'Third Parties: Traffic Source',
          dateFrom,
          dateTo,
          timezone: 'UTC',
          metricColumnIds: ['visits'],
          includeMissingAssets: true,
          assetStatus: 'active',
        }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      },
    )

    await waitFor(() => expect(result.current.isLoadingMore).toBe(true))
  })
})
