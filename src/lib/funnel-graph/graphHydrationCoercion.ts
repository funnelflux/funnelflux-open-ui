import {
  NODE_TYPES,
  type CodeEdgeData,
  type FunnelFlowEdge,
  type FunnelFlowNode,
} from '@/types/funnel'
import {
  CODE_NODE_UNIFIED_SOURCE_HANDLE,
  CODE_NODE_UNIFIED_TARGET_HANDLE,
} from '@/lib/codeNodeExits'
import { clampOnDoneNumber } from '@/lib/funnel-graph/codeEdgeSlots'

/** Ensure code edges carry a UI role (`snippet` vs `visitorTag`) independent of wire format. */
export function coerceCodeEdgeRoles(
  nodes: FunnelFlowNode[],
  edges: FunnelFlowEdge[],
): FunnelFlowEdge[] {
  const nodeTypeById = new Map(nodes.map((node) => [node.id, node.data.nodeType]))
  return edges.map((edge): FunnelFlowEdge => {
    if (edge.data?.edgeType !== 'code') return edge
    const sourceType = nodeTypeById.get(edge.source)
    const role: CodeEdgeData['codeEdgeRole'] =
      sourceType === NODE_TYPES.visitorTag ? 'visitorTag' : 'snippet'
    if ((edge.data as CodeEdgeData).codeEdgeRole === role) return edge
    return {
      ...edge,
      data: {
        ...(edge.data as CodeEdgeData),
        codeEdgeRole: role,
      },
    }
  })
}

/** Convert legacy/incorrect outbound edges into code-path edges (shows "On done"). */
export function coerceVisitorTagOutboundEdges(
  nodes: FunnelFlowNode[],
  edges: FunnelFlowEdge[],
): FunnelFlowEdge[] {
  const nodeTypeById = new Map(nodes.map((node) => [node.id, node.data.nodeType]))
  return edges.map((edge): FunnelFlowEdge => {
    if (nodeTypeById.get(edge.source) !== NODE_TYPES.visitorTag) return edge
    const currentData = edge.data
    if (currentData?.edgeType === 'code') return edge
    const preservedLabelLocation = currentData?.labelLocation
    return {
      ...edge,
      type: 'code',
      data: {
        edgeType: 'code',
        codeEdgeRole: 'visitorTag',
        onDoneNumber: 1,
        ...(preservedLabelLocation !== undefined ? { labelLocation: preservedLabelLocation } : {}),
      } satisfies CodeEdgeData,
    }
  })
}

/** Normalize JS / PHP outbound code edges to one physical source handle (`code-out`). */
export function coerceJsPhpCodeOutboundHandles(
  nodes: FunnelFlowNode[],
  edges: FunnelFlowEdge[],
): FunnelFlowEdge[] {
  const nodeTypeById = new Map(nodes.map((node) => [node.id, node.data.nodeType]))
  return edges.map((edge): FunnelFlowEdge => {
    if (edge.data?.edgeType !== 'code') return edge
    if (
      nodeTypeById.get(edge.source) !== NODE_TYPES.jsCode &&
      nodeTypeById.get(edge.source) !== NODE_TYPES.phpCode
    ) {
      return edge
    }
    const n = clampOnDoneNumber((edge.data as CodeEdgeData).onDoneNumber)
    return {
      ...edge,
      sourceHandle: CODE_NODE_UNIFIED_SOURCE_HANDLE,
      data: {
        ...(edge.data as CodeEdgeData),
        edgeType: 'code',
        codeEdgeRole: 'snippet',
        onDoneNumber: n,
      } satisfies CodeEdgeData,
    }
  })
}

/** Map any legacy `t-*` inbound handle on JS / PHP targets to `code-in`. */
export function coerceJsPhpInboundTargetHandles(
  nodes: FunnelFlowNode[],
  edges: FunnelFlowEdge[],
): FunnelFlowEdge[] {
  const nodeTypeById = new Map(nodes.map((node) => [node.id, node.data.nodeType]))
  return edges.map((edge): FunnelFlowEdge => {
    const tgtType = nodeTypeById.get(edge.target)
    if (tgtType !== NODE_TYPES.jsCode && tgtType !== NODE_TYPES.phpCode) return edge
    if (edge.targetHandle === CODE_NODE_UNIFIED_TARGET_HANDLE) return edge
    return { ...edge, targetHandle: CODE_NODE_UNIFIED_TARGET_HANDLE }
  })
}
