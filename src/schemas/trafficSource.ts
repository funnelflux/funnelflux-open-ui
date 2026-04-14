import { z } from 'zod/v4'

export type { TrafficSource } from '@/types/entities'

/**
 * Traffic source create/update form. Aligns with OpenAPI `#/definitions/TrafficSource` /
 * {@link TrafficSource}. `postback.idTrafficSource` may be filled by the server after create.
 */
export const trafficSourceSchema = z.object({
  idTrafficSource: z.string().optional(),
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
  isArchived: z.boolean().optional(),
})

export type TrafficSourceFormData = z.infer<typeof trafficSourceSchema>
