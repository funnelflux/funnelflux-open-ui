import type { QueryClient } from '@tanstack/react-query'
import {
  offerSourcesToListEntities,
  pagesToListEntities,
  trafficSourceToListEntity,
  type ListEntity,
} from '@/lib/entityGridUtils'
import { queryKeys } from '@/api/queryKeys'
import type { OfferSource, Page, PageType, TrafficSource } from '@/types/entities'

/** Segment at `queryKey[prefixLength]` for entity grid list queries — must match {@link useEntityGrid}. */
export const ENTITY_GRID_LIST_KEY = 'entityGridList' as const

function isPlainParams(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Mutates each cached entity-grid list whose key matches prefix + list endpoint. */
export function forEachEntityGridListQuery(
  queryClient: QueryClient,
  queryKeyPrefix: readonly unknown[],
  listEndpoint: string,
  updater: (listParams: Record<string, string> | undefined, entities: ListEntity[]) => ListEntity[],
): void {
  const prefixLen = queryKeyPrefix.length
  const queries = queryClient.getQueryCache().findAll({
    predicate: (q) => {
      const k = q.queryKey as unknown[]
      if (!Array.isArray(k) || k.length < prefixLen + 3) return false
      for (let i = 0; i < prefixLen; i++) {
        if (k[i] !== queryKeyPrefix[i]) return false
      }
      if (k[prefixLen] !== ENTITY_GRID_LIST_KEY) return false
      if (k[prefixLen + 1] !== listEndpoint) return false
      return true
    },
  })

  for (const query of queries) {
    const k = query.queryKey as unknown[]
    const tail = k[prefixLen + 2]
    const listParams: Record<string, string> | undefined = isPlainParams(tail)
      ? Object.fromEntries(Object.entries(tail).map(([key, val]) => [key, String(val ?? '')]))
      : undefined
    const old = queryClient.getQueryData<ListEntity[]>(query.queryKey) ?? []
    queryClient.setQueryData(query.queryKey, updater(listParams, old))
  }
}

function pageBelongsInCachedList(page: Page, listParams: Record<string, string> | undefined): boolean {
  if (!listParams) return true
  const pt = listParams.pageType
  if (pt && page.pageType !== pt) return false
  const st = listParams.status ?? 'active'
  const archived = page.isArchived === true
  if (st === 'all') return true
  if (st === 'active') return !archived
  if (st === 'archived') return archived
  return true
}

export function upsertPageInEntityGridCaches(queryClient: QueryClient, page: Page): void {
  const entity = pagesToListEntities([page])[0]
  if (!entity) return

  forEachEntityGridListQuery(
    queryClient,
    queryKeys.pages.all,
    '/data/page/find/byStatus/',
    (lp, entities) => {
      const include = pageBelongsInCachedList(page, lp)
      const idx = entities.findIndex((row) => row.id === entity.id)
      if (!include) {
        return idx >= 0 ? entities.filter((row) => row.id !== entity.id) : entities
      }
      if (idx >= 0) {
        const next = [...entities]
        next[idx] = { ...next[idx], ...entity }
        return next
      }
      return [entity, ...entities]
    },
  )
}

export interface PageCloneWireResponse {
  idPage: string
  pageName: string
}

export function upsertClonedPageInEntityGridCaches(
  queryClient: QueryClient,
  payload: PageCloneWireResponse & { pageType: PageType; categoryId?: string },
): void {
  const synthetic = {
    idPage: payload.idPage,
    pageName: payload.pageName,
    pageType: payload.pageType,
    url: '',
    isArchived: false as boolean | undefined,
    ...(payload.categoryId != null && payload.categoryId !== ''
      ? { categoryId: payload.categoryId }
      : {}),
  } as Page
  upsertPageInEntityGridCaches(queryClient, synthetic)
}

export function removePageFromEntityGridCaches(queryClient: QueryClient, idPage: string): void {
  forEachEntityGridListQuery(
    queryClient,
    queryKeys.pages.all,
    '/data/page/find/byStatus/',
    (_lp, entities) => entities.filter((row) => row.id !== idPage),
  )
}

export function applyPageArchiveToEntityGridCaches(
  queryClient: QueryClient,
  idPage: string,
  archive: boolean,
): void {
  forEachEntityGridListQuery(
    queryClient,
    queryKeys.pages.all,
    '/data/page/find/byStatus/',
    (lp, entities) => {
      const idx = entities.findIndex((row) => row.id === idPage)
      if (idx < 0) return entities
      const st = lp?.status ?? 'active'
      const next = [...entities]
      const row = { ...next[idx], isArchived: archive }
      const shouldKeep =
        st === 'all' ||
        (st === 'active' && !archive) ||
        (st === 'archived' && archive)
      if (!shouldKeep) {
        next.splice(idx, 1)
        return next
      }
      next[idx] = row
      return next
    },
  )
}

function trafficSourceBelongsInCachedList(ts: TrafficSource, listParams: Record<string, string> | undefined): boolean {
  if (!listParams || !Object.prototype.hasOwnProperty.call(listParams, 'archived')) {
    return true
  }
  const wantArchived = listParams.archived === 'true'
  const archived = ts.isArchived === true
  return archived === wantArchived
}

export function upsertTrafficSourceInEntityGridCaches(queryClient: QueryClient, ts: TrafficSource): void {
  const entity = trafficSourceToListEntity(ts)
  if (!entity.id) return

  forEachEntityGridListQuery(
    queryClient,
    queryKeys.trafficSources.all,
    '/data/trafficsource/list/',
    (lp, entities) => {
      const include = trafficSourceBelongsInCachedList(ts, lp)
      const idx = entities.findIndex((row) => row.id === entity.id)
      if (!include) {
        return idx >= 0 ? entities.filter((row) => row.id !== entity.id) : entities
      }
      if (idx >= 0) {
        const next = [...entities]
        next[idx] = { ...next[idx], ...entity }
        return next
      }
      return [entity, ...entities]
    },
  )
}

export interface TrafficSourceCloneWireResponse {
  idTrafficSource: string
  trafficSourceName: string
}

export function upsertClonedTrafficSourceInEntityGridCaches(
  queryClient: QueryClient,
  payload: TrafficSourceCloneWireResponse & { categoryId?: string },
): void {
  const synthetic = {
    id: payload.idTrafficSource,
    name: payload.trafficSourceName,
    isArchived: false,
    ...(payload.categoryId != null && payload.categoryId !== ''
      ? { categoryId: payload.categoryId }
      : {}),
  } satisfies ListEntity
  forEachEntityGridListQuery(
    queryClient,
    queryKeys.trafficSources.all,
    '/data/trafficsource/list/',
    (lp, entities) => {
      const include = trafficSourceBelongsInCachedList({ isArchived: false } as TrafficSource, lp)
      if (!include) return entities
      const idx = entities.findIndex((row) => row.id === synthetic.id)
      if (idx >= 0) {
        const next = [...entities]
        next[idx] = { ...next[idx], ...synthetic }
        return next
      }
      return [synthetic, ...entities]
    },
  )
}

export function removeTrafficSourceFromEntityGridCaches(queryClient: QueryClient, id: string): void {
  forEachEntityGridListQuery(
    queryClient,
    queryKeys.trafficSources.all,
    '/data/trafficsource/list/',
    (_lp, entities) => entities.filter((row) => row.id !== id),
  )
}

export function applyTrafficSourceArchiveToEntityGridCaches(
  queryClient: QueryClient,
  id: string,
  archive: boolean,
): void {
  forEachEntityGridListQuery(
    queryClient,
    queryKeys.trafficSources.all,
    '/data/trafficsource/list/',
    (lp, entities) => {
      const idx = entities.findIndex((row) => row.id === id)
      if (idx < 0) return entities
      const hasArchivedParam = lp != null && Object.prototype.hasOwnProperty.call(lp, 'archived')
      const next = [...entities]
      const row = { ...next[idx], isArchived: archive }
      if (hasArchivedParam) {
        const wantArchived = lp!.archived === 'true'
        const shouldKeep = archive === wantArchived
        if (!shouldKeep) {
          next.splice(idx, 1)
          return next
        }
      }
      next[idx] = row
      return next
    },
  )
}

function offerSourceBelongsInCachedList(os: OfferSource, listParams: Record<string, string> | undefined): boolean {
  const st = listParams?.status ?? 'active'
  const archived = os.isArchived === true
  if (st === 'all') return true
  if (st === 'active') return !archived
  if (st === 'archived') return archived
  return true
}

export function upsertOfferSourceInEntityGridCaches(queryClient: QueryClient, os: OfferSource): void {
  const entity = offerSourcesToListEntities([os])[0]
  if (!entity) return

  forEachEntityGridListQuery(
    queryClient,
    queryKeys.offerSources.all,
    '/data/offersource/find/byStatus/',
    (lp, entities) => {
      const include = offerSourceBelongsInCachedList(os, lp)
      const idx = entities.findIndex((row) => row.id === entity.id)
      if (!include) {
        return idx >= 0 ? entities.filter((row) => row.id !== entity.id) : entities
      }
      if (idx >= 0) {
        const next = [...entities]
        next[idx] = { ...next[idx], ...entity }
        return next
      }
      return [entity, ...entities]
    },
  )
}

export interface OfferSourceCloneWireResponse {
  idOfferSource: string
  offerSourceName: string
}

export function upsertClonedOfferSourceInEntityGridCaches(
  queryClient: QueryClient,
  payload: OfferSourceCloneWireResponse,
): void {
  upsertOfferSourceInEntityGridCaches(queryClient, {
    idOfferSource: payload.idOfferSource,
    offerSourceName: payload.offerSourceName,
    isArchived: false,
  } as OfferSource)
}

export function removeOfferSourceFromEntityGridCaches(queryClient: QueryClient, id: string): void {
  forEachEntityGridListQuery(
    queryClient,
    queryKeys.offerSources.all,
    '/data/offersource/find/byStatus/',
    (_lp, entities) => entities.filter((row) => row.id !== id),
  )
}

export function removeOfferSourcesFromEntityGridCaches(queryClient: QueryClient, ids: string[]): void {
  if (ids.length === 0) return
  const drop = new Set(ids)
  forEachEntityGridListQuery(
    queryClient,
    queryKeys.offerSources.all,
    '/data/offersource/find/byStatus/',
    (_lp, entities) => entities.filter((row) => !drop.has(row.id)),
  )
}

export function applyOfferSourceArchiveToEntityGridCaches(
  queryClient: QueryClient,
  ids: string[],
  archive: boolean,
): void {
  if (ids.length === 0) return
  const idSet = new Set(ids)
  forEachEntityGridListQuery(
    queryClient,
    queryKeys.offerSources.all,
    '/data/offersource/find/byStatus/',
    (lp, entities) => {
      const st = lp?.status ?? 'active'
      return entities
        .map((row) => {
          if (!idSet.has(row.id)) return row
          return { ...row, isArchived: archive }
        })
        .filter((row) => {
          if (!idSet.has(row.id)) return true
          const archived = archive
          if (st === 'all') return true
          if (st === 'active') return !archived
          if (st === 'archived') return archived
          return true
        })
    },
  )
}

