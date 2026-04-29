import { describe, expect, it } from 'vitest'
import {
  computeDisplayedWeights,
  formatWeight,
  materializeRotatorWeights,
  maxAllowedWeight,
  reclassifyLoadedRotatorEdges,
} from './rotatorWeights'
import type { FunnelFlowEdge, WeightedEdgeData } from '@/types/funnel'

function edge(id: string, source: string, weight: number, locked: boolean): FunnelFlowEdge & {
  data: WeightedEdgeData
} {
  return {
    id,
    source,
    target: `t-${id}`,
    type: 'weighted',
    data: { edgeType: 'weighted', weight, locked },
  } as FunnelFlowEdge & { data: WeightedEdgeData }
}

describe('computeDisplayedWeights', () => {
  it('splits two unlocked edges 50/50', () => {
    const siblings = [edge('a', 'r', 0, false), edge('b', 'r', 0, false)]
    const dist = computeDisplayedWeights(siblings)

    expect(dist.byEdgeId.get('a')!.weight).toBe(50)
    expect(dist.byEdgeId.get('b')!.weight).toBe(50)
    expect(dist.total).toBe(100)
    expect(dist.allLocked).toBe(false)
    expect(dist.errorDrift).toBe(0)
  })

  it('splits three unlocked edges ~33/33/33', () => {
    const siblings = [
      edge('a', 'r', 0, false),
      edge('b', 'r', 0, false),
      edge('c', 'r', 0, false),
    ]
    const dist = computeDisplayedWeights(siblings)
    const a = dist.byEdgeId.get('a')!.weight
    expect(a).toBeCloseTo(100 / 3, 5)
    expect(dist.total).toBeCloseTo(100, 5)
  })

  it('locked edges keep their value; unlocked split the remainder', () => {
    // 1 locked at 70, 2 unlocked → unlocked share = 15 each
    const siblings = [
      edge('a', 'r', 70, true),
      edge('b', 'r', 0, false),
      edge('c', 'r', 0, false),
    ]
    const dist = computeDisplayedWeights(siblings)
    expect(dist.byEdgeId.get('a')!.weight).toBe(70)
    expect(dist.byEdgeId.get('b')!.weight).toBe(15)
    expect(dist.byEdgeId.get('c')!.weight).toBe(15)
    expect(dist.total).toBe(100)
  })

  it('flags error when all locked but sum != 100', () => {
    const siblings = [edge('a', 'r', 60, true), edge('b', 'r', 30, true)]
    const dist = computeDisplayedWeights(siblings)
    expect(dist.allLocked).toBe(true)
    expect(dist.total).toBe(90)
    expect(dist.errorDrift).toBe(10)
  })

  it('clamps locked sum so unlocked share never goes negative', () => {
    const siblings = [edge('a', 'r', 150, true), edge('b', 'r', 0, false)]
    const dist = computeDisplayedWeights(siblings)
    // Locked clamped at 100 per edge
    expect(dist.byEdgeId.get('a')!.weight).toBe(100)
    expect(dist.byEdgeId.get('b')!.weight).toBe(0)
  })
})

describe('maxAllowedWeight', () => {
  it('caps an edge at 100 minus other locked weights', () => {
    const siblings = [edge('a', 'r', 30, true), edge('b', 'r', 0, false)]
    expect(maxAllowedWeight(siblings, 'b')).toBe(70)
  })

  it('returns 100 when no other siblings are locked', () => {
    const siblings = [edge('a', 'r', 0, false), edge('b', 'r', 0, false)]
    expect(maxAllowedWeight(siblings, 'a')).toBe(100)
  })
})

describe('materializeRotatorWeights', () => {
  it('overwrites stored weight with displayed share for unlocked edges', () => {
    const edges = [
      edge('a', 'r', 0, false),
      edge('b', 'r', 0, false),
    ]
    const out = materializeRotatorWeights(edges)
    expect((out[0].data as WeightedEdgeData).weight).toBe(50)
    expect((out[1].data as WeightedEdgeData).weight).toBe(50)
  })

  it('keeps non-weighted edges untouched', () => {
    const edges = [
      edge('a', 'r', 0, false),
      {
        id: 'x',
        source: 'p',
        target: 'q',
        type: 'action',
        data: { edgeType: 'action', actionNumber: 1 },
      } as FunnelFlowEdge,
    ]
    const out = materializeRotatorWeights(edges)
    expect(out[1]).toBe(edges[1])
  })
})

describe('reclassifyLoadedRotatorEdges', () => {
  it('unlocks a single 100% edge so adding a sibling rebalances', () => {
    const edges = [edge('a', 'r', 100, true)]
    const out = reclassifyLoadedRotatorEdges(edges)
    expect((out[0].data as WeightedEdgeData).locked).toBe(false)
  })

  it('unlocks an even 50/50 split', () => {
    const edges = [edge('a', 'r', 50, true), edge('b', 'r', 50, true)]
    const out = reclassifyLoadedRotatorEdges(edges)
    expect((out[0].data as WeightedEdgeData).locked).toBe(false)
    expect((out[1].data as WeightedEdgeData).locked).toBe(false)
  })

  it('keeps custom 70/30 split locked', () => {
    const edges = [edge('a', 'r', 70, true), edge('b', 'r', 30, true)]
    const out = reclassifyLoadedRotatorEdges(edges)
    expect((out[0].data as WeightedEdgeData).locked).toBe(true)
    expect((out[1].data as WeightedEdgeData).locked).toBe(true)
  })

  it('unlocks a near-even three-way split (33.3/33.3/33.4)', () => {
    const edges = [
      edge('a', 'r', 33.3, true),
      edge('b', 'r', 33.3, true),
      edge('c', 'r', 33.4, true),
    ]
    const out = reclassifyLoadedRotatorEdges(edges)
    expect((out[0].data as WeightedEdgeData).locked).toBe(false)
    expect((out[1].data as WeightedEdgeData).locked).toBe(false)
    expect((out[2].data as WeightedEdgeData).locked).toBe(false)
  })
})

describe('formatWeight', () => {
  it('shows integers without decimals', () => {
    expect(formatWeight(50)).toBe('50')
    expect(formatWeight(100)).toBe('100')
  })

  it('shows one decimal for fractional values', () => {
    expect(formatWeight(33.333)).toBe('33.3')
  })
})
