import type { FunnelFlowEdge, WeightedEdgeData } from '@/types/funnel'

export interface DisplayedWeight {
  /** Displayed percentage (0-100, may be fractional). */
  weight: number
  /** True if user explicitly set this weight. */
  locked: boolean
}

export interface WeightDistribution {
  /** Per-edge displayed weight + locked flag, keyed by edge id. */
  byEdgeId: Map<string, DisplayedWeight>
  /** Sum of displayed weights (always ~100 unless allLocked && lockedSum != 100). */
  total: number
  /** True when every edge is locked. */
  allLocked: boolean
  /** When allLocked && total !== 100, this is the absolute drift (e.g. 5 means 95 or 105). */
  errorDrift: number
}

const EPSILON = 0.01

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function isWeighted(e: FunnelFlowEdge): e is FunnelFlowEdge & { data: WeightedEdgeData } {
  return e.data?.edgeType === 'weighted'
}

/** Edges that share a rotator/root source with `edge` (including edge itself). */
export function getSiblingWeightedEdges(
  edges: FunnelFlowEdge[],
  sourceId: string,
): Array<FunnelFlowEdge & { data: WeightedEdgeData }> {
  return edges.filter((e) => e.source === sourceId && isWeighted(e)) as Array<
    FunnelFlowEdge & { data: WeightedEdgeData }
  >
}

/**
 * Compute displayed weights for a set of sibling weighted edges.
 *
 * Rules (mirrors legacy FunnelFlux behavior):
 *  - Locked edges keep their stored weight (clamped to 0–100).
 *  - Locked total clamped to 100.
 *  - Remaining = max(0, 100 − sum(locked))
 *  - Unlocked edges split `remaining` evenly.
 *  - When every edge is locked AND the total drifts from 100 by more than EPSILON, flag it.
 */
export function computeDisplayedWeights(
  siblings: Array<FunnelFlowEdge & { data: WeightedEdgeData }>,
): WeightDistribution {
  const byEdgeId = new Map<string, DisplayedWeight>()

  if (siblings.length === 0) {
    return { byEdgeId, total: 0, allLocked: true, errorDrift: 0 }
  }

  let lockedSum = 0
  let lockedCount = 0
  for (const e of siblings) {
    if (e.data.locked) {
      lockedSum += clamp(e.data.weight ?? 0, 0, 100)
      lockedCount++
    }
  }

  const allLocked = lockedCount === siblings.length
  const unlockedCount = siblings.length - lockedCount
  const remaining = Math.max(0, 100 - lockedSum)
  const share = unlockedCount > 0 ? remaining / unlockedCount : 0

  let total = 0
  for (const e of siblings) {
    if (e.data.locked) {
      const w = clamp(e.data.weight ?? 0, 0, 100)
      byEdgeId.set(e.id, { weight: w, locked: true })
      total += w
    } else {
      byEdgeId.set(e.id, { weight: share, locked: false })
      total += share
    }
  }

  const errorDrift = allLocked ? Math.abs(100 - lockedSum) : 0
  return { byEdgeId, total, allLocked, errorDrift }
}

/** Format for display: integer if whole, else 1 decimal place. */
export function formatWeight(weight: number): string {
  const rounded = Math.round(weight * 10) / 10
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
}

/**
 * Maximum value the slider/input for one locked edge can take, given the other siblings.
 * = 100 − sum(weights of OTHER locked edges)
 */
export function maxAllowedWeight(
  siblings: Array<FunnelFlowEdge & { data: WeightedEdgeData }>,
  edgeId: string,
): number {
  let otherLockedSum = 0
  for (const e of siblings) {
    if (e.id === edgeId) continue
    if (e.data.locked) otherLockedSum += clamp(e.data.weight ?? 0, 0, 100)
  }
  return Math.max(0, Math.min(100, 100 - otherLockedSum))
}

export { EPSILON as WEIGHT_EPSILON }

/**
 * On hydrate from the API, every weighted edge arrives with `locked: true` (the
 * server doesn't carry a dirty bit). For the common case where an existing
 * rotator/root already has an even split (e.g. a single 100% edge, or 50/50, or
 * 33/33/33), we want the user to be able to add a new sibling and have it
 * rebalance automatically — i.e. those edges should actually be `locked: false`.
 *
 * This pass groups weighted edges by source and unlocks them iff every sibling's
 * weight is within EPSILON of the even share `100/n`. Otherwise the user clearly
 * set custom weights, so we leave them locked.
 */
export function reclassifyLoadedRotatorEdges(edges: FunnelFlowEdge[]): FunnelFlowEdge[] {
  const groups = new Map<string, Array<FunnelFlowEdge & { data: WeightedEdgeData }>>()
  for (const e of edges) {
    if (!isWeighted(e)) continue
    const arr = groups.get(e.source) ?? []
    arr.push(e)
    groups.set(e.source, arr)
  }

  // Tolerance is intentionally looser than EPSILON — legacy/V1 saved integer percentages,
  // so a 3-way auto-split may be persisted as 33/33/34 (drift ≈ 0.67 from 33.33).
  const RECLASSIFY_TOL = 1.0
  const idsToUnlock = new Set<string>()
  for (const siblings of groups.values()) {
    const evenShare = 100 / siblings.length
    const isEvenSplit = siblings.every(
      (e) => Math.abs((e.data.weight ?? 0) - evenShare) <= RECLASSIFY_TOL,
    )
    if (isEvenSplit) {
      for (const e of siblings) idsToUnlock.add(e.id)
    }
  }

  if (idsToUnlock.size === 0) return edges

  return edges.map((e) => {
    if (!idsToUnlock.has(e.id) || !isWeighted(e)) return e
    return { ...e, data: { ...e.data, locked: false, weight: 0 } }
  })
}

/**
 * Returns a shallow-cloned edge list where every weighted edge's `weight` is the
 * displayed (auto-distributed) value, so the wire format always sums to ~100.
 * Locked state is preserved so reload behavior stays consistent if persisted.
 */
export function materializeRotatorWeights(edges: FunnelFlowEdge[]): FunnelFlowEdge[] {
  // Group weighted edges by source node id
  const groups = new Map<string, Array<FunnelFlowEdge & { data: WeightedEdgeData }>>()
  for (const e of edges) {
    if (!isWeighted(e)) continue
    const arr = groups.get(e.source) ?? []
    arr.push(e)
    groups.set(e.source, arr)
  }

  // Compute displayed per group, then build override map
  const overrides = new Map<string, number>()
  for (const siblings of groups.values()) {
    const dist = computeDisplayedWeights(siblings)
    dist.byEdgeId.forEach((d, id) => overrides.set(id, d.weight))
  }

  if (overrides.size === 0) return edges

  return edges.map((e) => {
    const w = overrides.get(e.id)
    if (w === undefined || !isWeighted(e)) return e
    return { ...e, data: { ...e.data, weight: w } }
  })
}
