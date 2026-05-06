import { describe, it, expect } from 'vitest'
import { z } from 'zod/v4'
import {
  permissionsSchema,
  parseUserProfile,
  parseFunnelWireEnvelope,
  parseDrilldownReport,
  userProfileSchema,
} from './apiBoundaries'

const fullPermissions = {
  stats: { enabled: true, canView: true, canEditCustomViews: true },
  campaigns: {
    enabled: true,
    canView: true,
    canCreateNew: true,
    canEdit: true,
    canArchive: true,
    canDelete: true,
    restrictTo: [] as string[],
  },
  trafficSources: {
    enabled: true,
    canView: true,
    canCreateNew: true,
    canEdit: true,
    canArchive: true,
    canDelete: true,
    restrictTo: [] as string[],
  },
  offerSources: {
    enabled: true,
    canView: true,
    canCreateNew: true,
    canEdit: true,
    canArchive: true,
    canDelete: true,
    restrictTo: [] as string[],
  },
  offers: {
    enabled: true,
    canView: true,
    canCreateNew: true,
    canEdit: true,
    canArchive: true,
    canDelete: true,
    restrictTo: [] as string[],
    restrictToAssetIds: [] as string[],
    restrictToCategoryIds: [] as string[],
  },
  landers: {
    enabled: true,
    canView: true,
    canCreateNew: true,
    canEdit: true,
    canArchive: true,
    canDelete: true,
    restrictTo: [] as string[],
    restrictToAssetIds: [] as string[],
    restrictToCategoryIds: [] as string[],
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

const validUserProfile = {
  id: '1',
  login: 'admin',
  firstname: 'A',
  lastname: 'B',
  email: 'a@b.co',
  avatarURL: '',
  isAdmin: true,
  enabled: true,
  permissions: fullPermissions,
}

describe('apiBoundaries', () => {
  it('parseUserProfile accepts API-shaped profile and passes through extras (passthrough)', () => {
    const withExtra = { ...validUserProfile, timezone: 'UTC' }
    const out = parseUserProfile(withExtra)
    expect(out.id).toBe('1')
    expect((out as { timezone?: string }).timezone).toBe('UTC')
  })

  it('parseUserProfile normalizes legacy numeric ids to strings', () => {
    const out = parseUserProfile({ ...validUserProfile, id: 1 })
    expect(out.id).toBe('1')
  })

  it('parseUserProfile normalizes PHP 0/1 booleans and asset type 2 restrictions', () => {
    const phpWireProfile = {
      ...validUserProfile,
      isAdmin: 1,
      enabled: 1,
      permissions: {
        ...fullPermissions,
        stats: { enabled: 1, canView: 1, canEditCustomViews: 0 },
        campaigns: { ...fullPermissions.campaigns, enabled: 1 },
        trafficSources: { ...fullPermissions.trafficSources, enabled: 1 },
        offerSources: { ...fullPermissions.offerSources, enabled: 1 },
        offers: {
          enabled: 1,
          canView: 1,
          canCreateNew: 0,
          canEdit: 1,
          canArchive: 0,
          canDelete: 0,
          restrictToAssetIds: [12],
          restrictToCategoryIds: ['34'],
        },
        landers: {
          enabled: 0,
          canView: 0,
          canCreateNew: 0,
          canEdit: 0,
          canArchive: 0,
          canDelete: 0,
          restrictToAssetIds: [],
          restrictToCategoryIds: [],
        },
        storedLinks: { ...fullPermissions.storedLinks, enabled: 1 },
        trafficFilters: { ...fullPermissions.trafficFilters, enabled: 1 },
        dataUpdates: { ...fullPermissions.dataUpdates, enabled: 1 },
        systemUpdates: { ...fullPermissions.systemUpdates, enabled: 1 },
      },
    }

    const out = parseUserProfile(phpWireProfile)
    expect(out.isAdmin).toBe(true)
    expect(out.permissions.stats.canEditCustomViews).toBe(false)
    expect(out.permissions.offers.restrictTo).toEqual([])
    expect(out.permissions.offers.restrictToAssetIds).toEqual(['12'])
    expect(out.permissions.landers.enabled).toBe(false)
  })

  it('parseUserProfile rejects missing permissions subtree', () => {
    const bad = { ...validUserProfile, permissions: { stats: { enabled: true } } }
    expect(() => parseUserProfile(bad)).toThrow(z.ZodError)
  })

  it('permissionsSchema used standalone rejects partial objects', () => {
    expect(() => permissionsSchema.parse({ stats: { enabled: true } })).toThrow(z.ZodError)
  })

  it('userProfileSchema is strict enough for login id + permissions', () => {
    expect(() => userProfileSchema.parse(validUserProfile)).not.toThrow()
  })

  it('parseFunnelWireEnvelope requires nodes array', () => {
    expect(parseFunnelWireEnvelope({ nodes: [] })).toEqual(
      expect.objectContaining({ nodes: [] }),
    )
    expect(() => parseFunnelWireEnvelope({ edges: [] })).toThrow(z.ZodError)
  })

  it('parseDrilldownReport accepts minimal report objects', () => {
    expect(parseDrilldownReport({})).toEqual(expect.any(Object))
    expect(parseDrilldownReport({ rows: [], columns: [] })).toEqual(
      expect.objectContaining({ rows: [], columns: [] }),
    )
    expect(() => parseDrilldownReport(null)).toThrow(z.ZodError)
  })
})
