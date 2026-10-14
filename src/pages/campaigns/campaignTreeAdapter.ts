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
  /** Funnel rows: the funnel's own flag. Campaign header rows: the campaign's flag. */
  isArchived?: boolean
  /** Parent campaign's archive flag (funnel rows). */
  campaignIsArchived?: boolean
  [key: string]: unknown
}

export type CampaignArchiveTab = 'active' | 'archived' | 'all'
