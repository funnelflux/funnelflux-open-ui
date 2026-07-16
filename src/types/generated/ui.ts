// Auto-generated from api-specs/ui-api.yaml -- do not edit manually

import type { KeyValuePair, KeyValuePairTreeItem, TrafficFilter } from './data';
export type { KeyValuePair, KeyValuePairTreeItem, TrafficFilter } from './data';
import type { ApiDateTimeRange, ApiTimeZone, Report, SortingColumn } from './stats';
export type { ApiDateTimeRange, ApiTimeZone, Report, SortingColumn } from './stats';

export interface ResetStatsPageData {
  availableCampaignsAndFunnels: KeyValuePairTreeItem[];
  availableTrafficSources: TrafficSourceInfo[];
  availableTimezones: KeyValuePair[];
}

export interface ResetStatsOptions {
  currentPeriod: CurrentPeriod;
  idCampaign?: string | null;
  idFunnel?: string | null;
  idTrafficSource?: string | null;
  idVisitor?: string | null;
}

export interface TrafficFiltersData {
  filters: TrafficFilter[];
  availableCountries: KeyValuePair[];
  treeGrid?: Record<string, unknown>;
}

export interface UpdateCostPageData {
  availableCampaignsAndFunnels: KeyValuePairTreeItem[];
  availableTrafficSources: TrafficSourceInfo[];
  availableCountries: KeyValuePair[];
  availableTimezones: KeyValuePair[];
}

export interface UpdateCostSegment {
  cost: number;
  costType?: 'costForWholeSegment' | 'costPerEntrance';
  applyToFilteredTraffic?: boolean;
  restrictToCountryCode?: string | null;
  restrictToTrackingFields?: KeyValuePair[];
}

export interface UpdateCostData {
  idFunnel: string;
  idTrafficSource: string;
  currentPeriod: CurrentPeriod;
  costSegments: UpdateCostSegment[];
}

export interface UpdateConversionsEntry {
  idHit?: string;
  transaction?: string | null;
  payout?: number;
}

export interface UpdateConversionsData {
  postbackTriggerType?: 'disabled' | 'onlyNew' | 'all';
  entries?: UpdateConversionsEntry[];
}

export interface RedirectMethod {
  method: '301' | '307' | 'umr' | 'fluxify';
}

export interface SystemSettings {
  forceHTTPS?: boolean;
  defaultHomePageURL?: string;
  autoExpandCampaigns?: boolean;
  autoDisplayOfferSources?: boolean;
  offersDefaultRedirect?: RedirectMethod;
  landersDefaultRedirect?: RedirectMethod;
  minConfidenceRateForWinners?: number;
  clickbankIPNKey?: string;
  funnelfluxApiKey?: string;
}

export interface TrafficSourceInfo {
  id: string;
  name: string;
  defaultCost?: string;
}

export interface SystemLinksTrackingURLOptions {
  idFunnel?: string | null;
  idNode?: string | null;
  idTrafficSource?: string | null;
  defaultCost?: string | null;
}

export interface SystemLinksOptions {
  elements: ('availableCampaignsFunnelsAndNodes' | 'availableTrafficSources' | 'trackingURL' | 'actionURL' | 'postbackURL' | 'conversionIframe' | 'pixelURLAndHTML' | 'clickbankIPN')[];
  trackingURLOptions?: SystemLinksTrackingURLOptions;
}

export interface SystemLinksData {
  availableCampaignsFunnelsAndNodes?: KeyValuePairTreeItem[];
  availableTrafficSources?: TrafficSourceInfo[];
  trackingURL?: string | null;
  actionURL?: string | null;
  postbackURL?: string | null;
  conversionIframe?: string | null;
  pixelURL?: string | null;
  pixelHTML?: string | null;
  clickbankIPNKey?: string | null;
  clickbankIPNURL?: string | null;
}

export interface StoredLink {
  id: string;
  name: string;
  targetURL: string;
  notes?: string;
  tags?: string[];
  visits?: number;
  trackingURL?: string;
}

export interface StoredLinksOptions {
  elements: ('storedLinks' | 'availableCampaignsFunnelsAndNodes' | 'availableTrafficSources')[];
  currentPeriod?: CurrentPeriod;
}

export interface StoredLinksData {
  currentPeriod?: CurrentPeriod;
  storedLinks?: StoredLink[];
  availableCampaignsFunnelsAndNodes?: KeyValuePairTreeItem[];
  availableTrafficSources?: TrafficSourceInfo[];
}

export interface PermissionsStats {
  enabled?: boolean;
  canView?: boolean;
  canEditCustomViews?: boolean;
}

export interface PermissionsBasicView {
  enabled?: boolean;
  canView?: boolean;
}

export interface PermissionsAssetType1 {
  enabled?: boolean;
  canView?: boolean;
  canCreateNew?: boolean;
  canEdit?: boolean;
  canArchive?: boolean;
  canDelete?: boolean;
  restrictTo?: KeyValuePair[];
}

export interface PermissionsAssetType2 {
  enabled?: boolean;
  canView?: boolean;
  canCreateNew?: boolean;
  canEdit?: boolean;
  canArchive?: boolean;
  canDelete?: boolean;
  restrictToAssetIds?: KeyValuePair[];
  restrictToCategoryIds?: KeyValuePair[];
}

export interface PermissionsStoredLinks {
  enabled?: boolean;
  canView?: boolean;
  canCreateNew?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canResetStats?: boolean;
}

export interface PermissionsTrafficFilters {
  enabled?: boolean;
  canView?: boolean;
  canCreateNew?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApplyToPastStats?: boolean;
}

export interface PermissionsDataUpdates {
  enabled?: boolean;
  canUpdateConversions?: boolean;
  canUpdateTrafficCost?: boolean;
  canResetStats?: boolean;
}

export interface PermissionsSystemUpdates {
  enabled?: boolean;
  canView?: boolean;
  canInstallUpdate?: boolean;
}

export interface Permissions {
  stats: PermissionsStats;
  campaigns?: PermissionsAssetType1;
  trafficSources: PermissionsAssetType1;
  offerSources: PermissionsAssetType1;
  offers?: PermissionsAssetType2;
  landers?: PermissionsAssetType2;
  systemLinks: PermissionsBasicView;
  storedLinks: PermissionsStoredLinks;
  trafficFilters: PermissionsTrafficFilters;
  dataUpdates: PermissionsDataUpdates;
  systemUpdates: PermissionsSystemUpdates;
}

export interface UserProfile {
  id: string;
  login: string;
  firstname: string;
  lastname: string;
  email: string;
  avatarURL: string;
  isAdmin: boolean;
  permissions: Permissions;
  enabled: boolean;
}

export interface UserProfileUpdate {
  id: string;
  login: string;
  firstname: string;
  lastname: string;
  email: string;
  avatarURL: string;
  isAdmin: boolean;
  permissions: Permissions;
  enabled: boolean;
  password?: string;
}

export interface UserPasswordChangeRequest {
  oldPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

export interface AdminUserPasswordSetRequest {
  idUser: string;
  newPassword: string;
  oldPassword?: string;
}

export interface UserManagementRow {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  isAdmin: boolean;
  enabled: boolean;
}

export interface UserManagementData {
  rows: UserManagementRow[];
}

export interface InboxMessage {
  id: string;
  from: string;
  title: string;
  body: string;
  timestamp: number;
  alreadyRead: boolean;
}

export interface InboxData {
  rows?: InboxMessage[];
}

export interface InboxNotifications {
  unreadMessages: number;
  newMessage?: InboxMessage;
}

export interface AccessLogRow {
  ip: string;
  country: string;
  timestamp: number;
  login: string;
  event: string;
}

export interface AccessLogData {
  rows: AccessLogRow[];
}

export interface SystemUpdateRow {
  id: string;
  timestamp: number;
  version: string;
  notes: string;
  installed: boolean;
}

export interface SystemUpdateCurrentlyInstalling {
  id: string;
  message: string;
  status: 'installing' | 'installed' | 'failed';
}

export interface SystemUpdatesData {
  rows: SystemUpdateRow[];
  currentlyInstalling?: SystemUpdateCurrentlyInstalling;
}

export interface DrilldownAvailableGrouping {
  groupBy: string;
  availableFilters?: KeyValuePairTreeItem[];
  filtersDependOnOtherGroupBy?: string;
}

export interface DrilldownGroupBy {
  groupBy: string;
  whitelistFilters?: string[];
}

export interface DrilldownView {
  id: string;
  name: string;
  groupings: DrilldownGroupBy[];
  metricColumns?: string[];
}

export interface DrilldownViewSetting {
  by: string;
  id?: string;
}

export interface DrilldownViewSaveRequest {
  idView?: string;
  name: string;
  settings: DrilldownViewSetting[];
  columns?: boolean[];
}

export interface DrilldownViewSaveResponse {
  idView?: string;
}

export interface ReportPaging {
  start?: number;
  length?: number;
}

export interface ReportSorting {
  sortingColumns?: SortingColumn[];
}

export interface DrilldownOptions {
  elements: ('currentPeriod' | 'availableTimezones' | 'availableCampaignsAndFunnels' | 'availableGroupings' | 'availableViews' | 'report')[];
  groupBys?: DrilldownGroupBy[];
  currentPeriod?: CurrentPeriod;
  flattened?: boolean;
  paging?: ReportPaging;
  sorting?: ReportSorting;
  showNA?: boolean;
  showFilteredTraffic?: boolean;
  idCampaignFilter?: string | null;
  idFunnelFilter?: string | null;
  idTrafficSourceFilter?: string | null;
}

export interface DrilldownData {
  currentPeriod?: CurrentPeriod;
  availableTimezones?: KeyValuePair[];
  availableCampaignsAndFunnels?: KeyValuePairTreeItem[];
  availableGroupings?: DrilldownAvailableGrouping[];
  availableViews?: DrilldownView[];
  report?: Report;
}

export interface QuickStatsOptions {
  idCampaign: string;
  statsType: 'historical-perf' | 'week-parting' | 'day-parting' | 'traffic-sources' | 'funnels' | 'landers' | 'offers' | 'conversion-paths' | 'device-type' | 'device-name' | 'device-os' | 'device-os-version' | 'device-os-browser' | 'device-browser' | 'connectivity-isp' | 'connectivity-carrier' | 'connectivity-ip' | 'referrer' | 'tracking-fields' | 'country' | 'country-city' | 'country-region' | 'country-region-city' | 'language';
  statsTypeFilter?: string | null;
  idTrafficSourceFilter?: string | null;
  idFunnelFilter?: string | null;
  currentPeriod?: CurrentPeriod;
}

export interface QuickStatsData {
  options: QuickStatsOptions;
  availableCampaignsAndFunnels: KeyValuePairTreeItem[];
  trafficSourcesIdsAndNames: KeyValuePair[];
  availableTrackingFields: DrilldownAvailableGrouping;
  report: Report;
}

export interface OffersOptions {
  currentPeriod: CurrentPeriod;
}

export interface OffersData {
  options: OffersOptions;
  report: Report;
}

export interface LandersOptions {
  currentPeriod: CurrentPeriod;
}

export interface LandersData {
  options: LandersOptions;
  report: Report;
}

export interface OfferSourcesOptions {
  currentPeriod: CurrentPeriod;
}

export interface OfferSourcesData {
  options: OfferSourcesOptions;
  report: Report;
}

export interface TrafficSourcesOptions {
  currentPeriod: CurrentPeriod;
}

export interface TrafficSourcesData {
  options: TrafficSourcesOptions;
  report: Report;
}

export interface CampaignsOptions {
  currentPeriod: CurrentPeriod;
  expanded: boolean;
}

export interface CampaignsData {
  options: CampaignsOptions;
  report: Report;
}

export interface CampaignHierarchyItem {
  id: string;
  name: string;
}

export interface CampaignHierarchyCampaign {
  id: string;
  name: string;
  funnels?: CampaignHierarchyItem[];
}

export interface CampaignHierarchyResponse {
  campaigns?: CampaignHierarchyCampaign[];
}

export interface DashboardElements {
  elements: ('currentPeriod' | 'availableTimezones' | 'liveStats' | 'chart' | 'tableStats')[];
}

export interface DashboardData {
  currentPeriod?: CurrentPeriod;
  availableTimezones?: KeyValuePair[];
  liveStats?: LiveStats;
  chart?: Chart;
  tableStats?: TableStats;
}

export interface LiveStats {
  visits?: number;
  clicks?: number;
  conversions?: number;
  revenue?: number;
  cost?: number;
  net?: number;
  roi?: string;
}

export interface ChartOptions {
  visitsEnabled?: boolean;
  clicksEnabled?: boolean;
  conversionsEnabled?: boolean;
  revenueEnabled?: boolean;
  costEnabled?: boolean;
  roiEnabled?: boolean;
  cycle?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  logarithmic?: boolean;
}

export interface Chart {
  options: ChartOptions;
  dates: string[];
  datesFormatted: string[];
  visits: number[];
  clicks: number[];
  conversions: number[];
  revenue: number[];
  revenueFormatted: string[];
  cost: number[];
  costFormatted: string[];
  roi: number[];
  roiFormatted: string[];
}

export interface TableStatsOptions {
  statsType: 'trafficSources' | 'campaigns' | 'offers' | 'landers';
}

export interface TableStats {
  options?: TableStatsOptions;
  report?: Report;
}

export interface CurrentPeriod {
  timeRange?: ApiDateTimeRange;
  timeZone?: ApiTimeZone;
}

export interface MiscElements {
  elements: ('pageCategories' | 'campaignsAndFunnels' | 'trafficSources' | 'trafficSourcesAndTrackingFields' | 'offerSources' | 'urlTokens')[];
}

export interface MiscData {
  pageCategories?: KeyValuePair[];
  campaignsAndFunnels?: KeyValuePairTreeItem[];
  trafficSources?: TrafficSourceInfo[];
  trafficSourcesAndTrackingFields?: KeyValuePairTreeItem[];
  offerSources?: KeyValuePair[];
  urlTokens?: string[];
}

export interface BulkIDs {
  ids: string[];
}

export interface SessionInfo {
  authenticated: boolean;
  userId: string;
  username: string;
  isAdmin: boolean;
  license: LicenseDecision;
}

export interface LicenseStatusResponse {
  license: LicenseDecision;
}

export interface LicenseRevalidationResponse {
  revalidated: boolean;
  license: LicenseDecision;
}

export interface LicenseDecision {
  state: 'allowed' | 'allowed_grace' | 'locked' | 'wrong_domain' | 'verification_unavailable';
  reasonCode: string;
  nextCheckAt: string;
  graceUntil?: string;
  canRevalidate: boolean;
}

export interface LicenseLockedError {
  code?: number;
  message?: string;
  errorCode: 'LICENSE_LOCKED';
  license?: LicenseDecision;
}

export interface NotificationCheck {
  unreadCount?: number;
  forcePopup?: boolean;
  forcePopupMessage?: string;
  notification?: Record<string, unknown>;
}

export interface AccessRight {
  id?: string;
  name?: string;
  granted?: boolean;
}
