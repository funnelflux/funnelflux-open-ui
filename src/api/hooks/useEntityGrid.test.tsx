import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEntityGrid } from '@/api/hooks/useEntityGrid'
import { api } from '@/api/client'

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

describe('useEntityGrid backend missing asset rows', () => {
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

  it('uses backend-owned missing asset rows and list metadata only for filters/categories', async () => {
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

  it('preserves backend missing asset rows absent from the list endpoint', async () => {
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

    await waitFor(() => expect(result.current.mergedRows).toHaveLength(2))

    expect(result.current.mergedRows).toEqual([
      expect.objectContaining({
        id: 'ts-1',
        name: 'Traffic A',
        categoryId: 'cat-1',
        isArchived: true,
      }),
      expect.objectContaining({
        id: 'missing-ts',
        name: 'Deleted / unknown source',
        cells: [
          { formatted: 'Deleted / unknown source', raw: 'missing-ts' },
          { formatted: '9', raw: 9 },
        ],
      }),
    ])
  })
})
