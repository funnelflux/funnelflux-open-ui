import { z } from 'zod/v4'
import { httpUrlStringSchema } from '@/lib/validateHttpUrl'

/** External URL funnel node edit form (canvas modal). */
export const externalUrlNodeFormSchema = z.object({
  label: z.string(),
  url: httpUrlStringSchema,
})

export type ExternalUrlNodeFormData = z.infer<typeof externalUrlNodeFormSchema>
