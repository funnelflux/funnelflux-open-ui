import { z } from 'zod/v4'

export type { TrafficFilter } from '@/types/entities'

function parseIpRangeEntry(entry: string): [string, string] | null {
  const parts = entry.split(',')
  if (parts.length !== 2) return null
  const from = parts[0]?.trim() ?? ''
  const to = parts[1]?.trim() ?? ''
  if (!from || !to) return null
  return [from, to]
}

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
}).superRefine((value, ctx) => {
  if (value.filterType === 'ipRanges') {
    if (value.filterEntries.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['filterEntries'],
        message: 'At least one IP range is required.',
      })
    } else {
      const hasInvalidRange = value.filterEntries.some((entry) => parseIpRangeEntry(entry) === null)
      if (hasInvalidRange) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['filterEntries'],
          message: 'Each IP range must be a pair in "from, to" format.',
        })
      }
    }
  }

  if (value.redirectToURL) {
    const parsed = z.url().safeParse(value.redirectToURL)
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redirectToURL'],
        message: 'Redirect URL must be a valid URL (including http:// or https://).',
      })
    }
  }
})

export type TrafficFilterFormData = z.infer<typeof trafficFilterSchema>
