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

/** Segment at `queryKey[prefixLength]` for entity-grid stats (drilldown) queries — must match {@link useEntityGrid}. */
export const ENTITY_GRID_STATS_KEY = 'entityGridStats' as const

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
      const queryKey = q.queryKey as unknown[]
      if (!Array.isArray(queryKey) || queryKey.length < prefixLen + 3) return false
      for (let i = 0; i < prefixLen; i++) {
        if (queryKey[i] !== queryKeyPrefix[i]) return false
      }
      if (queryKey[prefixLen] !== ENTITY_GRID_LIST_KEY) return false
      if (queryKey[prefixLen + 1] !== listEndpoint) return false
      return true
    },
  })

  for (const query of queries) {
    const queryKey = query.queryKey as unknown[]
    const tail = queryKey[prefixLen + 2]
    const listParams: Record<string, string> | undefined = isPlainParams(tail)
      ? Object.fromEntries(Object.entries(tail).map(([key, val]) => [key, String(val ?? '')]))
      : undefined
    const old = queryClient.getQueryData<ListEntity[]>(query.queryKey) ?? []
    queryClient.setQueryData(query.queryKey, updater(listParams, old))
  }
}

interface EntityGridCacheTarget {
  queryKeyPrefix: readonly unknown[]
  listEndpoint: string
}

const PAGE_GRID: EntityGridCacheTarget = {
  queryKeyPrefix: queryKeys.pages.all,
  listEndpoint: '/data/page/find/byStatus/',
}

const TRAFFIC_SOURCE_GRID: EntityGridCacheTarget = {
  queryKeyPrefix: queryKeys.trafficSources.all,
  listEndpoint: '/data/trafficsource/list/',
}

const OFFER_SOURCE_GRID: EntityGridCacheTarget = {
  queryKeyPrefix: queryKeys.offerSources.all,
  listEndpoint: '/data/offersource/find/byStatus/',
}

function upsertListEntity(entities: ListEntity[], entity: ListEntity, include: boolean): ListEntity[] {
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
}

function upsertEntityInCaches(
  queryClient: QueryClient,
  target: EntityGridCacheTarget,
  entity: ListEntity,
  belongsInCachedList: (listParams: Record<string, string> | undefined) => boolean,
): void {
  forEachEntityGridListQuery(
    queryClient,
    target.queryKeyPrefix,
    target.listEndpoint,
    (listParams, entities) => upsertListEntity(entities, entity, belongsInCachedList(listParams)),
  )
}

function removeIdsFromCaches(
  queryClient: QueryClient,
  target: EntityGridCacheTarget,
  ids: Iterable<string>,
): void {
  const drop = new Set(ids)
  if (drop.size === 0) return
  forEachEntityGridListQuery(
    queryClient,
    target.queryKeyPrefix,
    target.listEndpoint,
    (_listParams, entities) => entities.filter((row) => !drop.has(row.id)),
  )
}

function applyArchiveToCachedRows(
  queryClient: QueryClient,
  target: EntityGridCacheTarget,
  ids: Iterable<string>,
  archive: boolean,
  shouldKeepArchivedRow: (listParams: Record<string, string> | undefined, archive: boolean) => boolean,
): void {
  const idSet = new Set(ids)
  if (idSet.size === 0) return
  forEachEntityGridListQuery(
    queryClient,
    target.queryKeyPrefix,
    target.listEndpoint,
    (listParams, entities) => {
      const shouldKeep = shouldKeepArchivedRow(listParams, archive)
      return entities
        .map((row) => idSet.has(row.id) ? { ...row, isArchived: archive } : row)
        .filter((row) => !idSet.has(row.id) || shouldKeep)
    },
  )
}

function statusParamAllowsArchived(
  listParams: Record<string, string> | undefined,
  archived: boolean,
): boolean {
  const status = listParams?.status ?? 'active'
  if (status === 'all') return true
  if (status === 'active') return !archived
  if (status === 'archived') return archived
  return true
}

function pageBelongsInCachedList(page: Page, listParams: Record<string, string> | undefined): boolean {
  if (!listParams) return true
  const pageType = listParams.pageType
  if (pageType && page.pageType !== pageType) return false
  return statusParamAllowsArchived(listParams, page.isArchived === true)
}

export function upsertPageInEntityGridCaches(queryClient: QueryClient, page: Page): void {
  const entity = pagesToListEntities([page])[0]
  if (!entity) return

  upsertEntityInCaches(
    queryClient,
    PAGE_GRID,
    entity,
    (listParams) => pageBelongsInCachedList(page, listParams),
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
  removeIdsFromCaches(queryClient, PAGE_GRID, [idPage])
}

export function applyPageArchiveToEntityGridCaches(
  queryClient: QueryClient,
  idPage: string,
  archive: boolean,
): void {
  applyArchiveToCachedRows(
    queryClient,
    PAGE_GRID,
    [idPage],
    archive,
    statusParamAllowsArchived,
  )
}

function trafficSourceBelongsInCachedList(trafficSource: TrafficSource, listParams: Record<string, string> | undefined): boolean {
  if (!listParams || !Object.prototype.hasOwnProperty.call(listParams, 'archived')) {
    return true
  }
  const wantArchived = listParams.archived === 'true'
  const archived = trafficSource.isArchived === true
  return archived === wantArchived
}

export function upsertTrafficSourceInEntityGridCaches(queryClient: QueryClient, trafficSource: TrafficSource): void {
  const entity = trafficSourceToListEntity(trafficSource)
  if (!entity.id) return

  upsertEntityInCaches(
    queryClient,
    TRAFFIC_SOURCE_GRID,
    entity,
    (listParams) => trafficSourceBelongsInCachedList(trafficSource, listParams),
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
  upsertEntityInCaches(
    queryClient,
    TRAFFIC_SOURCE_GRID,
    synthetic,
    (listParams) => trafficSourceBelongsInCachedList({ isArchived: false } as TrafficSource, listParams),
  )
}

export function removeTrafficSourceFromEntityGridCaches(queryClient: QueryClient, id: string): void {
  removeIdsFromCaches(queryClient, TRAFFIC_SOURCE_GRID, [id])
}

export function applyTrafficSourceArchiveToEntityGridCaches(
  queryClient: QueryClient,
  id: string,
  archive: boolean,
): void {
  applyArchiveToCachedRows(
    queryClient,
    TRAFFIC_SOURCE_GRID,
    [id],
    archive,
    (listParams, nextArchive) => {
      const hasArchivedParam = listParams != null && Object.prototype.hasOwnProperty.call(listParams, 'archived')
      if (!hasArchivedParam) return true
      return nextArchive === (listParams!.archived === 'true')
    },
  )
}

function offerSourceBelongsInCachedList(offerSource: OfferSource, listParams: Record<string, string> | undefined): boolean {
  return statusParamAllowsArchived(listParams, offerSource.isArchived === true)
}

export function upsertOfferSourceInEntityGridCaches(queryClient: QueryClient, offerSource: OfferSource): void {
  const entity = offerSourcesToListEntities([offerSource])[0]
  if (!entity) return

  upsertEntityInCaches(
    queryClient,
    OFFER_SOURCE_GRID,
    entity,
    (listParams) => offerSourceBelongsInCachedList(offerSource, listParams),
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
  removeIdsFromCaches(queryClient, OFFER_SOURCE_GRID, [id])
}

export function removeOfferSourcesFromEntityGridCaches(queryClient: QueryClient, ids: string[]): void {
  removeIdsFromCaches(queryClient, OFFER_SOURCE_GRID, ids)
}

export function applyOfferSourceArchiveToEntityGridCaches(
  queryClient: QueryClient,
  ids: string[],
  archive: boolean,
): void {
  applyArchiveToCachedRows(
    queryClient,
    OFFER_SOURCE_GRID,
    ids,
    archive,
    statusParamAllowsArchived,
  )
}

