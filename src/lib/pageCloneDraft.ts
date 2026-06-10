import { defaultClonedEntityName } from '@/lib/cloneDraftName'
import { generateEntityId } from '@/lib/id-generator'
import type { PageFormData } from '@/schemas/page'
import type { Page, PageType } from '@/types/entities'

const defaultFluxifyParams: NonNullable<PageFormData['fluxifyParams']> = {
  enableCache: false,
  enableDirectTrafficProtection: false,
  enableLinkRewriter: false,
  enableContentRewriter: false,
  enableVideoAutoPlayBreaker: false,
  enableExitPopupBreaker: false,
  enableAnalyticsBreaker: false,
  enableReferrerAndUASpoofer: false,
}

/** Form values for create-after-clone (new id; user saves to persist). */
export function buildPageCloneDraft(source: Page, pageType: PageType): PageFormData {
  const isOffer = pageType === 'offer'
  return {
    idPage: generateEntityId(),
    pageType,
    pageName: defaultClonedEntityName(
      source.pageName,
      isOffer ? 'New offer (copy)' : 'New lander (copy)',
    ),
    url: source.url,
    redirectType: source.redirectType ?? '307',
    categoryId: source.categoryId ?? '',
    numberOfActions: source.numberOfActions,
    tags: [...(source.tags ?? [])],
    notes: source.notes ?? '',
    offerParams: isOffer
      ? {
          idOfferSource: source.offerParams?.idOfferSource ?? '',
          payout: source.offerParams?.payout ?? 0,
          payoutType: source.offerParams?.payoutType ?? 'perConversion',
        }
      : undefined,
    fluxifyParams:
      source.redirectType === 'fluxify'
        ? ((source.fluxifyParams ?? defaultFluxifyParams) as PageFormData['fluxifyParams'])
        : undefined,
    isArchived: false,
    customFields: source.customFields,
  }
}
