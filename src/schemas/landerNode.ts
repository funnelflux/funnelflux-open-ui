import { z } from 'zod/v4'
import { httpUrlStringSchema } from '@/lib/validateHttpUrl'

export type { FunnelNodePageParams, Page } from '@/types/entities'

/**
 * Lander page + funnel node pass-through fields saved with the funnel graph.
 * Combines lander {@link Page} fields with {@link FunnelNodePageParams} (`accumulateUrlParams`,
 * `additionalTokens`). `additionalTokens` uses `{ field, token }` in the UI; the API uses
 * {@link FunnelNodePageParams.additionalTokens} as `KeyValuePair` (`key`/`value`) — map at save.
 */
export const landerNodeEditSchema = z.object({
  idPage: z.string().optional(),
  pageType: z.literal('lander'),
  pageName: z.string().min(1, 'Name is required'),
  url: httpUrlStringSchema,
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
