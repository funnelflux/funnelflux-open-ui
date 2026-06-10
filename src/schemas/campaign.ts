import { z } from 'zod/v4'

export type { Campaign } from '@/types/entities'

/**
 * Campaign create/update form. Field names align with OpenAPI `#/definitions/Campaign` /
 * {@link Campaign}.
 */
export const campaignSchema = z.object({
  idCampaign: z.string().optional(),
  campaignName: z
    .string()
    .min(1, 'Campaign name is required')
    .max(255, 'Campaign name must be at most 255 characters'),
  acculumatedUrlParams: z.array(
    z.object({ key: z.string().min(1, 'Parameter name is required'), value: z.string() }),
  ),
  customTokens: z.array(
    z.object({ key: z.string().min(1, 'Token name is required'), value: z.string() }),
  ),
  isArchived: z.boolean().optional(),
})

export type CampaignFormData = z.infer<typeof campaignSchema>
