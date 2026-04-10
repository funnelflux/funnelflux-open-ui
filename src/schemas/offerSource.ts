import { z } from 'zod/v4'

export const offerSourceSchema = z.object({
  idOfferSource: z.string().optional(),
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
