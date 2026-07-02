import { z } from 'zod/v4'
import { linesToKv } from '@/lib/kvLines'

export const CAMPAIGN_NAME_MAX_LEN = 255

const campaignNameSchema = z
  .string()
  .trim()
  .min(1, 'Campaign name is required')
  .max(CAMPAIGN_NAME_MAX_LEN, `Campaign name must be at most ${CAMPAIGN_NAME_MAX_LEN} characters`)

/** Validates a `key=value`-per-line textarea via the same parser the submit
 * payload uses ({@link linesToKv}); blank lines are ignored there. */
function kvLinesRefine(val: string, ctx: z.core.$RefinementCtx) {
  const seen = new Set<string>()
  for (const row of linesToKv(val)) {
    if (row.key === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Every line needs a key before "="',
      })
      return
    }
    if (seen.has(row.key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate key "${row.key}"`,
      })
      return
    }
    seen.add(row.key)
  }
}

/** Create Campaign modal: name only. */
export const campaignCreateSchema = z.object({
  campaignName: campaignNameSchema,
})

export type CampaignCreateFormValues = z.infer<typeof campaignCreateSchema>

/** Edit Campaign modal: name + advanced `key=value` textareas (parsed with
 * {@link linesToKv} when building the save payload). */
export const campaignEditSchema = z.object({
  campaignName: campaignNameSchema,
  customTokensText: z.string().superRefine(kvLinesRefine),
  accumulatedParamsText: z.string().superRefine(kvLinesRefine),
})

export type CampaignEditFormValues = z.infer<typeof campaignEditSchema>
