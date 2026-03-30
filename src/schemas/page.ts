import { z } from 'zod/v4'

export const pageSchema = z.object({
  idPage: z.string().optional(),
  pageType: z.enum(['lander', 'offer']),
  pageName: z.string().min(1, 'Name is required'),
  url: z.string().min(1, 'URL is required'),
  redirectType: z.enum(['301', '307', 'umr', 'fluxify']),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  offerParams: z.object({
    idOfferSource: z.string(),
    payout: z.coerce.number().min(0),
  }).optional(),
  isArchived: z.boolean().optional(),
})

export type PageFormData = z.infer<typeof pageSchema>
