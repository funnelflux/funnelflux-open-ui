import { z } from 'zod/v4'

/** OpenAPI `Funnel.funnelName`: max 255 characters. */
export const FUNNEL_NAME_MAX_LEN = 255

/** Add/Clone Funnel modals: target campaign + name. */
export const funnelModalSchema = z.object({
  idCampaign: z.string().min(1, 'Campaign is required'),
  funnelName: z
    .string()
    .trim()
    .min(1, 'Funnel name is required')
    .max(FUNNEL_NAME_MAX_LEN, `Funnel name must be at most ${FUNNEL_NAME_MAX_LEN} characters`),
})

export type FunnelModalFormValues = z.infer<typeof funnelModalSchema>
