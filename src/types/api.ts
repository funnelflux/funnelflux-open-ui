// Auth
export interface SessionResponse {
  apiKey: string
  userId: string
  username: string
  isAdmin: boolean
}

// Permissions
export interface AssetPermissions {
  enabled: boolean
  canView: boolean
  canCreateNew: boolean
  canEdit: boolean
  canArchive: boolean
  canDelete: boolean
  restrictTo: string[]
}

export interface AssetPermissions2 extends AssetPermissions {
  restrictToAssetIds: string[]
  restrictToCategoryIds: string[]
}

export interface Permissions {
  stats: { enabled: boolean; canView: boolean; canEditCustomViews: boolean }
  campaigns: AssetPermissions
  trafficSources: AssetPermissions
  offerSources: AssetPermissions
  offers: AssetPermissions2
  landers: AssetPermissions2
  systemLinks: { enabled: boolean; canView: boolean }
  storedLinks: {
    enabled: boolean; canView: boolean; canCreateNew: boolean
    canEdit: boolean; canDelete: boolean; canResetStats: boolean
  }
  trafficFilters: {
    enabled: boolean; canView: boolean; canCreateNew: boolean
    canEdit: boolean; canDelete: boolean; canApplyToPastStats: boolean
  }
  dataUpdates: {
    enabled: boolean; canUpdateConversions: boolean
    canUpdateTrafficCost: boolean; canResetStats: boolean
  }
  systemUpdates: { enabled: boolean; canView: boolean; canInstallUpdate: boolean }
}

export interface UserProfile {
  id: number
  login: string
  firstname: string
  lastname: string
  email: string
  avatarURL: string
  isAdmin: boolean
  enabled: boolean
  permissions: Permissions
}

// Entities
export interface IdName {
  id: string
  name: string
}

export interface Campaign {
  idCampaign: string
  campaignName: string
  notes?: string
  isArchived?: boolean
}

export interface Funnel {
  idFunnel: string
  idCampaign: string
  funnelName: string
  defaultCostPerEntrance?: number
  nodes?: FunnelNode[]
  connections?: FunnelConnection[]
  isArchived?: boolean
}

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

export interface Page {
  idPage: string
  pageName: string
  pageType: 'lander' | 'offer'
  categoryId?: string
  url?: string
  isArchived?: boolean
}

export interface TrafficSource {
  idTrafficSource: string
  trafficSourceName: string
  categoryId?: string
  defaultCostPerEntrance?: number
  isArchived?: boolean
}

export interface OfferSource {
  idOfferSource: string
  offerSourceName: string
}

// API Error
export interface ApiError {
  code: number
  message: string
}
