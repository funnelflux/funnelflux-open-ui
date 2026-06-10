import type { Connection } from '@xyflow/react'
import {
  NODE_TYPES,
  type ConditionEdgeData,
  type FunnelFlowEdge,
  type FunnelFlowNode,
  type NodeTypeValue,
} from '@/types/funnel'
import { SOURCE_HANDLE } from '@/lib/funnelEdgeGeometry'
import {
  CODE_NODE_MAX_ON_DONE_EXITS,
  CODE_NODE_UNIFIED_SOURCE_HANDLE,
  CODE_NODE_UNIFIED_TARGET_HANDLE,
  isCodeNodeUnifiedSourceHandle,
  parseCodeExitHandleId,
} from '@/lib/codeNodeExits'
import {
  pickConditionBranchForNewConnection,
  sourceHandleForConditionBranch,
} from '@/lib/funnel-graph/conditionBranchPolicy'
import {
  firstFreeOnDoneSlot,
  usedOnDoneSlotsForJsPhpSource,
} from '@/lib/funnel-graph/codeEdgeSlots'

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

export function isValidConnection(
  connection: Connection,
  nodes: FunnelFlowNode[],
  edges: FunnelFlowEdge[],
): boolean {
  const { source, target, sourceHandle, targetHandle } = connection

  // Never complete a new link onto another node's outbound handle (see BaseNode stacked s-/t- handles).
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

  // Page nodes (lander/offer/external URL) sit downstream of logic like JS/PHP.
  if (
    (sourceNode.data.nodeType === NODE_TYPES.lander ||
      sourceNode.data.nodeType === NODE_TYPES.offer ||
      sourceNode.data.nodeType === NODE_TYPES.externalUrl) &&
    (targetNode.data.nodeType === NODE_TYPES.jsCode || targetNode.data.nodeType === NODE_TYPES.phpCode)
  ) {
    return false
  }

  // JS/PHP inbound: invisible `code-in` strip or visible egress dot (`code-out`); store normalizes to `code-in`.
  if (targetNode.data.nodeType === NODE_TYPES.jsCode || targetNode.data.nodeType === NODE_TYPES.phpCode) {
    if (typeof targetHandle === 'string' && targetHandle.length > 0) {
      const ok =
        targetHandle === CODE_NODE_UNIFIED_TARGET_HANDLE ||
        targetHandle === CODE_NODE_UNIFIED_SOURCE_HANDLE
      if (!ok) return false
    }
  }

  // Visitor-tag nodes: at most one outbound connection.
  if (
    sourceNode.data.nodeType === NODE_TYPES.visitorTag &&
    visitorTagOutboundEdgeCount(source, edges) >= 1
  ) {
    return false
  }

  // Condition nodes: branch is chosen automatically.
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
      (e) =>
        e.source === source &&
        e.data?.edgeType === 'condition' &&
        (e.data as ConditionEdgeData).branch === branch,
    )
    if (existingFromBranch) return false

    // Cannot create duplicate connections (same source + target + canonical source handle)
    const isDuplicate = edges.some(
      (e) =>
        e.source === source &&
        e.target === target &&
        e.sourceHandle === canonicalSourceHandle,
    )
    if (isDuplicate) return false
    return true
  }

  // Javascript/PHP: one outbound "On Done" route per edge (max 64), single visible handle (`code-out`)
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
