import { describe, expect, it } from 'vitest'
import { validateFunnelGraph } from '@/lib/funnel-graph/validateGraph'
import { NODE_TYPES, type FunnelFlowEdge, type FunnelFlowNode } from '@/types/funnel'

function flowNode(
  id: string,
  nodeType: number,
  label: string,
  position: { x: number; y: number },
  params: Record<string, unknown> = {},
  isEntrance?: boolean,
): FunnelFlowNode {
  return {
    id,
    type: 'test',
    position,
    data: {
      nodeType,
      label,
      params,
      isEntrance: isEntrance ?? nodeType === NODE_TYPES.root,
    },
  } as FunnelFlowNode
}

function flowEdge(
  id: string,
  source: string,
  target: string,
  data: FunnelFlowEdge['data'],
): FunnelFlowEdge {
  return {
    id,
    source,
    target,
    type: data?.edgeType ?? 'weighted',
    data,
  } as FunnelFlowEdge
}

describe('validateFunnelGraph', () => {
  it('accepts a single root-only graph', () => {
    const root = flowNode('r1', NODE_TYPES.root, 'Entrance', { x: 0, y: 0 })
    const { errors } = validateFunnelGraph([root], [])
    expect(errors).toHaveLength(0)
  })

  it('errors when root count is not exactly one', () => {
    const { errors } = validateFunnelGraph([], [])
    expect(errors.some((e) => e.code === 'ROOT_COUNT')).toBe(true)
  })

  it('errors on duplicate node id', () => {
    const a = flowNode('n1', NODE_TYPES.root, 'A', { x: 0, y: 0 })
    const b = flowNode('n1', NODE_TYPES.rotator, 'B', { x: 1, y: 1 })
    const { errors } = validateFunnelGraph([a, b], [])
    expect(errors.some((e) => e.code === 'DUPLICATE_NODE_ID')).toBe(true)
  })

  it('errors on dangling edge', () => {
    const root = flowNode('r1', NODE_TYPES.root, 'R', { x: 0, y: 0 })
    const e1 = flowEdge('e1', 'r1', 'missing', { edgeType: 'weighted', weight: 100, locked: true })
    const { errors } = validateFunnelGraph([root], [e1])
    expect(errors.some((e) => e.code === 'DANGLING_EDGE')).toBe(true)
  })

  it('errors on self edge', () => {
    const root = flowNode('r1', NODE_TYPES.root, 'R', { x: 0, y: 0 })
    const e1 = flowEdge('e1', 'r1', 'r1', { edgeType: 'weighted', weight: 100, locked: true })
    const { errors } = validateFunnelGraph([root], [e1])
    expect(errors.some((e) => e.code === 'SELF_EDGE')).toBe(true)
  })

  it('errors when lander lacks pageId on forSave', () => {
    const root = flowNode('r1', NODE_TYPES.root, 'R', { x: 0, y: 0 })
    const lander = flowNode('l1', NODE_TYPES.lander, 'L', { x: 1, y: 0 }, {})
    const { errors } = validateFunnelGraph([root, lander], [], { forSave: true })
    expect(errors.some((e) => e.code === 'PARAM_LANDER_OFFER_PAGE')).toBe(true)
  })

  it('errors when condition has two YES branches', () => {
    const root = flowNode('r1', NODE_TYPES.root, 'R', { x: 0, y: 0 })
    const cond = flowNode('c1', NODE_TYPES.condition, 'C', { x: 1, y: 0 }, { conditionId: 'x' })
    const t1 = flowNode('t1', NODE_TYPES.lander, 'T1', { x: 2, y: 0 }, { pageId: 'p1' })
    const t2 = flowNode('t2', NODE_TYPES.lander, 'T2', { x: 2, y: 1 }, { pageId: 'p2' })
    const edges: FunnelFlowEdge[] = [
      flowEdge('e0', 'r1', 'c1', { edgeType: 'weighted', weight: 100, locked: true }),
      flowEdge('e1', 'c1', 't1', { edgeType: 'condition', branch: 'yes' }),
      flowEdge('e2', 'c1', 't2', { edgeType: 'condition', branch: 'yes' }),
    ]
    const { errors } = validateFunnelGraph([root, cond, t1, t2], edges)
    expect(errors.some((e) => e.code === 'CONDITION_BRANCH_LIMIT')).toBe(true)
  })

  it('errors when visitor tag has two exits', () => {
    const root = flowNode('r1', NODE_TYPES.root, 'R', { x: 0, y: 0 })
    const vt = flowNode('v1', NODE_TYPES.visitorTag, 'V', { x: 1, y: 0 }, { tagId: 't1', tagName: 'a' })
    const t1 = flowNode('t1', NODE_TYPES.lander, 'T1', { x: 2, y: 0 }, { pageId: 'p1' })
    const t2 = flowNode('t2', NODE_TYPES.lander, 'T2', { x: 2, y: 1 }, { pageId: 'p2' })
    const edges: FunnelFlowEdge[] = [
      flowEdge('e0', 'r1', 'v1', { edgeType: 'weighted', weight: 100, locked: true }),
      flowEdge('e1', 'v1', 't1', { edgeType: 'code', onDoneNumber: 1 }),
      flowEdge('e2', 'v1', 't2', { edgeType: 'code', onDoneNumber: 1 }),
    ]
    const { errors } = validateFunnelGraph([root, vt, t1, t2], edges)
    expect(errors.some((e) => e.code === 'VISITOR_TAG_EXIT_LIMIT')).toBe(true)
  })
})
