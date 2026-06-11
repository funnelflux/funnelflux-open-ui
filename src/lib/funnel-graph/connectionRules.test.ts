import type { Connection } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { NODE_TYPES, type FunnelFlowEdge, type FunnelFlowNode } from '@/types/funnel'
import {
  CODE_NODE_UNIFIED_SOURCE_HANDLE,
  CODE_NODE_UNIFIED_TARGET_HANDLE,
} from '@/lib/codeNodeExits'
import { getDefaultEdgeData } from './defaultEdgeData'
import { computeOptimalHandles } from '../funnelEdgeGeometry'
import {
  coerceCodeEdgeRoles,
  coerceJsPhpInboundTargetHandles,
  coerceVisitorTagOutboundEdges,
} from './graphHydrationCoercion'
import { isValidConnection } from './connectionRules'
import { pickConditionBranchForNewConnection } from './conditionBranchPolicy'

function node(id: string, nodeType: number): FunnelFlowNode {
  return {
    id,
    type: 'test',
    position: { x: 0, y: 0 },
    data: { nodeType, label: id, params: {}, isEntrance: nodeType === NODE_TYPES.root },
  } as FunnelFlowNode
}

function edge(id: string, source: string, target: string, data: FunnelFlowEdge['data']): FunnelFlowEdge {
  return {
    id,
    source,
    target,
    type: data?.edgeType ?? 'weighted',
    data,
  } as FunnelFlowEdge
}

describe('condition branch policy', () => {
  it('allocates yes -> no -> null as branches fill', () => {
    const sourceId = 'cond-1'
    expect(pickConditionBranchForNewConnection(sourceId, [])).toBe('yes')

    const one = [edge('e1', sourceId, 't1', { edgeType: 'condition', branch: 'yes' })]
    expect(pickConditionBranchForNewConnection(sourceId, one)).toBe('no')

    const two = [
      ...one,
      edge('e2', sourceId, 't2', { edgeType: 'condition', branch: 'no' }),
    ]
    expect(pickConditionBranchForNewConnection(sourceId, two)).toBeNull()
  })
})

describe('default edge data', () => {
  it('uses first free onDone slot for JS/PHP code edges', () => {
    const jsNode = node('js-1', NODE_TYPES.jsCode)
    const existing: FunnelFlowEdge[] = [
      edge('e1', 'js-1', 'a', { edgeType: 'code', onDoneNumber: 1 }),
      edge('e2', 'js-1', 'b', { edgeType: 'code', onDoneNumber: 2 }),
    ]

    const data = getDefaultEdgeData(jsNode, CODE_NODE_UNIFIED_SOURCE_HANDLE, existing)
    expect(data).toEqual({ edgeType: 'code', codeEdgeRole: 'snippet', onDoneNumber: 3 })
  })
})

describe('graph hydration coercion', () => {
  it('reclassifies visitor-tag outbound legacy edges to code edges', () => {
    const nodes = [node('tag-1', NODE_TYPES.visitorTag), node('offer-1', NODE_TYPES.offer)]
    const edges: FunnelFlowEdge[] = [
      edge('e1', 'tag-1', 'offer-1', { edgeType: 'action', actionNumber: 1, labelLocation: 0.42 }),
    ]

    const out = coerceVisitorTagOutboundEdges(nodes, edges)
    expect(out[0]).toMatchObject({
      type: 'code',
      data: { edgeType: 'code', codeEdgeRole: 'visitorTag', onDoneNumber: 1, labelLocation: 0.42 },
    })
  })

  it('coerces code edge roles from source node types', () => {
    const nodes = [node('tag-1', NODE_TYPES.visitorTag), node('js-1', NODE_TYPES.jsCode), node('t', NODE_TYPES.offer)]
    const edges: FunnelFlowEdge[] = [
      edge('e1', 'tag-1', 't', { edgeType: 'code', onDoneNumber: 1 }),
      edge('e2', 'js-1', 't', { edgeType: 'code', onDoneNumber: 1, codeEdgeRole: 'visitorTag' }),
    ]

    const out = coerceCodeEdgeRoles(nodes, edges)
    expect(out[0]?.data).toMatchObject({ edgeType: 'code', codeEdgeRole: 'visitorTag' })
    expect(out[1]?.data).toMatchObject({ edgeType: 'code', codeEdgeRole: 'snippet' })
  })

  it('normalizes JS/PHP inbound target handles to code-in', () => {
    const nodes = [node('js-1', NODE_TYPES.jsCode), node('src-1', NODE_TYPES.root)]
    const edges: FunnelFlowEdge[] = [
      edge('e1', 'src-1', 'js-1', { edgeType: 'weighted', weight: 100 }),
    ]
    edges[0]!.targetHandle = 't-top'

    const out = coerceJsPhpInboundTargetHandles(nodes, edges)
    expect(out[0]!.targetHandle).toBe(CODE_NODE_UNIFIED_TARGET_HANDLE)
  })
})

describe('edge geometry', () => {
  it('snaps condition edges by geometry instead of forcing branch-specific sides', () => {
    const condition = node('cond-1', NODE_TYPES.condition)
    const offer = node('offer-1', NODE_TYPES.offer)
    offer.position = { x: 500, y: 0 }
    const conditionEdge = edge('e1', 'cond-1', 'offer-1', { edgeType: 'condition', branch: 'no' })

    expect(computeOptimalHandles([condition, offer], conditionEdge)).toEqual({
      sourceHandle: 's-right',
      targetHandle: 't-left',
    })
  })
})

describe('isValidConnection', () => {
  it('rejects a third outgoing condition edge', () => {
    const nodes = [
      node('cond-1', NODE_TYPES.condition),
      node('t1', NODE_TYPES.offer),
      node('t2', NODE_TYPES.offer),
      node('t3', NODE_TYPES.offer),
    ]
    const edges: FunnelFlowEdge[] = [
      edge('e1', 'cond-1', 't1', { edgeType: 'condition', branch: 'yes' }),
      edge('e2', 'cond-1', 't2', { edgeType: 'condition', branch: 'no' }),
    ]
    edges[0]!.sourceHandle = 's-right'
    edges[1]!.sourceHandle = 's-left'

    const conn: Connection = { source: 'cond-1', target: 't3', sourceHandle: 's-top', targetHandle: null }
    expect(isValidConnection(conn, nodes, edges)).toBe(false)
  })

  it('accepts js/php inbound drops on code-out and rejects unrelated target handles', () => {
    const nodes = [node('src-1', NODE_TYPES.root), node('js-1', NODE_TYPES.jsCode)]
    const edges: FunnelFlowEdge[] = []

    const ok: Connection = {
      source: 'src-1',
      target: 'js-1',
      sourceHandle: 's-bottom',
      targetHandle: CODE_NODE_UNIFIED_SOURCE_HANDLE,
    }
    expect(isValidConnection(ok, nodes, edges)).toBe(true)

    const bad: Connection = {
      source: 'src-1',
      target: 'js-1',
      sourceHandle: 's-bottom',
      targetHandle: 't-top',
    }
    expect(isValidConnection(bad, nodes, edges)).toBe(false)
  })
})
