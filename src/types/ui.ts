// Redirect method used in system settings
export interface RedirectMethod {
  type: string
  name: string
}

// System Settings
export interface SystemSettings {
  licenseKey: string
  forceHTTPS: boolean
  defaultHomePageURL: string
  autoExpandCampaigns: boolean
  autoDisplayOfferSources: boolean
  offersDefaultRedirect: RedirectMethod
  landersDefaultRedirect: RedirectMethod
  minConfidenceRateForWinners: number
  clickbankIPNKey: string
  funnelfluxApiKey: string
}

// Inbox message
export interface InboxMessage {
  id: string
  subject: string
  body: string
  date: string
  isRead: boolean
  type?: string
}

// Inbox notification
export interface InboxNotification {
  unreadCount: number
  latestMessages: InboxMessage[]
}

// Domain
export interface Domain {
  id: string
  domain: string
  isDefault: boolean
}

// Stored link
export interface StoredLink {
  id: string
  name: string
  url: string
  clicks?: number
  lastClickDate?: string
}

// Access log entry
export interface AccessLogEntry {
  id: string
  userId: string
  username: string
  action: string
  ip: string
  date: string
  details?: string
}

// User management
export interface ManagedUser {
  id: number
  login: string
  firstname: string
  lastname: string
  email: string
  isAdmin: boolean
  enabled: boolean
  lastLogin?: string
}

// Dashboard types
export interface LiveStats {
  visits: number
  clicks: number
  conversions: number
  revenue: number
  cost: number
  net: number
  roi: string
}

export interface ChartOptions {
  cycle: string
  metric?: string
}

export interface ChartData {
  chartOptions: ChartOptions
  dates: string[]
  datesFormatted: string[]
  visits: number[]
  clicks: number[]
  conversions: number[]
  revenue: number[]
  revenueFormatted: string[]
  cost: number[]
  costFormatted: string[]
  roi: number[]
  roiFormatted: string[]
}

export interface TableStatsOptions {
  statsType: string
}

export interface DashboardData {
  currentPeriod?: {
    timeRange: { start: string; end: string }
    timeZone: { name: string }
  }
  availableTimezones?: string[]
  liveStats?: LiveStats
  chart?: ChartData
  tableStats?: {
    tableStatsOptions: TableStatsOptions
    report: import('./stats').Report
    treeGrid?: unknown
  }
}

// System links
export interface SystemLinkRequest {
  idCampaign: string
  idFunnel: string
  idNode?: string
  idTrafficSource?: string
  domain?: string
  /** Omitted or null → server uses funnel default, then traffic source default (entrance link API). */
  cost?: number
}

export interface SystemLink {
  entranceLink: string
  actionLinks?: Record<string, string>
  noRedirectJS?: string
}

// Update cost
export interface CostUpdateRequest {
  idTrafficSource: string
  idCampaign?: string
  dateFrom: string
  dateTo: string
  timezone: string
  totalCost: number
}

// Traffic source / offer source template
export interface Template {
  id: string
  name: string
}
