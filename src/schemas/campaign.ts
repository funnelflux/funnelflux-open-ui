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
  defaultCostPerEntrance: z.coerce.number().min(0).optional(),
  costOverrides: z.array(
    z.object({
      idTrafficSource: z.string(),
      cost: z.coerce.number().min(0),
    }),
  ).optional(),
  postbackOverrides: z.array(
    z.object({
      idTrafficSource: z.string(),
      postbackType: z.enum(['none', 'postbackUrl', 'pixelUrl', 'javascript']),
      postbackCode: z.string(),
    }),
  ).optional(),
  isArchived: z.boolean().optional(),
})

export type CampaignFormData = z.infer<typeof campaignSchema>
