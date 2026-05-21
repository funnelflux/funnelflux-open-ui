import { defaultClonedEntityName } from '@/lib/cloneDraftName'
import { generateEntityId } from '@/lib/id-generator'
import type { OfferSourceFormData } from '@/schemas/offerSource'
import type { OfferSource } from '@/types/entities'

/** Form values for create-after-clone (new id; user saves to persist). */
export function buildOfferSourceCloneDraft(source: OfferSource): OfferSourceFormData {
  return {
    idOfferSource: generateEntityId(),
    offerSourceName: defaultClonedEntityName(source.offerSourceName, 'New offer source (copy)'),
    subId: source.subId ?? '',
    querySeparator: source.querySeparator ?? '&',
    postbackSubId: source.postbackSubId ?? '',
    postbackTxId: source.postbackTxId ?? '',
    postbackPayout: source.postbackPayout ?? '',
    notes: (source as OfferSource & { notes?: string }).notes ?? '',
    isArchived: false,
  }
}
