import { z } from 'zod/v4'

/** Funnel-node URL pass-through settings (lander/offer advanced modal). */
export const nodeAdvancedSettingsSchema = z.object({
  accumulateUrlParams: z.boolean(),
  additionalTokens: z.array(
    z.object({
      field: z.string(),
      token: z.string(),
    }),
  ),
})

export type NodeAdvancedSettingsFormData = z.infer<typeof nodeAdvancedSettingsSchema>
