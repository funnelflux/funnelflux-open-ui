import { z } from 'zod/v4'

/** Matches OpenAPI #/definitions/Campaign (data/definition.yaml). */
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
