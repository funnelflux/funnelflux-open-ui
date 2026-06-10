/**
 * Zod guards at API/UI boundaries. Prefer fixing `api-specs/*.yaml` + regenerating types
 * over ad-hoc assertions; keep shapes aligned with {@link UserProfile} and wire responses.
 */
import { z } from 'zod/v4'
import type { UserProfile } from '@/types/api'

const idString = z.union([z.string(), z.number()]).transform(String)
const boolish = z
  .union([z.boolean(), z.literal(0), z.literal(1), z.literal('0'), z.literal('1')])
  .transform((value) => value === true || value === 1 || value === '1')
const idArray = z.array(idString)

const assetPerms = z.object({
  enabled: boolish,
  canView: boolish,
  canCreateNew: boolish,
  canEdit: boolish,
  canArchive: boolish,
  canDelete: boolish,
  restrictTo: idArray,
})

const assetPerms2 = assetPerms.extend({
  restrictTo: idArray.default([]),
  restrictToAssetIds: idArray,
  restrictToCategoryIds: idArray,
})

export const permissionsSchema = z.object({
  stats: z.object({
    enabled: boolish,
    canView: boolish,
    canEditCustomViews: boolish,
  }),
  campaigns: assetPerms,
  trafficSources: assetPerms,
  offerSources: assetPerms,
  offers: assetPerms2,
  landers: assetPerms2,
  systemLinks: z.object({
    enabled: boolish,
    canView: boolish,
  }),
  storedLinks: z.object({
    enabled: boolish,
    canView: boolish,
    canCreateNew: boolish,
    canEdit: boolish,
    canDelete: boolish,
    canResetStats: boolish,
  }),
  trafficFilters: z.object({
    enabled: boolish,
    canView: boolish,
    canCreateNew: boolish,
    canEdit: boolish,
    canDelete: boolish,
    canApplyToPastStats: boolish,
  }),
  dataUpdates: z.object({
    enabled: boolish,
    canUpdateConversions: boolish,
    canUpdateTrafficCost: boolish,
    canResetStats: boolish,
  }),
  systemUpdates: z.object({
    enabled: boolish,
    canView: boolish,
    canInstallUpdate: boolish,
  }),
})

export const userProfileSchema = z
  .object({
    id: idString,
    login: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    email: z.string(),
    avatarURL: z.string(),
    isAdmin: boolish,
    enabled: boolish,
    permissions: permissionsSchema,
  })
  .passthrough()

export function parseUserProfile(input: unknown): UserProfile {
  return userProfileSchema.parse(input) as UserProfile
}

/** Minimal funnel GET envelope (nodes present). */
export const funnelWireEnvelopeSchema = z
  .object({
    nodes: z.array(z.unknown()),
  })
  .passthrough()

export function parseFunnelWireEnvelope(input: unknown): unknown {
  return funnelWireEnvelopeSchema.parse(input)
}

/** Drilldown / stats report top-level shape (rows + column metadata). */
export const drilldownReportSchema = z
  .object({
    rows: z.array(z.unknown()).optional(),
    columns: z.array(z.unknown()).optional(),
    totals: z.unknown().optional(),
    paging: z.unknown().optional(),
    rowsTotal: z.number().optional(),
    rowsReturned: z.number().optional(),
  })
  .passthrough()

export function parseDrilldownReport(input: unknown): unknown {
  return drilldownReportSchema.parse(input)
}
