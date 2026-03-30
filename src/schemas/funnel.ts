import { z } from 'zod'

export const funnelSchema = z.object({
  idFunnel: z.string().optional(),
  idCampaign: z.string().min(1, 'Campaign is required'),
  funnelName: z.string().min(1, 'Funnel name is required').max(255),
  defaultCostPerEntrance: z.number().min(0).default(0),
  defaultRedirectUrl: z.string().default(''),
  defaultOverflowUrl: z.string().default(''),
  deduplicateByIp: z.boolean().default(false),
  deduplicateWindowHours: z.number().min(0).max(720).default(24),
  isArchived: z.boolean().default(false),
})

export type FunnelFormValues = z.infer<typeof funnelSchema>
