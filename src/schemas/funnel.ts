import { z } from 'zod/v4'

export type { Funnel } from '@/types/entities'

/**
 * Partial funnel metadata for modals (not the full canvas graph). Overlaps
 * {@link Funnel} fields used on create/update; `notes` is UI-only until in OpenAPI.
 * `defaultCostPerEntrance` is edited as a number here; {@link Funnel} uses a string on the wire —
 * coerce when building API payloads.
 */
export const funnelSchema = z.object({
  idFunnel: z.string().optional(),
  idCampaign: z.string().min(1, 'Campaign is required'),
  funnelName: z.string().min(1, 'Funnel name is required').max(255),
  defaultCostPerEntrance: z.number().min(0).default(0),
  notes: z.string().optional(),
  isArchived: z.boolean().default(false),
})

export type FunnelFormValues = z.infer<typeof funnelSchema>
