import { z } from 'zod/v4'

/** Lander page fields + funnel-node pass-through options (saved with funnel). */
export const landerNodeEditSchema = z.object({
  idPage: z.string().optional(),
  pageType: z.literal('lander'),
  pageName: z.string().min(1, 'Name is required'),
  url: z.string().min(1, 'URL is required'),
  redirectType: z.enum(['301', '307', 'umr', 'fluxify']),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  isArchived: z.boolean().optional(),
  accumulateUrlParams: z.boolean(),
  additionalTokens: z.array(
    z.object({
      field: z.string(),
      token: z.string(),
    }),
  ),
})

export type LanderNodeEditFormData = z.infer<typeof landerNodeEditSchema>
