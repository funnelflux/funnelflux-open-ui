import { z } from 'zod/v4'

export const trafficFilterSchema = z.object({
  idTrafficFilter: z.string().optional(),
  trafficFilterName: z.string().min(1, 'Name is required').max(255),
  filterType: z.enum(['ipAddresses', 'ipRanges', 'referrers', 'userAgents', 'ISPs', 'countries', 'knownBotsAndSpiders']),
  filterEntries: z.array(z.string()),
  redirectToURL: z.string().nullable(),
  isEnabled: z.boolean(),
})

export type TrafficFilterFormData = z.infer<typeof trafficFilterSchema>
