import type { Permissions, UserProfile } from '@/types/api'

export function canViewDashboard(permissions: Permissions): boolean {
  return permissions.stats.canView
}

export function isAdminUser(user: UserProfile | null | undefined): boolean {
  return user?.isAdmin === true
}

/**
 * Visitor tags and global conditions are funnel building blocks. The API exposes
 * no dedicated `tags`/`conditions` permission keys, so gate on the nearest domain
 * owner: campaign view access (funnels live under campaigns).
 */
export function canManageFunnelAssets(user: UserProfile): boolean {
  return user.permissions.campaigns.canView
}
