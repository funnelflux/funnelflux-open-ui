import { NODE_TYPES } from '@/types/funnel'
import type { ConditionEdgeData, FunnelFlowEdge, FunnelFlowNode } from '@/types/funnel'
import {
  CODE_NODE_UNIFIED_SOURCE_HANDLE,
  CODE_NODE_UNIFIED_TARGET_HANDLE,
} from '@/lib/codeNodeExits'
import { conditionBranchFromSourceHandle } from '@/lib/funnel-graph/conditionBranchPolicy'

/** Must match Handle `id` values on `BaseNode` */
export const SOURCE_HANDLE = {
  top: 's-top',
  right: 's-right',
  bottom: 's-bottom',
  left: 's-left',
} as const

export const TARGET_HANDLE = {
  top: 't-top',
  right: 't-right',
  bottom: 't-bottom',
  left: 't-left',
} as const

export const DEFAULT_NODE_WIDTH = 220
export const DEFAULT_NODE_HEIGHT = 112

function nodeSize(n: FunnelFlowNode): { w: number; h: number } {
  const w = n.width ?? (n as { measured?: { width?: number } }).measured?.width ?? DEFAULT_NODE_WIDTH
  const h = n.height ?? (n as { measured?: { height?: number } }).measured?.height ?? DEFAULT_NODE_HEIGHT
  return { w, h }
}

function center(n: FunnelFlowNode): { x: number; y: number } {
  const { w, h } = nodeSize(n)
  return { x: n.position.x + w / 2, y: n.position.y + h / 2 }
}

/**
 * Pick source/target handle ids so edges leave/enter on the side facing the other node.
 *
 * Condition nodes still render the standard 4 source handles, but each outgoing condition edge
 * is classified into YES/NO via `edge.data.branch`. YES uses `s-right`/`s-top`, NO uses `s-left`/`s-bottom`.
 */
export function computeOptimalHandles(
  nodes: FunnelFlowNode[],
  edge: FunnelFlowEdge,
): { sourceHandle: string | null; targetHandle: string | null } {
  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)
  if (!sourceNode || !targetNode) {
    return {
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    }
  }

  const s = center(sourceNode)
  const t = center(targetNode)
  const dx = t.x - s.x
  const dy = t.y - s.y

  let sourceHandle: string | null

  if (
    edge.data?.edgeType === 'code' &&
    (sourceNode.data.nodeType === NODE_TYPES.jsCode || sourceNode.data.nodeType === NODE_TYPES.phpCode)
  ) {
    sourceHandle = CODE_NODE_UNIFIED_SOURCE_HANDLE
  } else if (sourceNode.data.nodeType === NODE_TYPES.condition) {
    const data = edge.data
    const branch: 'yes' | 'no' =
      data?.edgeType === 'condition'
        ? ((data as ConditionEdgeData).branch ?? conditionBranchFromSourceHandle(edge.sourceHandle))
        : conditionBranchFromSourceHandle(edge.sourceHandle)

    const yesPreferred = Math.abs(dx) >= Math.abs(dy) ? SOURCE_HANDLE.right : SOURCE_HANDLE.top
    const noPreferred = Math.abs(dx) >= Math.abs(dy) ? SOURCE_HANDLE.left : SOURCE_HANDLE.bottom

    const desired = branch === 'yes' ? yesPreferred : noPreferred
    const alt =
      branch === 'yes'
        ? yesPreferred === SOURCE_HANDLE.right
          ? SOURCE_HANDLE.top
          : SOURCE_HANDLE.right
        : noPreferred === SOURCE_HANDLE.left
          ? SOURCE_HANDLE.bottom
          : SOURCE_HANDLE.left

    const sh = edge.sourceHandle
    const isValid = sh === desired || sh === alt
    sourceHandle = isValid ? sh : desired
  } else {
    if (Math.abs(dx) >= Math.abs(dy)) {
      sourceHandle = dx >= 0 ? SOURCE_HANDLE.right : SOURCE_HANDLE.left
    } else {
      sourceHandle = dy >= 0 ? SOURCE_HANDLE.bottom : SOURCE_HANDLE.top
    }
  }

  // Target: enter from the side that faces the source (except JS/PHP use a single `code-in`).
  const vx = s.x - t.x
  const vy = s.y - t.y
  let targetHandle: string | null
  if (targetNode.data.nodeType === NODE_TYPES.jsCode || targetNode.data.nodeType === NODE_TYPES.phpCode) {
    targetHandle = CODE_NODE_UNIFIED_TARGET_HANDLE
  } else if (Math.abs(vx) >= Math.abs(vy)) {
    targetHandle = vx >= 0 ? TARGET_HANDLE.right : TARGET_HANDLE.left
  } else {
    targetHandle = vy >= 0 ? TARGET_HANDLE.bottom : TARGET_HANDLE.top
  }

  return { sourceHandle, targetHandle }
}

export function mergeNodeMeasurements(
  storeNodes: FunnelFlowNode[],
  rfNodes: FunnelFlowNode[],
): FunnelFlowNode[] {
  return storeNodes.map((n) => {
    const r = rfNodes.find((x) => x.id === n.id)
    if (!r) return n
    const w = r.width ?? (r as { measured?: { width?: number } }).measured?.width
    const h = r.height ?? (r as { measured?: { height?: number } }).measured?.height
    if (w == null && h == null) return n
    return {
      ...n,
      ...(w != null ? { width: w } : {}),
      ...(h != null ? { height: h } : {}),
    } as FunnelFlowNode
  })
}
