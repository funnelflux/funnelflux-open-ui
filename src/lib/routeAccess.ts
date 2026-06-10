import type { Permissions, UserProfile } from '@/types/api'

export function canViewDashboard(permissions: Permissions): boolean {
  return permissions.stats.canView
}

export function isAdminUser(user: UserProfile | null | undefined): boolean {
  return user?.isAdmin === true
}
