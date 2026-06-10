import { z } from 'zod/v4'
import { optionalHttpUrlStringSchema } from '@/lib/validateHttpUrl'
import type { RedirectMethod } from '@/types/ui'

export type { SystemSettings } from '@/types/ui'

const REDIRECT_METHOD_LITERALS: [RedirectMethod['method'], ...RedirectMethod['method'][]] = [
  '301',
  '307',
  'umr',
  'fluxify',
]

const redirectMethodMethodSchema = z.enum(REDIRECT_METHOD_LITERALS)

/**
 * UI shape for system settings. Save payloads match {@link SystemSettings} after mapping
 * redirect pickers through `formDataToSystemSettingsPayload` (`type`/`name` → {@link RedirectMethod}).
 */
export const systemSettingsSchema = z.object({
  forceHTTPS: z.boolean(),
  defaultHomePageURL: optionalHttpUrlStringSchema,
  autoExpandCampaigns: z.boolean(),
  offersDefaultRedirect: z.object({
    type: redirectMethodMethodSchema,
    name: z.string(),
  }),
  landersDefaultRedirect: z.object({
    type: redirectMethodMethodSchema,
    name: z.string(),
  }),
  minConfidenceRateForWinners: z.number().min(0).max(100),
  clickbankIPNKey: z.string(),
})

export type SystemSettingsFormData = z.infer<typeof systemSettingsSchema>
