import { describe, it, expect } from 'vitest'
import type { Permissions, UserProfile } from '@/types/api'
import {
  ROUTE_ENTRIES,
  entryPathToHref,
  getDefaultAuthorizedPath,
  getMainNavStructure,
  getSettingsNavLinks,
  getUserMenuNavLinks,
  canAccessAuthenticatedOnly,
} from '@/lib/routeRegistry'
import { canManageFunnelAssets } from '@/lib/routeAccess'

function fullPermissions(overrides: Partial<Permissions> = {}): Permissions {
  const base: Permissions = {
    stats: { enabled: true, canView: true, canEditCustomViews: true },
    campaigns: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
    },
    trafficSources: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
    },
    offerSources: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
    },
    offers: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
      restrictToAssetIds: [],
      restrictToCategoryIds: [],
    },
    landers: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canArchive: true,
      canDelete: true,
      restrictTo: [],
      restrictToAssetIds: [],
      restrictToCategoryIds: [],
    },
    systemLinks: { enabled: true, canView: true },
    storedLinks: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canDelete: true,
      canResetStats: true,
    },
    trafficFilters: {
      enabled: true,
      canView: true,
      canCreateNew: true,
      canEdit: true,
      canDelete: true,
      canApplyToPastStats: true,
    },
    dataUpdates: {
      enabled: true,
      canUpdateConversions: true,
      canUpdateTrafficCost: true,
      canResetStats: true,
    },
    systemUpdates: { enabled: true, canView: true, canInstallUpdate: true },
  }
  return { ...base, ...overrides }
}

function userWith(perms: Partial<Permissions> = {}, isAdmin = false): UserProfile {
  return {
    id: '1',
    login: 't',
    firstname: 'T',
    lastname: '',
    email: 't@t',
    avatarURL: '',
    isAdmin,
    enabled: true,
    permissions: { ...fullPermissions(), ...perms },
  }
}

describe('routeRegistry', () => {
  it('keeps only explicit design/demo entries public and every product route in the app layout', () => {
    const publicPaths = ROUTE_ENTRIES
      .filter((entry) => entry.layout === 'public')
      .map((entry) => entry.path)
    expect(publicPaths).toEqual(['design-system'])
    expect(ROUTE_ENTRIES.filter((entry) => entry.layout === 'app').length).toBeGreaterThan(0)
  })

  it('gives every route entry a permission predicate', () => {
    for (const e of ROUTE_ENTRIES) {
      expect(typeof e.permission).toBe('function')
      const u = userWith({})
      expect(() => e.permission(u)).not.toThrow()
    }
  })

  it('gates funnel assets on campaign view permission', () => {
    const allowed = userWith()
    const denied = userWith({
      campaigns: {
        ...fullPermissions().campaigns,
        canView: false,
      },
    })

    expect(canManageFunnelAssets(allowed)).toBe(true)
    expect(canManageFunnelAssets(denied)).toBe(false)
  })

  it('gates inbox as authenticated-only and tags/conditions on campaign view', () => {
    const paths = new Set(
      ROUTE_ENTRIES.filter((e) => e.layout === 'app').map((e) => e.path),
    )
    expect(paths.has('inbox')).toBe(true)
    expect(paths.has('settings/tags')).toBe(true)
    expect(paths.has('settings/conditions')).toBe(true)

    const inbox = ROUTE_ENTRIES.find((e) => e.path === 'inbox')
    const tags = ROUTE_ENTRIES.find((e) => e.path === 'settings/tags')
    const conditions = ROUTE_ENTRIES.find((e) => e.path === 'settings/conditions')
    expect(inbox?.permission).toBe(canAccessAuthenticatedOnly)
    expect(tags?.permission).toBe(canManageFunnelAssets)
    expect(conditions?.permission).toBe(canManageFunnelAssets)
  })

  it('resolves default landing path by priority for representative profiles', () => {
    const adminAll = userWith({}, true)
    expect(getDefaultAuthorizedPath(adminAll)).toBe('/')

    const statsOnly = userWith({
      campaigns: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
      },
      trafficSources: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
      },
      offerSources: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
      },
      offers: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
        restrictToAssetIds: [],
        restrictToCategoryIds: [],
      },
      landers: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
        restrictToAssetIds: [],
        restrictToCategoryIds: [],
      },
      systemLinks: { enabled: true, canView: false },
      storedLinks: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canDelete: false,
        canResetStats: false,
      },
      trafficFilters: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canDelete: false,
        canApplyToPastStats: false,
      },
      dataUpdates: {
        enabled: true,
        canUpdateConversions: false,
        canUpdateTrafficCost: false,
        canResetStats: false,
      },
    })
    expect(getDefaultAuthorizedPath(statsOnly)).toBe('/')

    const campaignsOnly = userWith({
      stats: { enabled: true, canView: false, canEditCustomViews: false },
      campaigns: {
        enabled: true,
        canView: true,
        canCreateNew: true,
        canEdit: true,
        canArchive: true,
        canDelete: true,
        restrictTo: [],
      },
    })
    expect(getDefaultAuthorizedPath(campaignsOnly)).toBe('/campaigns')

    const trafficOnly = userWith({
      stats: { enabled: true, canView: false, canEditCustomViews: false },
      campaigns: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
      },
      trafficSources: {
        enabled: true,
        canView: true,
        canCreateNew: true,
        canEdit: true,
        canArchive: true,
        canDelete: true,
        restrictTo: [],
      },
      offerSources: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
      },
    })
    expect(getDefaultAuthorizedPath(trafficOnly)).toBe('/traffic-sources')

    const noAssetPerms = userWith({
      stats: { enabled: true, canView: false, canEditCustomViews: false },
      campaigns: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
      },
      trafficSources: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
      },
      offerSources: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
      },
      offers: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
        restrictToAssetIds: [],
        restrictToCategoryIds: [],
      },
      landers: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canArchive: false,
        canDelete: false,
        restrictTo: [],
        restrictToAssetIds: [],
        restrictToCategoryIds: [],
      },
      systemLinks: { enabled: true, canView: false },
      storedLinks: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canDelete: false,
        canResetStats: false,
      },
      dataUpdates: {
        enabled: true,
        canUpdateConversions: false,
        canUpdateTrafficCost: false,
        canResetStats: false,
      },
      trafficFilters: {
        enabled: true,
        canView: false,
        canCreateNew: false,
        canEdit: false,
        canDelete: false,
        canApplyToPastStats: false,
      },
    })
    expect(getDefaultAuthorizedPath(noAssetPerms)).toBe('/inbox')

    expect(getDefaultAuthorizedPath(null)).toBe('/')
  })

  it('keeps nav targets aligned with registry paths (superuser)', () => {
    const superUser = userWith({}, true)
    const hrefs = new Set(
      ROUTE_ENTRIES.filter((e) => e.layout === 'app').map((e) => entryPathToHref(e.path)),
    )

    const collect = (to: string) => {
      expect(hrefs.has(to), `missing registry path for nav href ${to}`).toBe(true)
    }

    for (const item of getMainNavStructure(superUser)) {
      if (item.kind === 'link') collect(item.to)
      else item.children.forEach((c) => collect(c.to))
    }
    for (const s of getSettingsNavLinks(superUser)) {
      if (!s.external) collect(s.to)
    }
    for (const u of getUserMenuNavLinks(superUser)) collect(u.to)
  })

  it('hides Updates menu when dataUpdates.enabled is false even if a child flag is true', () => {
    const u = userWith({
      dataUpdates: {
        enabled: false,
        canUpdateConversions: true,
        canUpdateTrafficCost: false,
        canResetStats: false,
      },
    })
    const main = getMainNavStructure(u)
    expect(main.some((i) => i.kind === 'menu' && i.section.id === 'updates')).toBe(false)
  })
})
