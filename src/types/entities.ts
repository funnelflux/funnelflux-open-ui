// Key-value pair used across multiple entities
export interface KeyValuePair {
  key: string
  value: string
}

// Campaign
export interface Campaign {
  idCampaign: string
  campaignName: string
  acculumatedUrlParams: KeyValuePair[]
  customTokens: KeyValuePair[]
  isArchived: boolean
}

// Funnel
export interface FunnelNode {
  idNode: string
  idFunnel: string
  nodeType: number
  nodeName: string
  nodeParams: Record<string, unknown>
  percentPosX: number
  percentPosY: number
  isArchived?: boolean
}

export interface FunnelConnection {
  idConnection: string
  idFunnel: string
  idSourceNode: string
  idTargetNode: string
  weight?: number
  elementData?: Record<string, unknown>
}

export interface Funnel {
  idFunnel: string
  idCampaign: string
  funnelName: string
  defaultCostPerEntrance: number
  nodes: FunnelNode[]
  connections: FunnelConnection[]
  isArchived: boolean
}

// Page (lander or offer)
export interface OfferParams {
  idOfferSource: string
  payout: number
}

export interface FluxifyLinkRewriterParams {
  map: KeyValuePair[]
}

export interface FluxifyContentRewriterParams {
  map: KeyValuePair[]
  headerCode: string
  footerCode: string
}

export interface FluxifyReferrerAndUASpooferParams {
  referrers: string[]
  userAgents: string[]
}

export interface FluxifyParams {
  enableCache: boolean
  enableDirectTrafficProtection: boolean
  enableLinkRewriter: boolean
  enableContentRewriter: boolean
  enableVideoAutoPlayBreaker: boolean
  enableExitPopupBreaker: boolean
  enableAnalyticsBreaker: boolean
  enableReferrerAndUASpoofer: boolean
  linkRewriterParams?: FluxifyLinkRewriterParams
  contentRewriterParams?: FluxifyContentRewriterParams
  referrerAndUASpooferParams?: FluxifyReferrerAndUASpooferParams
}

export type PageType = 'lander' | 'offer'
export type RedirectType = '301' | '307' | 'umr' | 'fluxify'

export interface Page {
  idPage: string
  pageType: PageType
  pageName: string
  url: string
  redirectType: RedirectType
  tags: string[]
  notes: string
  offerParams?: OfferParams
  fluxifyParams?: FluxifyParams
  isArchived: boolean
}

// Traffic Source
export type CostType = 'cpe' | 'cpa'
export type PostbackType = 'none' | 'postbackUrl' | 'pixelUrl' | 'javascript'

export interface Postback {
  idTrafficSource: string
  postbackType: PostbackType
  postbackCode: string
}

export interface TrafficSource {
  idTrafficSource: string
  trafficSourceName: string
  costType: CostType
  defaultCost: number
  trackingFields: KeyValuePair[]
  postback: Postback
  isArchived: boolean
  categoryName: string
}

// Offer Source
export interface OfferSource {
  idOfferSource: string
  offerSourceName: string
  subId: string
  querySeparator: string
  postbackSubId: string
  postbackTxId: string
  postbackPayout: string
  isArchived: boolean
}

// Traffic Filter
export type FilterType =
  | 'ipAddresses'
  | 'ipRanges'
  | 'referrers'
  | 'userAgents'
  | 'ISPs'
  | 'countries'
  | 'knownBotsAndSpiders'

export interface TrafficFilter {
  idTrafficFilter: string
  trafficFilterName: string
  filterType: FilterType
  filterEntries: string[]
  redirectToURL: string | null
  isEnabled: boolean
}

// Tag
export interface Tag {
  id: string
  name: string
}

// Simple id+name pair returned by list endpoints
export interface IdName {
  id: string
  name: string
}
