import type { ComponentType, LazyExoticComponent } from 'react'
import type { UserProfile } from '@/types/api'
import type { IconName } from '@/components/ui-kit'
import { canViewDashboard, isAdminUser } from '@/lib/routeAccess'
import { lazyNamed } from '@/lib/routeLazy'

/**
 * Any authenticated session may open these routes; they are not gated on a specific
 * `permissions.*` flag (legacy admin exposed them without checks).
 * The `user` argument is required for a consistent `(user: UserProfile) => boolean` signature.
 */
export function canAccessAuthenticatedOnly(user: UserProfile): boolean {
  return Boolean(user)
}

export type NavGroup = 'main' | 'settings' | 'user'

export type NavSectionMeta = {
  id: string
  label: string
  /** Prefix for active-state matching (first child or canonical path). */
  basePath: string
  order: number
}

export type RouteNavMeta = {
  group: NavGroup
  label: string
  order: number
  icon?: IconName
  /** When set, grouped with other entries sharing `section.id` (dropdown). */
  section?: NavSectionMeta
  /**
   * When set on sectioned items, the parent dropdown is omitted unless this passes
   * (e.g. Updates menu requires `dataUpdates.enabled`).
   */
  sectionVisible?: (user: UserProfile) => boolean
}

export type RouteEntry = {
  /** Path segment relative to the layout parent (`""` = index). */
  path: string
  index?: boolean
  Component: LazyExoticComponent<ComponentType>
  permission: (user: UserProfile) => boolean
  nav?: RouteNavMeta
  /** Higher = preferred default landing path (see `getDefaultAuthorizedPath`). */
  defaultRoutePriority?: number
  layout: 'app' | 'public'
}

const DashboardPage = lazyNamed(() => import('@/pages/DashboardPage'), 'DashboardPage')
const CampaignsPage = lazyNamed(() => import('@/pages/campaigns/CampaignsPage'), 'CampaignsPage')
const TrafficSourcesPage = lazyNamed(
  () => import('@/pages/traffic-sources/TrafficSourcesPage'),
  'TrafficSourcesPage',
)
const OfferSourcesPage = lazyNamed(
  () => import('@/pages/offer-sources/OfferSourcesPage'),
  'OfferSourcesPage',
)
const LandersPage = lazyNamed(() => import('@/pages/landers/LandersPage'), 'LandersPage')
const OffersPage = lazyNamed(() => import('@/pages/offers/OffersPage'), 'OffersPage')
const FunnelEditorPage = lazyNamed(
  () => import('@/pages/funnels/FunnelEditorPage'),
  'FunnelEditorPage',
)
const FunnelBuilderLegacyRedirect = lazyNamed(
  () => import('@/pages/funnels/FunnelBuilderLegacyRedirect'),
  'FunnelBuilderLegacyRedirect',
)
const DrilldownTreePage = lazyNamed(
  () => import('@/pages/reports/DrilldownTreePage'),
  'DrilldownTreePage',
)
const DrilldownFlatPage = lazyNamed(
  () => import('@/pages/reports/DrilldownFlatPage'),
  'DrilldownFlatPage',
)
const QuickViewPage = lazyNamed(() => import('@/pages/quickview/QuickViewPage'), 'QuickViewPage')
const SystemLinksPage = lazyNamed(() => import('@/pages/links/SystemLinksPage'), 'SystemLinksPage')
const StoredLinksPage = lazyNamed(() => import('@/pages/links/StoredLinksPage'), 'StoredLinksPage')
const TagsPage = lazyNamed(() => import('@/pages/settings/TagsPage'), 'TagsPage')
const TrafficFiltersPage = lazyNamed(
  () => import('@/pages/settings/TrafficFiltersPage'),
  'TrafficFiltersPage',
)
const SystemSettingsPage = lazyNamed(
  () => import('@/pages/settings/SystemSettingsPage'),
  'SystemSettingsPage',
)
const UserManagementPage = lazyNamed(
  () => import('@/pages/settings/UserManagementPage'),
  'UserManagementPage',
)
const UserEditPage = lazyNamed(() => import('@/pages/settings/UserEditPage'), 'UserEditPage')
const AccessLogPage = lazyNamed(() => import('@/pages/settings/AccessLogPage'), 'AccessLogPage')
const GlobalConditionsPage = lazyNamed(
  () => import('@/pages/settings/GlobalConditionsPage'),
  'GlobalConditionsPage',
)
const InboxPage = lazyNamed(() => import('@/pages/inbox/InboxPage'), 'InboxPage')
const ConversionsPage = lazyNamed(
  () => import('@/pages/data-updates/ConversionsPage'),
  'ConversionsPage',
)
const CostUpdatePage = lazyNamed(
  () => import('@/pages/data-updates/CostUpdatePage'),
  'CostUpdatePage',
)
const ResetStatsPage = lazyNamed(
  () => import('@/pages/data-updates/ResetStatsPage'),
  'ResetStatsPage',
)
const DesignSystemPage = lazyNamed(
  () => import('@/pages/design-system/DesignSystemPage'),
  'DesignSystemPage',
)

/**
 * Single source of truth for app routes: path, lazy component, permission, optional nav,
 * and default landing priority.
 */
export const ROUTE_ENTRIES: readonly RouteEntry[] = [
  {
    path: '',
    index: true,
    Component: DashboardPage,
    permission: (u) => canViewDashboard(u.permissions),
    nav: {
      group: 'main',
      label: 'Dashboard',
      order: 0,
    },
    defaultRoutePriority: 100,
    layout: 'app',
  },
  {
    path: 'campaigns',
    Component: CampaignsPage,
    permission: (u) => u.permissions.campaigns.canView,
    nav: { group: 'main', label: 'Campaigns', order: 1 },
    defaultRoutePriority: 90,
    layout: 'app',
  },
  {
    path: 'campaigns/:campaignId/funnels/:funnelId',
    Component: FunnelEditorPage,
    permission: (u) => u.permissions.campaigns.canEdit,
    layout: 'app',
  },
  {
    path: 'funnel-builder/:id',
    Component: FunnelBuilderLegacyRedirect,
    permission: (u) => u.permissions.campaigns.canEdit,
    layout: 'app',
  },
  {
    path: 'reports/tree',
    Component: DrilldownTreePage,
    permission: (u) => u.permissions.stats.canView,
    nav: {
      group: 'main',
      label: 'Drilldown (Tree)',
      order: 0,
      section: {
        id: 'stats',
        label: 'Stats',
        basePath: '/reports',
        order: 5,
      },
    },
    layout: 'app',
  },
  {
    path: 'reports/flat',
    Component: DrilldownFlatPage,
    permission: (u) => u.permissions.stats.canView,
    nav: {
      group: 'main',
      label: 'Drilldown (Flat)',
      order: 1,
      section: {
        id: 'stats',
        label: 'Stats',
        basePath: '/reports',
        order: 5,
      },
    },
    layout: 'app',
  },
  {
    path: 'quickview',
    Component: QuickViewPage,
    permission: (u) => u.permissions.stats.canView,
    layout: 'app',
  },
  {
    path: 'traffic-sources',
    Component: TrafficSourcesPage,
    permission: (u) => u.permissions.trafficSources.canView,
    nav: {
      group: 'main',
      label: 'Traffic Sources',
      order: 0,
      section: {
        id: 'sources',
        label: 'Sources',
        basePath: '/traffic-sources',
        order: 3,
      },
    },
    defaultRoutePriority: 80,
    layout: 'app',
  },
  {
    path: 'offer-sources',
    Component: OfferSourcesPage,
    permission: (u) => u.permissions.offerSources.canView,
    nav: {
      group: 'main',
      label: 'Offer Sources',
      order: 1,
      section: {
        id: 'sources',
        label: 'Sources',
        basePath: '/traffic-sources',
        order: 3,
      },
    },
    defaultRoutePriority: 79,
    layout: 'app',
  },
  {
    path: 'offers',
    Component: OffersPage,
    permission: (u) => u.permissions.offers.canView,
    nav: { group: 'main', label: 'Offers', order: 4 },
    defaultRoutePriority: 70,
    layout: 'app',
  },
  {
    path: 'landers',
    Component: LandersPage,
    permission: (u) => u.permissions.landers.canView,
    nav: { group: 'main', label: 'Landers', order: 5 },
    defaultRoutePriority: 60,
    layout: 'app',
  },
  {
    path: 'links/generate',
    Component: SystemLinksPage,
    permission: (u) => u.permissions.systemLinks.canView,
    nav: {
      group: 'main',
      label: 'System Links',
      order: 0,
      section: {
        id: 'links',
        label: 'Links',
        basePath: '/links',
        order: 8,
      },
    },
    defaultRoutePriority: 50,
    layout: 'app',
  },
  {
    path: 'links/stored',
    Component: StoredLinksPage,
    permission: (u) => u.permissions.storedLinks.canView,
    nav: {
      group: 'main',
      label: 'Stored Links',
      order: 1,
      section: {
        id: 'links',
        label: 'Links',
        basePath: '/links',
        order: 8,
      },
    },
    defaultRoutePriority: 49,
    layout: 'app',
  },
  {
    path: 'settings/system',
    Component: SystemSettingsPage,
    permission: (u) => isAdminUser(u),
    nav: {
      group: 'settings',
      label: 'System Settings',
      order: 0,
      icon: 'bar-chart-3',
    },
    defaultRoutePriority: 20,
    layout: 'app',
  },
  {
    path: 'settings/traffic-filters',
    Component: TrafficFiltersPage,
    permission: (u) => u.permissions.trafficFilters.canView,
    nav: {
      group: 'settings',
      label: 'Traffic Filters',
      order: 1,
      icon: 'filter',
    },
    defaultRoutePriority: 30,
    layout: 'app',
  },
  {
    path: 'settings/tags',
    Component: TagsPage,
    permission: canAccessAuthenticatedOnly,
    nav: {
      group: 'settings',
      label: 'Visitor Tags',
      order: 2,
      icon: 'tag',
    },
    layout: 'app',
  },
  {
    path: 'settings/conditions',
    Component: GlobalConditionsPage,
    permission: canAccessAuthenticatedOnly,
    nav: {
      group: 'settings',
      label: 'Global Conditions',
      order: 3,
      icon: 'shield',
    },
    layout: 'app',
  },
  {
    path: 'settings/access-log',
    Component: AccessLogPage,
    permission: (u) => isAdminUser(u),
    nav: {
      group: 'settings',
      label: 'Access Log',
      order: 10,
      icon: 'history',
    },
    layout: 'app',
  },
  {
    path: 'settings/users',
    Component: UserManagementPage,
    permission: (u) => isAdminUser(u),
    nav: {
      group: 'settings',
      label: 'User Management',
      order: 11,
      icon: 'users',
    },
    layout: 'app',
  },
  {
    path: 'settings/users/new',
    Component: UserEditPage,
    permission: (u) => isAdminUser(u),
    layout: 'app',
  },
  {
    path: 'settings/users/:userId/edit',
    Component: UserEditPage,
    permission: (u) => isAdminUser(u),
    layout: 'app',
  },
  {
    path: 'data-updates/conversions',
    Component: ConversionsPage,
    permission: (u) => Boolean(u.permissions.dataUpdates.canUpdateConversions),
    nav: {
      group: 'main',
      label: 'Conversion Updates',
      order: 0,
      section: {
        id: 'updates',
        label: 'Updates',
        basePath: '/data-updates',
        order: 7,
      },
      sectionVisible: (u) => Boolean(u.permissions.dataUpdates.enabled),
    },
    defaultRoutePriority: 40,
    layout: 'app',
  },
  {
    path: 'data-updates/costs',
    Component: CostUpdatePage,
    permission: (u) => Boolean(u.permissions.dataUpdates.canUpdateTrafficCost),
    nav: {
      group: 'main',
      label: 'Cost Updates',
      order: 1,
      section: {
        id: 'updates',
        label: 'Updates',
        basePath: '/data-updates',
        order: 7,
      },
      sectionVisible: (u) => Boolean(u.permissions.dataUpdates.enabled),
    },
    defaultRoutePriority: 39,
    layout: 'app',
  },
  {
    path: 'data-updates/reset',
    Component: ResetStatsPage,
    permission: (u) => Boolean(u.permissions.dataUpdates.canResetStats),
    nav: {
      group: 'main',
      label: 'Reset Stats',
      order: 2,
      section: {
        id: 'updates',
        label: 'Updates',
        basePath: '/data-updates',
        order: 7,
      },
      sectionVisible: (u) => Boolean(u.permissions.dataUpdates.enabled),
    },
    defaultRoutePriority: 38,
    layout: 'app',
  },
  {
    path: 'inbox',
    Component: InboxPage,
    permission: canAccessAuthenticatedOnly,
    nav: {
      group: 'user',
      label: 'Inbox',
      order: 0,
      icon: 'inbox',
    },
    defaultRoutePriority: 1,
    layout: 'app',
  },
  {
    path: 'design-system',
    Component: DesignSystemPage,
    permission: () => true,
    layout: 'public',
  },
]

export function entryPathToHref(path: string): string {
  return path === '' ? '/' : `/${path.replace(/^\/+/, '')}`
}

function isEligibleDefaultLandingEntry(entry: RouteEntry): boolean {
  if (entry.layout !== 'app') return false
  if (entry.defaultRoutePriority == null) return false
  if (entry.path.includes(':')) return false
  return true
}

/**
 * Highest `defaultRoutePriority` among routes the user may access; aligns with legacy
 * `getDefaultAuthorizedPath` ordering.
 */
export function getDefaultAuthorizedPath(
  user: UserProfile | null | undefined,
): string {
  if (!user?.permissions) return '/'

  const candidates = ROUTE_ENTRIES.filter(
    (e) => isEligibleDefaultLandingEntry(e) && e.permission(user),
  )
  if (candidates.length === 0) return '/inbox'

  candidates.sort(
    (a, b) => (b.defaultRoutePriority ?? 0) - (a.defaultRoutePriority ?? 0),
  )
  return entryPathToHref(candidates[0].path)
}

export type NavLinkItem = {
  label: string
  to: string
  icon?: IconName
}

export type MainNavTopItem =
  | { kind: 'link'; to: string; label: string; order: number }
  | {
      kind: 'menu'
      section: NavSectionMeta
      children: NavLinkItem[]
    }

function navEntryVisible(user: UserProfile, e: RouteEntry): boolean {
  if (!e.nav) return false
  if (!e.permission(user)) return false
  if (e.nav.section && e.nav.sectionVisible && !e.nav.sectionVisible(user)) return false
  return true
}

/** Build main navbar structure from the registry for a user. */
export function getMainNavStructure(user: UserProfile): MainNavTopItem[] {
  const mainEntries = ROUTE_ENTRIES.filter(
    (e) => e.layout === 'app' && e.nav?.group === 'main' && navEntryVisible(user, e),
  )

  const withSection = mainEntries.filter((e) => e.nav!.section)
  const sectionIds = [...new Set(withSection.map((e) => e.nav!.section!.id))]

  const menus: Extract<MainNavTopItem, { kind: 'menu' }>[] = sectionIds.map((id) => {
    const children = withSection
      .filter((e) => e.nav!.section!.id === id)
      .sort((a, b) => a.nav!.order - b.nav!.order)
      .map((e) => ({
        label: e.nav!.label,
        to: entryPathToHref(e.path),
      }))
    const section = withSection.find((e) => e.nav!.section!.id === id)!.nav!.section!
    return { kind: 'menu' as const, section, children }
  })

  const topLinks = mainEntries
    .filter((e) => !e.nav!.section)
    .map(
      (e): MainNavTopItem => ({
        kind: 'link',
        to: entryPathToHref(e.path),
        label: e.nav!.label,
        order: e.nav!.order,
      }),
    )

  const menuOrderById = new Map(
    menus.map((m) => [m.section.id, m.section.order] as const),
  )

  function sortKey(item: MainNavTopItem): number {
    if (item.kind === 'link') return item.order
    return menuOrderById.get(item.section.id) ?? 99
  }

  const combined: MainNavTopItem[] = [...topLinks, ...menus]
  combined.sort((a, b) => sortKey(a) - sortKey(b))

  return combined.filter((item) => {
    if (item.kind === 'menu') return item.children.length > 0
    return true
  })
}

export function getSettingsNavLinks(user: UserProfile): NavLinkItem[] {
  return ROUTE_ENTRIES.filter(
    (e) => e.layout === 'app' && e.nav?.group === 'settings' && e.permission(user),
  )
    .sort((a, b) => a.nav!.order - b.nav!.order)
    .map((e) => ({
      label: e.nav!.label,
      to: entryPathToHref(e.path),
      icon: e.nav!.icon,
    }))
}

export function getUserMenuNavLinks(user: UserProfile): NavLinkItem[] {
  return ROUTE_ENTRIES.filter(
    (e) => e.layout === 'app' && e.nav?.group === 'user' && e.permission(user),
  )
    .sort((a, b) => a.nav!.order - b.nav!.order)
    .map((e) => ({
      label: e.nav!.label,
      to: entryPathToHref(e.path),
      icon: e.nav!.icon,
    }))
}
