import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import type { ListEntity } from '@/lib/entity-table/data/mergedRows'
import type { OfferSource, Page, TrafficSource } from '@/types/entities'
import {
  ENTITY_GRID_LIST_KEY,
  applyOfferSourceArchiveToEntityGridCaches,
  applyPageArchiveToEntityGridCaches,
  applyTrafficSourceArchiveToEntityGridCaches,
  removeOfferSourcesFromEntityGridCaches,
  upsertClonedTrafficSourceInEntityGridCaches,
  upsertOfferSourceInEntityGridCaches,
  upsertPageInEntityGridCaches,
  upsertTrafficSourceInEntityGridCaches,
} from './queryCache'

function queryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function entityGridKey(
  prefix: readonly unknown[],
  endpoint: string,
  params?: Record<string, string>,
): readonly unknown[] {
  return [...prefix, ENTITY_GRID_LIST_KEY, endpoint, params]
}

function cachedList(client: QueryClient, key: readonly unknown[]): ListEntity[] {
  return client.getQueryData<ListEntity[]>(key) ?? []
}

describe('entityGridQueryCache', () => {
  it('upserts pages only into lists matching their filters', () => {
    const client = queryClient()
    const activeLanders = entityGridKey(queryKeys.pages.all, '/data/page/find/byStatus/', {
      pageType: 'lander',
      status: 'active',
    })
    const archivedOffers = entityGridKey(queryKeys.pages.all, '/data/page/find/byStatus/', {
      pageType: 'offer',
      status: 'archived',
    })
    client.setQueryData(activeLanders, [])
    client.setQueryData(archivedOffers, [{ id: 'existing', name: 'Existing' }])

    upsertPageInEntityGridCaches(client, {
      idPage: 'p1',
      pageName: 'Lander 1',
      pageType: 'lander',
      url: '',
      isArchived: false,
    } as Page)

    expect(cachedList(client, activeLanders)).toEqual([
      { id: 'p1', name: 'Lander 1', isArchived: false },
    ])
    expect(cachedList(client, archivedOffers)).toEqual([{ id: 'existing', name: 'Existing' }])
  })

  it('removes archived pages from active lists and keeps all-status lists', () => {
    const client = queryClient()
    const activeKey = entityGridKey(queryKeys.pages.all, '/data/page/find/byStatus/', { status: 'active' })
    const allKey = entityGridKey(queryKeys.pages.all, '/data/page/find/byStatus/', { status: 'all' })
    client.setQueryData(activeKey, [{ id: 'p1', name: 'Lander 1', isArchived: false }])
    client.setQueryData(allKey, [{ id: 'p1', name: 'Lander 1', isArchived: false }])

    applyPageArchiveToEntityGridCaches(client, 'p1', true)

    expect(cachedList(client, activeKey)).toEqual([])
    expect(cachedList(client, allKey)).toEqual([{ id: 'p1', name: 'Lander 1', isArchived: true }])
  })

  it('upserts traffic sources according to archived query params', () => {
    const client = queryClient()
    const activeKey = entityGridKey(queryKeys.trafficSources.all, '/data/trafficsource/list/', {
      archived: 'false',
    })
    const archivedKey = entityGridKey(queryKeys.trafficSources.all, '/data/trafficsource/list/', {
      archived: 'true',
    })
    client.setQueryData(activeKey, [])
    client.setQueryData(archivedKey, [])

    upsertTrafficSourceInEntityGridCaches(client, {
      idTrafficSource: 'ts1',
      trafficSourceName: 'Source 1',
      isArchived: false,
      idCategory: 'cat1',
    } as TrafficSource)

    expect(cachedList(client, activeKey)).toEqual([
      { id: 'ts1', name: 'Source 1', isArchived: false, categoryId: 'cat1' },
    ])
    expect(cachedList(client, archivedKey)).toEqual([])
  })

  it('updates cloned traffic sources in active/unfiltered caches', () => {
    const client = queryClient()
    const activeKey = entityGridKey(queryKeys.trafficSources.all, '/data/trafficsource/list/', {
      archived: 'false',
    })
    const archivedKey = entityGridKey(queryKeys.trafficSources.all, '/data/trafficsource/list/', {
      archived: 'true',
    })
    client.setQueryData(activeKey, [])
    client.setQueryData(archivedKey, [])

    upsertClonedTrafficSourceInEntityGridCaches(client, {
      idTrafficSource: 'ts-clone',
      trafficSourceName: 'Source Clone',
      categoryId: 'cat2',
    })

    expect(cachedList(client, activeKey)).toEqual([
      { id: 'ts-clone', name: 'Source Clone', isArchived: false, categoryId: 'cat2' },
    ])
    expect(cachedList(client, archivedKey)).toEqual([])
  })

  it('moves traffic sources between archived-filtered lists', () => {
    const client = queryClient()
    const activeKey = entityGridKey(queryKeys.trafficSources.all, '/data/trafficsource/list/', {
      archived: 'false',
    })
    const allKey = entityGridKey(queryKeys.trafficSources.all, '/data/trafficsource/list/')
    client.setQueryData(activeKey, [{ id: 'ts1', name: 'Source 1', isArchived: false }])
    client.setQueryData(allKey, [{ id: 'ts1', name: 'Source 1', isArchived: false }])

    applyTrafficSourceArchiveToEntityGridCaches(client, 'ts1', true)

    expect(cachedList(client, activeKey)).toEqual([])
    expect(cachedList(client, allKey)).toEqual([{ id: 'ts1', name: 'Source 1', isArchived: true }])
  })

  it('updates offer source active/all/archive lists', () => {
    const client = queryClient()
    const activeKey = entityGridKey(queryKeys.offerSources.all, '/data/offersource/find/byStatus/', {
      status: 'active',
    })
    const archivedKey = entityGridKey(queryKeys.offerSources.all, '/data/offersource/find/byStatus/', {
      status: 'archived',
    })
    const allKey = entityGridKey(queryKeys.offerSources.all, '/data/offersource/find/byStatus/', {
      status: 'all',
    })
    client.setQueryData(activeKey, [])
    client.setQueryData(archivedKey, [])
    client.setQueryData(allKey, [])

    upsertOfferSourceInEntityGridCaches(client, {
      idOfferSource: 'os1',
      offerSourceName: 'Offer Source 1',
      isArchived: false,
    } as OfferSource)
    applyOfferSourceArchiveToEntityGridCaches(client, ['os1'], true)

    expect(cachedList(client, activeKey)).toEqual([])
    expect(cachedList(client, archivedKey)).toEqual([])
    expect(cachedList(client, allKey)).toEqual([{ id: 'os1', name: 'Offer Source 1', isArchived: true }])
  })

  it('removes multiple offer sources from cached lists', () => {
    const client = queryClient()
    const key = entityGridKey(queryKeys.offerSources.all, '/data/offersource/find/byStatus/', {
      status: 'all',
    })
    client.setQueryData(key, [
      { id: 'os1', name: 'One' },
      { id: 'os2', name: 'Two' },
      { id: 'os3', name: 'Three' },
    ])

    removeOfferSourcesFromEntityGridCaches(client, ['os1', 'os3'])

    expect(cachedList(client, key)).toEqual([{ id: 'os2', name: 'Two' }])
  })
})
