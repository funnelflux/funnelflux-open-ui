import type { Permissions, UserProfile } from '@/types/api'

export function canViewDashboard(permissions: Permissions): boolean {
  return permissions.stats.canView
}

export function isAdminUser(user: UserProfile | null | undefined): boolean {
  return user?.isAdmin === true
}

export function getDefaultAuthorizedPath(
  user: UserProfile | null | undefined,
): string {
  const permissions = user?.permissions
  if (!permissions) return '/'

  if (canViewDashboard(permissions)) return '/'
  if (permissions.campaigns.canView) return '/campaigns'
  if (permissions.trafficSources.canView) return '/traffic-sources'
  if (permissions.offerSources.canView) return '/offer-sources'
  if (permissions.offers.canView) return '/offers'
  if (permissions.landers.canView) return '/landers'
  if (permissions.systemLinks.canView) return '/links/generate'
  if (permissions.storedLinks.canView) return '/links/stored'
  if (permissions.dataUpdates.canUpdateConversions) return '/data-updates/conversions'
  if (permissions.dataUpdates.canUpdateTrafficCost) return '/data-updates/costs'
  if (permissions.dataUpdates.canResetStats) return '/data-updates/reset'
  if (permissions.trafficFilters.canView) return '/settings/traffic-filters'
  if (isAdminUser(user)) return '/settings/system'
  return '/inbox'
}
