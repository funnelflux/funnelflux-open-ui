import { z } from 'zod/v4'

export type { TrafficSource } from '@/types/entities'

/**
 * Traffic source create/update form. Aligns with OpenAPI `#/definitions/TrafficSource` /
 * {@link TrafficSource}. For create, set `idTrafficSource` with `generateEntityId()` from `@/lib/id-generator` before POST. The save hook sets `postback.idTrafficSource` to match.
 */
export const trafficSourceSchema = z.object({
  idTrafficSource: z.string().min(1, 'ID is required'),
  trafficSourceName: z.string().min(1, 'Name is required').max(255),
  costType: z.enum(['cpe', 'cpa']),
  /** Numeric or token (e.g. `{bid}`) — matches legacy templates and API string field. */
  defaultCost: z.string(),
  trackingFields: z.array(
    z.object({ key: z.string(), value: z.string() }),
  ),
  postback: z.object({
    postbackType: z.enum(['none', 'postbackUrl', 'pixelUrl', 'javascript']),
    postbackCode: z.string(),
  }),
  /** Empty = uncategorized. Sent on save as `idCategory` for the v2 TrafficSource model. */
  idCategory: z.string().optional(),
  isArchived: z.boolean().optional(),
})

export type TrafficSourceFormData = z.infer<typeof trafficSourceSchema>
