import { api } from '@/api/client'
import type { Campaign } from '@/types/entities'
import type { CampaignArchiveTab } from '@/pages/campaigns/campaignTreeAdapter'

export type CampaignTreeCampaignRef = {
  id: string
  name: string
  isArchived: boolean
}

export type CampaignTreeFunnelRef = {
  id: string
  name: string
  campaignId: string
  campaignName: string
  /** The funnel's own archive flag. */
  isArchived: boolean
  /** The parent campaign's archive flag. */
  campaignIsArchived: boolean
}

/** Tab-independent campaign/funnel tree; tab filtering happens in {@link selectFunnelsForTab}. */
export type CampaignTreeStaticData = {
  campaigns: CampaignTreeCampaignRef[]
  /** Funnels grouped by campaign, in campaign order. */
  orderedFunnels: CampaignTreeFunnelRef[]
}

/** Row of `GET /data/campaign/funnel/list/?status=all`. */
interface FunnelListItem {
  id: string
  name?: string
  idCampaign: string
  isArchived?: boolean
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

export function buildCampaignTreeStaticData(
  rawCampaigns: readonly Campaign[],
  rawFunnels: readonly FunnelListItem[],
): CampaignTreeStaticData {
  const campaigns: CampaignTreeCampaignRef[] = rawCampaigns.map((campaign) => ({
    id: String(campaign.idCampaign),
    name: String(campaign.campaignName ?? ''),
    isArchived: Boolean(campaign.isArchived),
  })).sort(byName)
  const funnelsByCampaign = new Map<string, CampaignTreeFunnelRef[]>()
  for (const campaign of campaigns) funnelsByCampaign.set(campaign.id, [])
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]))

  for (const funnel of rawFunnels) {
    const campaignId = String(funnel.idCampaign)
    const campaign = campaignById.get(campaignId)
    if (!campaign) continue
    funnelsByCampaign.get(campaignId)!.push({
      id: String(funnel.id),
      name: String(funnel.name ?? ''),
      campaignId,
      campaignName: campaign.name,
      isArchived: Boolean(funnel.isArchived),
      campaignIsArchived: campaign.isArchived,
    })
  }

  return {
    campaigns,
    orderedFunnels: campaigns.flatMap((campaign) => funnelsByCampaign.get(campaign.id)!.sort(byName)),
  }
}

export async function fetchCampaignTreeStaticData(): Promise<CampaignTreeStaticData> {
  const [funnels, campaigns] = await Promise.all([
    api.get<FunnelListItem[]>('/data/campaign/funnel/list/', { status: 'all' }),
    api.get<Campaign[]>('/data/campaign/find/byStatus/', { status: 'all' }),
  ])
  return buildCampaignTreeStaticData(campaigns ?? [], funnels ?? [])
}

export function selectFunnelsForTab(
  staticData: CampaignTreeStaticData,
  tab: CampaignArchiveTab,
): CampaignTreeFunnelRef[] {
  if (tab === 'all') return staticData.orderedFunnels
  const wantArchived = tab === 'archived'
  return staticData.orderedFunnels.filter(
    (funnel) => (funnel.campaignIsArchived || funnel.isArchived) === wantArchived,
  )
}
