import { z } from 'zod/v4'

export type { TrafficFilter } from '@/types/entities'

/**
 * Traffic filter form. Aligns with OpenAPI `#/definitions/TrafficFilter` / {@link TrafficFilter}.
 */
export const trafficFilterSchema = z.object({
  idTrafficFilter: z.string().min(1, 'ID is required'),
  trafficFilterName: z.string().min(1, 'Name is required').max(255),
  filterType: z.enum(['ipAddresses', 'ipRanges', 'referrers', 'userAgents', 'ISPs', 'countries', 'knownBotsAndSpiders']),
  filterEntries: z
    .array(z.string())
    .transform((entries) => entries.map((line) => line.trim()).filter((line) => line.length > 0)),
  redirectToURL: z.string().nullable(),
  isEnabled: z.boolean(),
})

export type TrafficFilterFormData = z.infer<typeof trafficFilterSchema>
