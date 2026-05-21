import { idNamePairFromCloneWire } from '@/api/cloneResponse'
import { api } from '@/api/client'
import type { Funnel } from '@/types/entities'

export const FUNNEL_NAME_MAX_LEN = 255

export type CloneFunnelInput = {
  sourceFunnelId: string
  sourceCampaignId: string
  targetCampaignId: string
  funnelName: string
}

export type ClonedFunnelSummary = {
  idFunnel: string
  funnelName: string
  idCampaign: string
}

/** Suggested name when cloning (strips prior clone timestamp suffix if present). */
export function defaultClonedFunnelName(sourceName: string): string {
  const suffix = ' (copy)'
  const base = sourceName.replace(/ - ([0-9.]+)$/, '').trim() || sourceName.trim()
  if (base.length + suffix.length <= FUNNEL_NAME_MAX_LEN) return `${base}${suffix}`
  return `${base.slice(0, FUNNEL_NAME_MAX_LEN - suffix.length)}${suffix}`
}

/**
 * Clone via V2 API, then apply optional rename and/or move to another campaign.
 */
export async function cloneFunnelWithOptions(input: CloneFunnelInput): Promise<ClonedFunnelSummary> {
  const trimmedName = input.funnelName.trim().slice(0, FUNNEL_NAME_MAX_LEN)
  if (!trimmedName) {
    throw new Error('Funnel name is required')
  }

  const wire = await api.post<Record<string, unknown>>(
    '/data/campaign/funnel/clone/',
    undefined,
    { idFunnel: input.sourceFunnelId },
  )
  const cloned = idNamePairFromCloneWire(wire, 'idFunnel', 'funnelName')
  let idFunnel = cloned.id
  if (!idFunnel) {
    throw new Error('Clone succeeded but no funnel id was returned')
  }
  let funnelName = cloned.name || trimmedName
  let idCampaign = input.sourceCampaignId

  if (trimmedName !== funnelName.trim()) {
    const funnel = await api.get<Funnel>('/data/campaign/funnel/find/byId/', {
      idFunnel,
      loadDependencies: 'false',
    })
    const renamed = await api.put<Funnel>(
      '/data/campaign/funnel/save/',
      { ...funnel, funnelName: trimmedName },
      { deleteDependencies: 'false' },
    )
    funnelName = String(renamed.funnelName ?? trimmedName)
  }

  if (input.targetCampaignId !== input.sourceCampaignId) {
    const movedWire = await api.put<Record<string, unknown>>('/data/campaign/funnel/move/', {
      idFunnel,
      idCampaign: input.targetCampaignId,
    })
    const moved = idNamePairFromCloneWire(movedWire, 'idFunnel', 'funnelName')
    idFunnel = moved.id || idFunnel
    funnelName = moved.name || funnelName
    idCampaign = input.targetCampaignId
  }

  return { idFunnel, funnelName, idCampaign }
}
