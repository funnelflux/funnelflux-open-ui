import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import {
  invalidatePageData,
  invalidateTrafficSourceData,
  invalidateOfferSourceData,
} from '@/api/invalidations'

describe('invalidations', () => {
  let qc: QueryClient

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.spyOn(qc, 'invalidateQueries')
  })

  it('invalidatePageData targets pages and grouping page assets', async () => {
    await invalidatePageData(qc)
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.pages.all })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groupingFilterAssets.pageList('lander'),
    })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groupingFilterAssets.pageList('offer'),
    })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groupingFilterAssets.pageCategories(),
    })
  })

  it('invalidateTrafficSourceData targets traffic sources and grouping list', async () => {
    await invalidateTrafficSourceData(qc)
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.trafficSources.all })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groupingFilterAssets.trafficSourcesList(),
    })
  })

  it('invalidateOfferSourceData targets offer sources and grouping list', async () => {
    await invalidateOfferSourceData(qc)
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.offerSources.all })
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.groupingFilterAssets.offerSourcesAllStatuses(),
    })
  })
})
