import type { Campaign } from '@/types/entities'
import type { CreatedFunnelSummary } from '@/pages/campaigns/AddFunnelModal'
import type { CampaignTreeFunnelRef, CampaignTreeStaticData } from '@/pages/campaigns/campaignTreeStatic'

/** Inserts funnels after the last funnel of their campaign (or at the end) to keep campaign grouping. */
function insertGrouped(
  orderedFunnels: CampaignTreeFunnelRef[],
  campaignId: string,
  added: CampaignTreeFunnelRef[],
): CampaignTreeFunnelRef[] {
  let lastIndex = -1
  orderedFunnels.forEach((funnel, index) => {
    if (funnel.campaignId === campaignId) lastIndex = index
  })
  if (lastIndex < 0) return [...orderedFunnels, ...added]
  return [...orderedFunnels.slice(0, lastIndex + 1), ...added, ...orderedFunnels.slice(lastIndex + 1)]
}

export function upsertCampaignInStatic(
  staticData: CampaignTreeStaticData,
  saved: Campaign,
): CampaignTreeStaticData {
  const campaignId = String(saved.idCampaign)
  const campaignName = String(saved.campaignName ?? '')
  const isArchived = Boolean(saved.isArchived)
  const hasCampaign = staticData.campaigns.some((campaign) => campaign.id === campaignId)
  const campaigns = hasCampaign
    ? staticData.campaigns.map((campaign) =>
        campaign.id === campaignId ? { ...campaign, name: campaignName, isArchived } : campaign,
      )
    : [...staticData.campaigns, { id: campaignId, name: campaignName, isArchived }]

  const orderedFunnels = staticData.orderedFunnels.map((funnel) =>
    funnel.campaignId === campaignId
      ? { ...funnel, campaignName, campaignIsArchived: isArchived }
      : funnel,
  )

  return { campaigns, orderedFunnels }
}

export function addFunnelToStatic(
  staticData: CampaignTreeStaticData,
  created: CreatedFunnelSummary,
): CampaignTreeStaticData {
  const { idFunnel, funnelName, idCampaign } = created
  const campaign = staticData.campaigns.find((item) => item.id === idCampaign)
  if (!campaign) return staticData
  if (staticData.orderedFunnels.some((funnel) => funnel.id === idFunnel)) return staticData

  const funnelRef: CampaignTreeFunnelRef = {
    id: idFunnel,
    name: funnelName,
    campaignId: idCampaign,
    campaignName: campaign.name,
    isArchived: false,
    campaignIsArchived: campaign.isArchived,
  }

  return {
    ...staticData,
    orderedFunnels: insertGrouped(staticData.orderedFunnels, idCampaign, [funnelRef]),
  }
}

export function removeCampaignFromStatic(
  staticData: CampaignTreeStaticData,
  campaignId: string,
): CampaignTreeStaticData {
  return {
    campaigns: staticData.campaigns.filter((campaign) => campaign.id !== campaignId),
    orderedFunnels: staticData.orderedFunnels.filter((funnel) => funnel.campaignId !== campaignId),
  }
}

export function removeFunnelFromStatic(
  staticData: CampaignTreeStaticData,
  funnelId: string,
): CampaignTreeStaticData {
  return {
    ...staticData,
    orderedFunnels: staticData.orderedFunnels.filter((funnel) => funnel.id !== funnelId),
  }
}

/** Updates archive flags only; tab membership is derived at selection time. */
export function setArchiveOnStatic(
  staticData: CampaignTreeStaticData,
  campaignId: string | null,
  funnelId: string | null,
  archive: boolean,
): CampaignTreeStaticData {
  if (campaignId) {
    return {
      campaigns: staticData.campaigns.map((campaign) =>
        campaign.id === campaignId ? { ...campaign, isArchived: archive } : campaign,
      ),
      orderedFunnels: staticData.orderedFunnels.map((funnel) =>
        funnel.campaignId === campaignId ? { ...funnel, campaignIsArchived: archive } : funnel,
      ),
    }
  }
  if (funnelId) {
    return {
      ...staticData,
      orderedFunnels: staticData.orderedFunnels.map((funnel) =>
        funnel.id === funnelId ? { ...funnel, isArchived: archive } : funnel,
      ),
    }
  }
  return staticData
}
