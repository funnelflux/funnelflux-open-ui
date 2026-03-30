import { z } from 'zod/v4'

export const campaignSchema = z.object({
  idCampaign: z.string().optional(),
  campaignName: z.string().min(1, 'Campaign name is required'),
  acculumatedUrlParams: z.array(
    z.object({ key: z.string(), value: z.string() }),
  ),
  customTokens: z.array(
    z.object({ key: z.string(), value: z.string() }),
  ),
  isArchived: z.boolean().optional(),
})

export type CampaignFormData = z.infer<typeof campaignSchema>
