// Auto-generated from api-specs/data-api.yaml -- do not edit manually

export interface TrafficFilter {
  idTrafficFilter: string;
  trafficFilterName: string;
  filterType: 'ipAddresses' | 'ipRanges' | 'referrers' | 'userAgents' | 'ISPs' | 'countries' | 'knownBotsAndSpiders';
  filterEntries?: string[];
  redirectToURL?: string | null;
  isEnabled?: boolean;
}

export interface OfferSource {
  idOfferSource: string;
  offerSourceName: string;
  subId?: string;
  querySeparator?: string;
  postbackSubId?: string;
  postbackTxId?: string;
  postbackPayout?: string;
  isArchived?: boolean;
}

export interface OfferSourceSaveRequest {
  idOfferSource: string;
  offerSourceName: string;
  subId?: string;
  querySeparator?: string;
  postbackSubId?: string;
  postbackTxId?: string;
  postbackPayout?: string;
  isArchived?: boolean;
}

export interface TrafficSource {
  idTrafficSource: string;
  trafficSourceName: string;
  costType: 'cpe' | 'cpa';
  defaultCost?: string;
  trackingFields?: KeyValuePair[];
  postback?: Postback;
  categoryName?: string;
  isArchived?: boolean;
}

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface KeyValuePairTreeItem {
  item: KeyValuePair;
  children?: KeyValuePairTreeItem[];
}

export interface Postback {
  idTrafficSource: string;
  postbackType: 'none' | 'postbackUrl' | 'pixelUrl' | 'javascript';
  postbackCode: string;
}

export interface FunnelNodeRotatorParams {
  rotatorType?: 'random' | 'Session';
}

export interface FunnelNodePageParams {
  idPage: string;
  accumulateUrlParams?: boolean;
  additionalTokens?: KeyValuePair[];
}

export interface FunnelNodeExternalUrlParams {
  url: string;
}

export interface FunnelNodeCodeSnippetParams {
  idCode: string;
}

export interface FunnelNodeConditionParams {
  idCondition: string;
}

export interface FunnelNodeVisitorTagParams {
  tags?: string[];
}

export interface FunnelNode {
  idNode: string;
  idFunnel: string;
  nodeName: string;
  nodeType: 'root' | 'rotator' | 'lander' | 'offer' | 'externalUrl' | 'jsCode' | 'phpCode' | 'condition' | 'visitorTag';
  nodeRotatorParams?: FunnelNodeRotatorParams;
  nodePageParams?: FunnelNodePageParams;
  nodeExternalUrlParams?: FunnelNodeExternalUrlParams;
  nodeCodeParams?: FunnelNodeCodeSnippetParams;
  nodeConditionParams?: FunnelNodeConditionParams;
  nodeVisitorTagParams?: FunnelNodeVisitorTagParams;
  posX?: number;
  posY?: number;
  isArchived?: boolean;
}

export interface FunnelConnectionRotatorParams {
  weight?: number;
}

export interface FunnelConnectionPageParams {
  onActionNumber: number;
  isConversion?: boolean;
}

export interface FunnelConnectionCodeParams {
  onDoneNumber: number;
}

export interface FunnelConnectionConditionParams {
  condition: 'ifYes' | 'ifNo';
}

export interface FunnelConnection {
  idConnection: string;
  idFunnel: string;
  idSourceNode: string;
  idTargetNode: string;
  connectionRotatorParams?: FunnelConnectionRotatorParams;
  connectionPageParams?: FunnelConnectionPageParams;
  connectionCodeParams?: FunnelConnectionCodeParams;
  connectionConditionParams?: FunnelConnectionConditionParams;
  labelLocation?: number;
}

export interface FunnelConditionTestGenericParams {
  values: string[];
}

export interface FunnelConditionTestTimeDateParams {
  date: ApiDate;
}

export interface FunnelConditionTestTimeOfDayParams {
  time: ApiTime;
}

export interface FunnelConditionTestTimeDayOfWeekParams {
  day: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
}

export interface FunnelConditionTestTimeDayOfMonthParams {
  day: number;
}

export interface FunnelConditionTestTimeMonthOfYearParams {
  month: 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october' | 'november' | 'december';
}

export interface FunnelConditionTestVisitorConversionParams {
  idOffer: string;
  conversionsCount: string;
}

export interface FunnelConditionTestOfferConversionParams {
  idOffer: string;
  conversionsCount: string;
  lastXDays: number;
}

export interface FunnelConditionTestTrackingFieldParams {
  trackingField: string;
  values: string[];
}

export interface FunnelConditionTest {
  test: 'Location: Continent' | 'Location: Country' | 'Location: City' | 'Location: Region' | 'Location: Timezone' | 'Device: Type' | 'Device: Brand' | 'Device: Model' | 'Device: OS' | 'Device: OS Version' | 'Device: Browser' | 'Device: Browser Language' | 'Device: Browser Version' | 'Connection: IP' | 'Connection: ISP' | 'Connection: User Agent' | 'Connection: Referrer' | 'Connection: Current URL' | 'Conversion Cap: Current Visitor' | 'Conversion Cap: Globally on Offer' | 'Time: Date' | 'Time: Day of Week' | 'Time: Day of Month' | 'Time: Month of Year' | 'Time: Time of Day' | 'Quantity: Number of Visitors' | 'Quantity: Number of Visitors Today' | 'Traffic Source' | 'Tracking Field';
  operator: 'IS' | 'IS NOT' | '>' | '>=' | '<' | '<=';
  testAgainstGenericParams?: FunnelConditionTestGenericParams;
  testAgainstTimeDateParams?: FunnelConditionTestTimeDateParams;
  testAgainstTimeOfDayParams?: FunnelConditionTestTimeOfDayParams;
  testAgainstTimeDayOfWeekParams?: FunnelConditionTestTimeDayOfWeekParams;
  testAgainstTimeDayOfMonthParams?: FunnelConditionTestTimeDayOfMonthParams;
  testAgainstTimeMonthOfYearParams?: FunnelConditionTestTimeMonthOfYearParams;
  testAgainstVisitorConversionParams?: FunnelConditionTestVisitorConversionParams;
  testAgainstOfferConversionParams?: FunnelConditionTestOfferConversionParams;
  testAgainstTrackingFieldParams?: FunnelConditionTestTrackingFieldParams;
}

export interface FunnelConditionTestsBlock {
  andTests: FunnelConditionTest[];
}

export interface FunnelCondition {
  idCondition: string;
  conditionName: string;
  orTests: FunnelConditionTestsBlock[];
  restrictToFunnelId?: string;
}

export interface FunnelCodeSnippetJavascriptParams {
  delay: number;
}

export interface FunnelCodeSnippet {
  idCode: string;
  codeName: string;
  codeType: 'javascript' | 'php';
  codeContent: string;
  codeJavascriptParams?: FunnelCodeSnippetJavascriptParams;
}

export interface Funnel {
  idFunnel: string;
  idCampaign: string;
  funnelName: string;
  defaultCostPerEntrance?: string;
  canvasWidth: number;
  canvasHeight: number;
  acculumatedUrlParams?: KeyValuePair[];
  customTokens?: KeyValuePair[];
  incomingTrafficCostOverrides?: KeyValuePair[];
  postbackOverrides?: Postback[];
  nodes?: FunnelNode[];
  connections?: FunnelConnection[];
  isArchived?: boolean;
}

export interface Campaign {
  idCampaign: string;
  campaignName: string;
  acculumatedUrlParams?: KeyValuePair[];
  customTokens?: KeyValuePair[];
  isArchived?: boolean;
}

export interface FluxifyLinkRewriterParams {
  map?: KeyValuePair[];
}

export interface FluxifyContentRewriterParams {
  map?: KeyValuePair[];
  headerCode?: string;
  footerCode?: string;
}

export interface FluxifyReferrerAndUASpooferParams {
  referrers?: string[];
  userAgents?: string[];
}

export interface FluxifyParams {
  enableCache?: boolean;
  enableDirectTrafficProtection?: boolean;
  enableLinkRewriter?: boolean;
  enableContentRewriter?: boolean;
  enableVideoAutoPlayBreaker?: boolean;
  enableExitPopupBreaker?: boolean;
  enableAnalyticsBreaker?: boolean;
  enableReferrerAndUASpoofer?: boolean;
  linkRewriterParams?: FluxifyLinkRewriterParams;
  contentRewriterParams?: FluxifyContentRewriterParams;
  referrerAndUASpooferParams?: FluxifyReferrerAndUASpooferParams;
}

export interface OfferParams {
  idOfferSource: string;
  payout?: number;
  payoutType?: 'perConversion' | 'revShare';
}

export interface CampaignsFunnelsAndNodes {
  items?: KeyValuePairTreeItem[];
}

export interface Page {
  idPage: string;
  pageType: 'lander' | 'offer';
  pageName: string;
  url: string;
  redirectType?: '301' | '307' | 'umr' | 'fluxify';
  tags?: string[];
  notes?: string;
  customFields?: string;
  offerParams?: OfferParams;
  fluxifyParams?: FluxifyParams;
  isArchived?: boolean;
}

export interface PageSummary {
  idPage: string;
  pageName: string;
  categoryId: string;
  url?: string;
  payout?: number;
}

export interface ApiDate {
  year: number;
  month: number;
  day: number;
}

export interface ApiTime {
  hour: number;
  minutes: number;
}

export interface IdNamePair {
  id?: string;
  name?: string;
  isArchived?: boolean;
  status?: 'active' | 'archived';
  categoryId?: string;
  categoryName?: string;
  pageType?: 'lander' | 'offer';
  idCampaign?: string;
  campaignName?: string;
  defaultCostPerEntrance?: number;
  costType?: string;
}

export interface BulkIds {
  ids: string[];
}

export interface ArchiveRequest {
  ids: string[];
  archive?: boolean;
}

export interface BulkResult {
  success?: boolean;
  processed?: number;
  errors?: string[];
}

export interface Category {
  idCategory?: string;
  name?: string;
}

export interface PageCategoryAssignment {
  pageIds: string[];
  idCategory?: string;
}

export interface TrafficSourceCategoryAssignment {
  trafficSourceIds: string[];
  idCategory?: string;
}

export interface FunnelMoveRequest {
  idFunnel: string;
  idCampaign: string;
}

export interface TagCreateRequest {
  tags?: string[];
}

export interface TagUpdateRequest {
  idTag: string;
  name: string;
}

export interface TrafficFilterApplyRequest {
  idFilter: string;
  apply?: boolean;
}

export interface CodeSnippetTemplateList {
  php?: string[];
  javascript?: string[];
}

export interface ApiErrorResponse {
  code: number;
  message: string;
}
