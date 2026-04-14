// Re-export generated types from the OpenAPI spec
export type {
  RedirectMethod,
  SystemSettings,
  TrafficSourceInfo,
  SystemLinksTrackingURLOptions,
  SystemLinksOptions,
  SystemLinksData,
  StoredLink,
  StoredLinksOptions,
  StoredLinksData,
  InboxMessage,
  InboxData,
  InboxNotifications,
  AccessLogRow,
  AccessLogData,
  SystemUpdateRow,
  SystemUpdateCurrentlyInstalling,
  SystemUpdatesData,
  DrilldownAvailableGrouping,
  DrilldownGroupBy,
  DrilldownView,
  DrilldownOptions,
  DrilldownData,
  QuickStatsOptions,
  QuickStatsData,
  DashboardElements,
  DashboardData,
  LiveStats,
  ChartOptions,
  Chart,
  TableStatsOptions,
  TableStats,
  CurrentPeriod,
  MiscElements,
  MiscData,
  ResetStatsPageData,
  ResetStatsOptions,
  TrafficFiltersData,
  UpdateCostPageData,
  UpdateCostSegment,
  UpdateCostData,
  UpdateConversionsEntry,
  UpdateConversionsData,
  OffersOptions,
  OffersData,
  LandersOptions,
  LandersData,
  OfferSourcesOptions,
  OfferSourcesData,
  TrafficSourcesOptions,
  TrafficSourcesData,
  CampaignsOptions,
  CampaignsData,
  UserManagementRow,
  UserManagementData,
  UserProfile,
  ReportPaging,
  ReportSorting,
  SessionInfo,
  NotificationCheck,
  AccessRight,
  BulkIDs,
} from './generated/ui';

// Aliases for backward compatibility with existing code
export type { AccessLogRow as AccessLogEntry } from './generated/ui';
export type { UserManagementRow as ManagedUser } from './generated/ui';

// App-only types not in the OpenAPI spec

export interface Domain {
  id: string;
  domain: string;
  isDefault: boolean;
}

export interface Template {
  id: string;
  name: string;
}

export interface SystemLinkRequest {
  idCampaign: string;
  idFunnel: string;
  idNode?: string;
  idTrafficSource?: string;
  domain?: string;
  cost?: number;
}

export interface SystemLink {
  entranceLink: string;
  actionLinks?: Record<string, string>;
  noRedirectJS?: string;
}

export interface InboxNotification {
  unreadCount: number;
  latestMessages: import('./generated/ui').InboxMessage[];
}
