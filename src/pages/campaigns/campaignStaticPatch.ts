import type { Campaign } from '@/types/entities'
import type { CampaignArchiveTab } from '@/pages/campaigns/campaignTreeAdapter'
import type { CreatedFunnelSummary } from '@/pages/campaigns/AddFunnelModal'
import type { CampaignTreeStaticData } from '@/pages/campaigns/campaignTreeStatic'
import type { IdName } from '@/types/entities'

export function upsertCampaignInStatic(
  staticData: CampaignTreeStaticData,
  saved: Campaign,
): CampaignTreeStaticData {
  const campaignId = String(saved.idCampaign)
  const campaignName = String(saved.campaignName ?? '')
  const isArchived = Boolean(saved.isArchived)
  const campaigns = staticData.campaigns.map((campaign) =>
    campaign.id === campaignId ? { ...campaign, name: campaignName } : campaign,
  )
  const hasCampaign = campaigns.some((campaign) => campaign.id === campaignId)
  const nextCampaigns = hasCampaign
    ? campaigns
    : [...campaigns, { id: campaignId, name: campaignName, funnels: [] }]

  const campaignArchivedById = new Map(staticData.campaignArchivedById)
  campaignArchivedById.set(campaignId, isArchived)

  const orderedFunnels = staticData.orderedFunnels.map((funnel) =>
    funnel.campaignId === campaignId
      ? { ...funnel, campaignName, isArchived }
      : funnel,
  )

  return {
    ...staticData,
    campaigns: nextCampaigns,
    campaignArchivedById,
    orderedFunnels,
  }
}

export function addFunnelToStatic(
  staticData: CampaignTreeStaticData,
  created: CreatedFunnelSummary,
): CampaignTreeStaticData {
  const { idFunnel, funnelName, idCampaign } = created
  const campaign = staticData.campaigns.find((item) => item.id === idCampaign)
  if (!campaign) return staticData

  const funnelRef = {
    id: idFunnel,
    name: funnelName,
    campaignId: idCampaign,
    campaignName: campaign.name,
    isArchived: staticData.campaignArchivedById.get(idCampaign) ?? false,
  }

  const campaigns = staticData.campaigns.map((item) =>
    item.id === idCampaign
      ? {
          ...item,
          funnels: item.funnels.some((funnel) => funnel.id === idFunnel)
            ? item.funnels
            : [...item.funnels, { id: idFunnel, name: funnelName }],
        }
      : item,
  )

  const funnelById = new Map(staticData.funnelById)
  funnelById.set(idFunnel, {
    campaignId: idCampaign,
    campaignName: campaign.name,
    isArchived: funnelRef.isArchived,
  })

  const orderedFunnels = staticData.orderedFunnels.some((funnel) => funnel.id === idFunnel)
    ? staticData.orderedFunnels
    : [...staticData.orderedFunnels, funnelRef]

  return {
    ...staticData,
    campaigns,
    funnelById,
    orderedFunnels,
  }
}

export function cloneCampaignInStatic(
  staticData: CampaignTreeStaticData,
  _sourceCampaignId: string,
  newCampId: string,
  newName: string,
  funnelList: IdName[],
): CampaignTreeStaticData {
  const campaigns = [
    ...staticData.campaigns,
    {
      id: newCampId,
      name: newName,
      funnels: funnelList.map((funnel) => ({
        id: String(funnel.id),
        name: String(funnel.name),
      })),
    },
  ]

  const campaignArchivedById = new Map(staticData.campaignArchivedById)
  campaignArchivedById.set(newCampId, false)

  const funnelById = new Map(staticData.funnelById)
  const orderedFunnels = [...staticData.orderedFunnels]
  for (const funnel of funnelList) {
    const funnelId = String(funnel.id)
    const funnelName = String(funnel.name)
    funnelById.set(funnelId, {
      campaignId: newCampId,
      campaignName: newName,
      isArchived: false,
    })
    orderedFunnels.push({
      id: funnelId,
      name: funnelName,
      campaignId: newCampId,
      campaignName: newName,
      isArchived: false,
    })
  }

  return {
    ...staticData,
    campaigns,
    campaignArchivedById,
    funnelById,
    orderedFunnels,
  }
}

export function removeCampaignFromStatic(
  staticData: CampaignTreeStaticData,
  campaignId: string,
): CampaignTreeStaticData {
  const campaigns = staticData.campaigns.filter((campaign) => campaign.id !== campaignId)
  const orderedFunnels = staticData.orderedFunnels.filter((funnel) => funnel.campaignId !== campaignId)
  const funnelById = new Map(staticData.funnelById)
  for (const [funnelId, meta] of funnelById) {
    if (meta.campaignId === campaignId) funnelById.delete(funnelId)
  }
  const campaignArchivedById = new Map(staticData.campaignArchivedById)
  campaignArchivedById.delete(campaignId)
  return {
    ...staticData,
    campaigns,
    orderedFunnels,
    funnelById,
    campaignArchivedById,
  }
}

export function removeFunnelFromStatic(
  staticData: CampaignTreeStaticData,
  funnelId: string,
): CampaignTreeStaticData {
  const campaigns = staticData.campaigns.map((campaign) => ({
    ...campaign,
    funnels: campaign.funnels.filter((funnel) => funnel.id !== funnelId),
  }))
  const orderedFunnels = staticData.orderedFunnels.filter((funnel) => funnel.id !== funnelId)
  const funnelById = new Map(staticData.funnelById)
  funnelById.delete(funnelId)
  return {
    ...staticData,
    campaigns,
    orderedFunnels,
    funnelById,
  }
}

export function setArchiveOnStatic(
  staticData: CampaignTreeStaticData,
  tab: CampaignArchiveTab,
  campaignId: string | null,
  funnelId: string | null,
  archive: boolean,
): CampaignTreeStaticData {
  let next = staticData
  if (campaignId) {
    const campaignArchivedById = new Map(next.campaignArchivedById)
    campaignArchivedById.set(campaignId, archive)
    next = {
      ...next,
      campaignArchivedById,
      orderedFunnels: next.orderedFunnels.map((funnel) =>
        funnel.campaignId === campaignId ? { ...funnel, isArchived: archive } : funnel,
      ),
    }
  }
  if (funnelId) {
    next = {
      ...next,
      orderedFunnels: next.orderedFunnels.map((funnel) =>
        funnel.id === funnelId ? { ...funnel, isArchived: archive } : funnel,
      ),
    }
  }
  if (tab === 'active' && archive) {
    next = {
      ...next,
      orderedFunnels: next.orderedFunnels.filter((funnel) => {
        if (funnelId && funnel.id === funnelId) return false
        if (campaignId && funnel.campaignId === campaignId) return false
        return true
      }),
      campaigns: next.campaigns
        .map((campaign) => ({
          ...campaign,
          funnels: campaign.funnels.filter((funnel) => {
            if (funnelId && funnel.id === funnelId) return false
            if (campaignId && campaign.id === campaignId) return false
            return true
          }),
        }))
        .filter((campaign) => campaign.funnels.length > 0 || campaign.id !== campaignId),
    }
  }
  if (tab === 'archived' && !archive) {
    next = {
      ...next,
      orderedFunnels: next.orderedFunnels.filter((funnel) => {
        if (funnelId && funnel.id === funnelId) return false
        if (campaignId && funnel.campaignId === campaignId) return false
        return true
      }),
    }
  }
  return next
}
