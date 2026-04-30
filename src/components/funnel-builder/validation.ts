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
import { SOURCE_HANDLE } from '@/lib/funnelEdgeGeometry'

export function conditionBranchFromSourceHandle(sourceHandle: string | null | undefined): 'yes' | 'no' {
  // Condition nodes have exactly two logical routes. With standard 4 handles:
  // - top/right => YES
  // - left/bottom => NO
  switch (sourceHandle) {
    case SOURCE_HANDLE.left:
    case SOURCE_HANDLE.bottom:
      return 'no'
    case SOURCE_HANDLE.top:
    case SOURCE_HANDLE.right:
    default:
      return 'yes'
  }
}

export function sourceHandleForConditionBranch(branch: 'yes' | 'no'): string {
  return branch === 'yes' ? SOURCE_HANDLE.right : SOURCE_HANDLE.left
}

function conditionOutgoingBranches(source: string, edges: FunnelFlowEdge[]): { yes: boolean; no: boolean } {
  let yes = false
  let no = false
  for (const e of edges) {
    if (e.source !== source) continue
    if (e.data?.edgeType !== 'condition') continue
    const b = (e.data as ConditionEdgeData).branch
    if (b === 'yes') yes = true
    if (b === 'no') no = true
  }
  return { yes, no }
}

/**
 * When drawing a new edge from a condition node, the logical branch is chosen from existing outgoing
 * condition edges (not from which physical handle was grabbed):
 * - If NO outgoing condition branch exists yet, use YES.
 * - Else if YES exists but NO does not, use NO.
 * - Else if NO exists but YES does not, use YES.
 * - Else both exist: disallow a third outgoing condition edge (swap branches via edge label clicks).
 */
export function pickConditionBranchForNewConnection(
  source: string,
  edges: FunnelFlowEdge[],
): 'yes' | 'no' | null {
  const { yes, no } = conditionOutgoingBranches(source, edges)

  if (!yes && !no) return 'yes'
  if (yes && !no) return 'no'
  if (!yes && no) return 'yes'
  return null
}

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

  // Condition nodes: branch is chosen automatically (see `pickConditionBranchForNewConnection`)
  if (sourceNode.data.nodeType === NODE_TYPES.condition) {
    const allowed = new Set<string>([
      SOURCE_HANDLE.top,
      SOURCE_HANDLE.right,
      SOURCE_HANDLE.bottom,
      SOURCE_HANDLE.left,
    ])
    if (!sourceHandle || !allowed.has(sourceHandle)) return false

    const branch = pickConditionBranchForNewConnection(source, edges)
    if (!branch) return false

    const canonicalSourceHandle = sourceHandleForConditionBranch(branch)
    const existingFromBranch = edges.some(
      (e) => e.source === source && e.data?.edgeType === 'condition' && (e.data as ConditionEdgeData).branch === branch,
    )
    if (existingFromBranch) return false

    // Cannot create duplicate connections (same source + target + canonical source handle)
    const isDuplicate = edges.some(
      (e) => e.source === source && e.target === target && e.sourceHandle === canonicalSourceHandle,
    )
    if (isDuplicate) return false
    return true
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
  opts?: { conditionBranch?: 'yes' | 'no' },
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
      const branch =
        opts?.conditionBranch ??
        (edges ? pickConditionBranchForNewConnection(sourceNode.id, edges) : null) ??
        conditionBranchFromSourceHandle(sourceHandle)
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
