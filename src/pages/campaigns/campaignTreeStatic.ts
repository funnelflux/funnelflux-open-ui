import { api } from '@/api/client'
import type { Campaign } from '@/types/entities'
import type { CampaignArchiveTab } from '@/pages/campaigns/campaignTreeAdapter'

export interface CampaignHierarchyFunnel {
  id: string
  name: string
}

export interface CampaignHierarchyCampaign {
  id: string
  name: string
  funnels: CampaignHierarchyFunnel[]
}

interface CampaignHierarchyResponse {
  campaigns: CampaignHierarchyCampaign[]
}

export type CampaignTreeFunnelRef = {
  id: string
  name: string
  campaignId: string
  campaignName: string
  isArchived: boolean
}

export type CampaignTreeStaticData = {
  campaigns: CampaignHierarchyCampaign[]
  campaignArchivedById: Map<string, boolean>
  funnelById: Map<string, Omit<CampaignTreeFunnelRef, 'id' | 'name'>>
  orderedFunnels: CampaignTreeFunnelRef[]
}

export async function fetchCampaignTreeStaticData(
  archiveStatus: CampaignArchiveTab,
): Promise<CampaignTreeStaticData> {
  const [hierarchy, campaignsByStatus] = await Promise.all([
    api.get<CampaignHierarchyResponse>('/ui/campaigns/hierarchy/').catch(async () =>
      api.post<CampaignHierarchyResponse>('/ui/campaigns/hierarchy/', undefined)),
    api.get<Campaign[]>('/data/campaign/find/byStatus/', { status: archiveStatus }),
  ])

  const campaignArchivedById = new Map<string, boolean>()
  for (const campaign of campaignsByStatus ?? []) {
    campaignArchivedById.set(String(campaign.idCampaign), Boolean(campaign.isArchived))
  }

  const funnelById = new Map<string, Omit<CampaignTreeFunnelRef, 'id' | 'name'>>()
  const campaigns: CampaignHierarchyCampaign[] = []

  for (const raw of hierarchy.campaigns ?? []) {
    const campaignId = String(raw.id)
    if (!campaignArchivedById.has(campaignId)) continue
    const campaignName = String(raw.name ?? '')
    const funnels: CampaignHierarchyFunnel[] = []
    for (const funnel of raw.funnels ?? []) {
      const funnelId = String(funnel.id)
      const funnelName = String(funnel.name ?? '')
      funnelById.set(funnelId, {
        campaignId,
        campaignName,
        isArchived: campaignArchivedById.get(campaignId) ?? false,
      })
      funnels.push({ id: funnelId, name: funnelName })
    }
    campaigns.push({ id: campaignId, name: campaignName, funnels })
  }

  const orderedFunnels: CampaignTreeFunnelRef[] = []
  for (const campaign of campaigns) {
    const isArchived = campaignArchivedById.get(campaign.id) ?? false
    for (const funnel of campaign.funnels) {
      orderedFunnels.push({
        id: funnel.id,
        name: funnel.name,
        campaignId: campaign.id,
        campaignName: campaign.name,
        isArchived,
      })
    }
  }

  return {
    campaigns,
    campaignArchivedById,
    funnelById,
    orderedFunnels,
  }
}
