import { z } from 'zod/v4'

export const systemSettingsSchema = z.object({
  forceHTTPS: z.boolean(),
  defaultHomePageURL: z.string(),
  autoExpandCampaigns: z.boolean(),
  offersDefaultRedirect: z.object({ type: z.string(), name: z.string() }),
  landersDefaultRedirect: z.object({ type: z.string(), name: z.string() }),
  minConfidenceRateForWinners: z.coerce.number().min(0).max(100),
  clickbankIPNKey: z.string(),
})

export type SystemSettingsFormData = z.infer<typeof systemSettingsSchema>
