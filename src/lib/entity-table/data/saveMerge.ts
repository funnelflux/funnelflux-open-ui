import type { OfferSource, Page, TrafficSource } from '@/types/entities'
import type { OfferSourceFormData } from '@/schemas/offerSource'

/**
 * V2 data save handlers often respond with only `{ success: true }` (no entity body).
 * Entity-grid cache upserts must use the request payload, optionally overlaid by any fields the API returns.
 */
export function mergeSaveAcknowledgement<T extends Record<string, unknown>>(submitted: T, saved: unknown): T {
  const out: Record<string, unknown> = { ...submitted }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
    return out as T
  }
  for (const [key, val] of Object.entries(saved)) {
    if (key === 'success' || val === undefined) continue
    out[key] = val
  }
  return out as T
}

export function pageForEntityGridCache(saved: unknown, submitted: Partial<Page>): Page | null {
  const merged = mergeSaveAcknowledgement(
    submitted as Record<string, unknown>,
    saved,
  ) as Partial<Page>
  if (!merged.idPage) return null
  return {
    ...merged,
    idPage: merged.idPage,
    pageType: merged.pageType ?? 'lander',
    pageName: merged.pageName ?? '',
    url: merged.url ?? '',
  } as Page
}

export function trafficSourceForEntityGridCache(
  saved: unknown,
  submitted: Partial<TrafficSource>,
): TrafficSource | null {
  const merged = mergeSaveAcknowledgement(
    submitted as Record<string, unknown>,
    saved,
  ) as Partial<TrafficSource>
  if (!merged.idTrafficSource) return null
  return {
    ...merged,
    idTrafficSource: merged.idTrafficSource,
    trafficSourceName: merged.trafficSourceName ?? '',
    costType: merged.costType ?? 'cpa',
    isArchived: merged.isArchived ?? false,
  } as TrafficSource
}

export function offerSourceForEntityGridCache(saved: unknown, submitted: OfferSourceFormData): OfferSource | null {
  const merged = mergeSaveAcknowledgement(
    submitted as unknown as Record<string, unknown>,
    saved,
  ) as Partial<OfferSource>
  if (!merged.idOfferSource) return null
  return {
    ...merged,
    idOfferSource: merged.idOfferSource,
    offerSourceName: merged.offerSourceName ?? '',
    isArchived: merged.isArchived ?? false,
  } as OfferSource
}
