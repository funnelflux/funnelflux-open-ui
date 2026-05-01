import { SOURCE_HANDLE } from '@/lib/funnelEdgeGeometry'
import type { ConditionEdgeData, FunnelFlowEdge } from '@/types/funnel'

/** Infer YES/NO from which standard handle was used when `branch` is missing. */
export function conditionBranchFromSourceHandle(sourceHandle?: string | null): 'yes' | 'no' {
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

function conditionOutgoingBranches(
  source: string,
  edges: FunnelFlowEdge[],
): { yes: boolean; no: boolean } {
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
