import { z } from 'zod/v4'

export type { OfferSource } from '@/types/entities'

/**
 * Offer source form. Persisted shape follows {@link OfferSource} / save request in data API.
 * For create, set `idOfferSource` with `generateEntityId()` from `@/lib/id-generator` before POST.
 * `notes` is not in the current OpenAPI spec; keep in sync if added to `definition.yaml`.
 */
export const offerSourceSchema = z.object({
  idOfferSource: z.string().min(1, 'ID is required'),
  offerSourceName: z.string().min(1, 'Name is required').max(255),
  subId: z.string(),
  querySeparator: z.string(),
  postbackSubId: z.string(),
  postbackTxId: z.string(),
  postbackPayout: z.string(),
  notes: z.string().optional(),
  isArchived: z.boolean().optional(),
})

export type OfferSourceFormData = z.infer<typeof offerSourceSchema>
