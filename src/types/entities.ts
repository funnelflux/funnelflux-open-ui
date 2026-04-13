// Re-export generated types from the OpenAPI spec
import type { Page as GeneratedPage } from './generated/data';

export type {
  Campaign,
  Funnel,
  FunnelNode,
  FunnelConnection,
  FunnelNodePageParams,
  FunnelNodeRotatorParams,
  FunnelNodeExternalUrlParams,
  FunnelNodeCodeSnippetParams,
  FunnelNodeConditionParams,
  FunnelNodeVisitorTagParams,
  FunnelConnectionRotatorParams,
  FunnelConnectionPageParams,
  FunnelConnectionCodeParams,
  FunnelConnectionConditionParams,
  FunnelCondition,
  FunnelConditionTest,
  FunnelConditionTestsBlock,
  FunnelCodeSnippet,
  OfferParams,
  FluxifyParams,
  FluxifyLinkRewriterParams,
  FluxifyContentRewriterParams,
  FluxifyReferrerAndUASpooferParams,
  TrafficSource,
  Postback,
  OfferSource,
  TrafficFilter,
  KeyValuePair,
  KeyValuePairTreeItem,
  Category,
  PageCategoryAssignment,
  TrafficSourceCategoryAssignment,
  ArchiveRequest,
  BulkIds,
  BulkResult,
  IdNamePair,
  TagCreateRequest,
  TagUpdateRequest,
  FunnelMoveRequest,
  TrafficFilterApplyRequest,
  ApiDate,
  ApiTime,
  CampaignsFunnelsAndNodes,
  CodeSnippetTemplateList,
} from './generated/data';

// Page type extended with fields present at runtime but not yet in the YAML spec
export type Page = GeneratedPage & {
  categoryId?: string;
  numberOfActions?: number;
};

// Type aliases extracted from inline unions in the generated Page definition
export type PageType = 'lander' | 'offer';
export type RedirectType = '301' | '307' | 'umr' | 'fluxify';

// Type aliases extracted from inline unions in the generated TrafficSource definition
export type CostType = 'cpe' | 'cpa';
export type PostbackType = 'none' | 'postbackUrl' | 'pixelUrl' | 'javascript';

// Type alias extracted from the generated TrafficFilter definition
export type FilterType =
  | 'ipAddresses'
  | 'ipRanges'
  | 'referrers'
  | 'userAgents'
  | 'ISPs'
  | 'countries'
  | 'knownBotsAndSpiders';

// App-only types not present in the OpenAPI spec
export interface Tag {
  id: string;
  name: string;
}

export interface IdName {
  id: string;
  name: string;
}
