import { z } from 'zod'

export const funnelSchema = z.object({
  idFunnel: z.string().optional(),
  idCampaign: z.string().min(1, 'Campaign is required'),
  funnelName: z.string().min(1, 'Funnel name is required').max(255),
  defaultCostPerEntrance: z.number().min(0).default(0),
  notes: z.string().optional(),
  isArchived: z.boolean().default(false),
})

export type FunnelFormValues = z.infer<typeof funnelSchema>
