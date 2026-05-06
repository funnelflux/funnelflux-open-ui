import type { DrilldownRequest } from '@/types/stats'
import { stableStringify } from '@/lib/stableJson'

export const queryKeys = {
  campaigns: {
    all: ['campaigns'] as const,
    list: (params?: Record<string, string>) => [...queryKeys.campaigns.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.campaigns.all, 'detail', id] as const,
  },
  funnels: {
    all: ['funnels'] as const,
    list: (campaignId?: string) => [...queryKeys.funnels.all, 'list', campaignId] as const,
    detail: (id: string) => [...queryKeys.funnels.all, 'detail', id] as const,
  },
  pages: {
    all: ['pages'] as const,
    list: (params?: Record<string, string>) => [...queryKeys.pages.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.pages.all, 'detail', id] as const,
  },
  trafficSources: {
    all: ['trafficSources'] as const,
    list: (params?: Record<string, string>) => [...queryKeys.trafficSources.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.trafficSources.all, 'detail', id] as const,
    categories: ['trafficSources', 'categories'] as const,
    templates: ['trafficSources', 'templates'] as const,
  },
  offerSources: {
    all: ['offerSources'] as const,
    list: (params?: Record<string, string>) => [...queryKeys.offerSources.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.offerSources.all, 'detail', id] as const,
    templates: ['offerSources', 'templates'] as const,
  },
  tags: {
    all: ['tags'] as const,
    list: () => [...queryKeys.tags.all, 'list'] as const,
  },
  trafficFilters: {
    all: ['trafficFilters'] as const,
    list: (params?: Record<string, string>) => [...queryKeys.trafficFilters.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.trafficFilters.all, 'detail', id] as const,
  },
  drilldown: {
    all: ['drilldown'] as const,
    groupings: ['drilldown', 'groupings'] as const,
    /** Full drilldown POST body as cache identity (see {@link stableStringify}). */
    report: (request: DrilldownRequest) =>
      [...queryKeys.drilldown.all, 'report', stableStringify(request)] as const,
    flatAllReport: (request: DrilldownRequest) =>
      [...queryKeys.drilldown.all, 'flatAll', stableStringify(request)] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  systemSettings: {
    all: ['systemSettings'] as const,
  },
  domains: {
    all: ['domains'] as const,
    list: () => [...queryKeys.domains.all, 'list'] as const,
  },
  inbox: {
    all: ['inbox'] as const,
    list: () => [...queryKeys.inbox.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.inbox.all, 'detail', id] as const,
    notifications: ['inbox', 'notifications'] as const,
  },
  storedLinks: {
    all: ['storedLinks'] as const,
    list: () => [...queryKeys.storedLinks.all, 'list'] as const,
  },
  systemLinks: {
    all: ['systemLinks'] as const,
  },
  userManagement: {
    all: ['userManagement'] as const,
    list: () => [...queryKeys.userManagement.all, 'list'] as const,
  },
  accessLog: {
    all: ['accessLog'] as const,
  },
  conditions: {
    all: ['conditions'] as const,
    list: () => [...queryKeys.conditions.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.conditions.all, 'detail', id] as const,
  },
  codeSnippets: {
    all: ['codeSnippets'] as const,
    list: (type?: string) => [...queryKeys.codeSnippets.all, 'list', type] as const,
    detail: (id: string) => [...queryKeys.codeSnippets.all, 'detail', id] as const,
  },
  savedViews: {
    all: ['savedViews'] as const,
    list: () => [...queryKeys.savedViews.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.savedViews.all, 'detail', id] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: (entityType?: string) => [...queryKeys.categories.all, 'list', entityType] as const,
  },
  dataUpdates: {
    all: ['dataUpdates'] as const,
    updateCostPage: () => [...queryKeys.dataUpdates.all, 'updateCostPage'] as const,
    resetStatsPage: () => [...queryKeys.dataUpdates.all, 'resetStatsPage'] as const,
  },
  groupingFilterAssets: {
    all: ['groupingFilterAssets'] as const,
    campaignsSimple: () => [...queryKeys.groupingFilterAssets.all, 'campaigns', 'simple'] as const,
    funnelsPrefixed: () => [...queryKeys.groupingFilterAssets.all, 'funnels', 'prefixed'] as const,
    pageList: (pageType: 'lander' | 'offer') =>
      [...queryKeys.groupingFilterAssets.all, 'pages', pageType] as const,
    pageCategories: () => [...queryKeys.groupingFilterAssets.all, 'pageCategories'] as const,
    trafficSourcesList: () => [...queryKeys.groupingFilterAssets.all, 'trafficSources', 'list'] as const,
    offerSourcesAllStatuses: () =>
      [...queryKeys.groupingFilterAssets.all, 'offerSources', 'allStatuses'] as const,
  },
}
