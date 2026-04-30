import type { Connection } from '@xyflow/react'
import {
  NODE_TYPES,
  type NodeTypeValue,
  type FunnelFlowNode,
  type FunnelFlowEdge,
  type FunnelEdgeData,
  type WeightedEdgeData,
  type ActionEdgeData,
  type ConditionEdgeData,
  type CodeEdgeData,
} from '@/types/funnel'
import { SOURCE_HANDLE } from '@/lib/funnelEdgeGeometry'
import {
  CODE_NODE_MAX_ON_DONE_EXITS,
  CODE_NODE_UNIFIED_SOURCE_HANDLE,
  CODE_NODE_UNIFIED_TARGET_HANDLE,
  isCodeNodeUnifiedSourceHandle,
  parseCodeExitHandleId,
} from '@/lib/codeNodeExits'

/** Matches legacy MVC funnel UI when a visitor-tag node gains more than one exit. */
export const VISITOR_TAG_MAX_EXIT_CONNECTION_MESSAGE =
  'The maximum number of exit connections from this node has been reached'

function visitorTagOutboundEdgeCount(visitorTagSourceId: string, edges: FunnelFlowEdge[]): number {
  let count = 0
  for (const outgoing of edges) {
    if (outgoing.source === visitorTagSourceId) count++
  }
  return count
}

export function visitorTagRejectedExtraExit(
  sourceNodeType: NodeTypeValue | undefined,
  sourceNodeId: string,
  edges: FunnelFlowEdge[],
): boolean {
  if (sourceNodeType !== NODE_TYPES.visitorTag) return false
  return visitorTagOutboundEdgeCount(sourceNodeId, edges) >= 1
}

function clampOnDoneNumber(raw: unknown): number {
  const n = Number(raw ?? 1)
  return Math.min(
    CODE_NODE_MAX_ON_DONE_EXITS,
    Math.max(1, Math.floor(Number.isFinite(n) ? n : 1)),
  )
}

function usedOnDoneSlotsForJsPhpSource(sourceId: string, edges: FunnelFlowEdge[]): Set<number> {
  const used = new Set<number>()
  for (const edge of edges) {
    if (edge.source !== sourceId) continue
    if (edge.data?.edgeType !== 'code') continue
    used.add(clampOnDoneNumber((edge.data as CodeEdgeData).onDoneNumber))
  }
  return used
}

function firstFreeOnDoneSlot(sourceId: string, edges: FunnelFlowEdge[]): number | null {
  const used = usedOnDoneSlotsForJsPhpSource(sourceId, edges)
  for (let idx = 1; idx <= CODE_NODE_MAX_ON_DONE_EXITS; idx++) {
    if (!used.has(idx)) return idx
  }
  return null
}

/** Convert legacy/incorrect outbound edges into code-path edges (shows “On done”). */
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
    if (nodeTypeById.get(edge.source) !== NODE_TYPES.jsCode && nodeTypeById.get(edge.source) !== NODE_TYPES.phpCode) {
      return edge
    }
    const n = clampOnDoneNumber((edge.data as CodeEdgeData).onDoneNumber)
    return {
      ...edge,
      sourceHandle: CODE_NODE_UNIFIED_SOURCE_HANDLE,
      data: {
        ...(edge.data as CodeEdgeData),
        edgeType: 'code',
        onDoneNumber: n,
      } satisfies CodeEdgeData,
    }
  })
}

/** Map any legacy `t-*` inbound handle on JS / PHP targets to {@link CODE_NODE_UNIFIED_TARGET_HANDLE}. */
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

/** Infer YES/NO from which standard handle was used when `branch` is missing. */
function conditionBranchFromSourceHandle(sourceHandle?: string | null): 'yes' | 'no' {
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
  const { source, target, sourceHandle, targetHandle } = connection

  // Never complete a new link onto another node's *outbound* handle (see BaseNode stacked s-/t- handles).
  if (typeof targetHandle === 'string' && targetHandle.startsWith('s-')) {
    return false
  }

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

  // Page nodes (lander/offer/external URL) sit downstream of logic like JS/PHP. Connecting
  // Page → code creates a bogus outgoing “action” edge when stacked handles pick the wrong drop target.
  if (
    (sourceNode.data.nodeType === NODE_TYPES.lander ||
      sourceNode.data.nodeType === NODE_TYPES.offer ||
      sourceNode.data.nodeType === NODE_TYPES.externalUrl) &&
    (targetNode.data.nodeType === NODE_TYPES.jsCode || targetNode.data.nodeType === NODE_TYPES.phpCode)
  ) {
    return false
  }

  // JS/PHP inbound: invisible `code-in` strip or the visible egress dot (`code-out`); store normalizes to `code-in`.
  if (targetNode.data.nodeType === NODE_TYPES.jsCode || targetNode.data.nodeType === NODE_TYPES.phpCode) {
    if (typeof targetHandle === 'string' && targetHandle.length > 0) {
      const ok =
        targetHandle === CODE_NODE_UNIFIED_TARGET_HANDLE ||
        targetHandle === CODE_NODE_UNIFIED_SOURCE_HANDLE
      if (!ok) return false
    }
  }

  // Visitor-tag nodes: at most one outbound connection (same rule as legacy MVC + tracking)
  if (
    sourceNode.data.nodeType === NODE_TYPES.visitorTag &&
    visitorTagOutboundEdgeCount(source, edges) >= 1
  ) {
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

  // Javascript / PHP: one outbound “On Done” route per edge (max 64), single visible handle (`code-out`)
  if (sourceNode.data.nodeType === NODE_TYPES.jsCode || sourceNode.data.nodeType === NODE_TYPES.phpCode) {
    const unified = isCodeNodeUnifiedSourceHandle(sourceHandle)
    const legacySlot = parseCodeExitHandleId(sourceHandle)
    if (!unified && legacySlot === null) return false

    const outbound = edges.filter((e) => e.source === source)
    if (outbound.length >= CODE_NODE_MAX_ON_DONE_EXITS) return false
    if (firstFreeOnDoneSlot(source, edges) === null) return false

    if (legacySlot !== null) {
      const used = usedOnDoneSlotsForJsPhpSource(source, edges)
      if (used.has(legacySlot)) return false
    }

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
      const fromGrab = parseCodeExitHandleId(sourceHandle)
      const used = edges ? usedOnDoneSlotsForJsPhpSource(sourceNode.id, edges) : new Set<number>()
      const free = edges ? firstFreeOnDoneSlot(sourceNode.id, edges) : 1
      const n =
        fromGrab != null && !used.has(fromGrab) ?
          fromGrab
        : (free ?? CODE_NODE_MAX_ON_DONE_EXITS)
      return { edgeType: 'code', onDoneNumber: clampOnDoneNumber(n) } satisfies CodeEdgeData
    }

    case NODE_TYPES.visitorTag:
      return { edgeType: 'code', onDoneNumber: 1 } satisfies CodeEdgeData

    default: {
      // New rotator edges default to unlocked so they auto-share with siblings (e.g. 50/50, 33/33/33).
      return { edgeType: 'weighted', weight: 0, locked: false } satisfies WeightedEdgeData
    }
  }
}
