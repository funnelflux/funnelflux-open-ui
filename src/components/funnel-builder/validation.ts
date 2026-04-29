import type { Connection } from '@xyflow/react'
import {
  NODE_TYPES,
  type FunnelFlowNode,
  type FunnelFlowEdge,
  type FunnelEdgeData,
  type WeightedEdgeData,
  type ActionEdgeData,
  type ConditionEdgeData,
  type CodeEdgeData,
} from '@/types/funnel'

export function isValidConnection(
  connection: Connection,
  nodes: FunnelFlowNode[],
  edges: FunnelFlowEdge[],
): boolean {
  const { source, target, sourceHandle } = connection

  // Cannot connect a node to itself
  if (source === target) {
    return false
  }

  const targetNode = nodes.find((n) => n.id === target)
  const sourceNode = nodes.find((n) => n.id === source)

  if (!targetNode || !sourceNode) {
    return false
  }

  // Root nodes cannot be targets (no incoming connections)
  if (targetNode.data.nodeType === NODE_TYPES.root) {
    return false
  }

  // Condition nodes: source handle must be "yes" or "no"
  if (sourceNode.data.nodeType === NODE_TYPES.condition) {
    if (sourceHandle !== 'yes' && sourceHandle !== 'no') {
      return false
    }

    // Each condition handle can only have one outgoing connection
    const existingFromHandle = edges.some(
      (e) => e.source === source && e.sourceHandle === sourceHandle,
    )
    if (existingFromHandle) {
      return false
    }
  }

  // Cannot create duplicate connections (same source + target + sourceHandle)
  const isDuplicate = edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      e.sourceHandle === (sourceHandle ?? null),
  )
  if (isDuplicate) {
    return false
  }

  return true
}

export function getDefaultEdgeData(
  sourceNode: FunnelFlowNode,
  sourceHandle?: string | null,
  edges?: FunnelFlowEdge[],
): FunnelEdgeData {
  const nodeType = sourceNode.data.nodeType

  switch (nodeType) {
    case NODE_TYPES.root:
    case NODE_TYPES.rotator: {
      // New rotator edges default to unlocked so they auto-share with siblings (e.g. 50/50, 33/33/33).
      return { edgeType: 'weighted', weight: 0, locked: false } satisfies WeightedEdgeData
    }

    case NODE_TYPES.lander:
    case NODE_TYPES.offer: {
      // Determine next action number by counting existing action edges from this node
      const existingActions = edges
        ? edges.filter(
            (e) =>
              e.source === sourceNode.id &&
              e.data?.edgeType === 'action',
          ).length
        : 0
      return {
        edgeType: 'action',
        actionNumber: existingActions + 1,
      } satisfies ActionEdgeData
    }

    case NODE_TYPES.condition: {
      const branch = sourceHandle === 'no' ? 'no' : 'yes'
      return { edgeType: 'condition', branch } satisfies ConditionEdgeData
    }

    case NODE_TYPES.jsCode:
    case NODE_TYPES.phpCode: {
      return { edgeType: 'code' } satisfies CodeEdgeData
    }

    default: {
      // New rotator edges default to unlocked so they auto-share with siblings (e.g. 50/50, 33/33/33).
      return { edgeType: 'weighted', weight: 0, locked: false } satisfies WeightedEdgeData
    }
  }
}
