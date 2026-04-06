import { z } from 'zod/v4'

/** Offer page fields + funnel-node pass-through options (saved with funnel). */
export const offerNodeEditSchema = z.object({
  idPage: z.string().optional(),
  pageType: z.literal('offer'),
  pageName: z.string().min(1, 'Name is required'),
  url: z.string().min(1, 'URL is required'),
  redirectType: z.enum(['301', '307', 'umr', 'fluxify']),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  isArchived: z.boolean().optional(),
  offerParams: z.object({
    idOfferSource: z.string(),
    payout: z.number().min(0),
  }),
  accumulateUrlParams: z.boolean(),
  additionalTokens: z.array(
    z.object({
      field: z.string(),
      token: z.string(),
    }),
  ),
})

export type OfferNodeEditFormData = z.infer<typeof offerNodeEditSchema>
