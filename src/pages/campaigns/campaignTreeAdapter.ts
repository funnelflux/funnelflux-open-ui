import type { ReportCell } from '@/types/stats'

export interface CampaignRow {
  id: string
  name: string
  cells: ReportCell[]
  campaignId: string
  campaignName?: string
  funnelId?: string
  categoryId?: string
  _isCategoryHeader?: boolean
  _categoryId?: string
  isArchived?: boolean
  [key: string]: unknown
}

export type CampaignArchiveTab = 'active' | 'archived' | 'all'
