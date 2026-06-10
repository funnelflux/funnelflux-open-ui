import { CODE_NODE_MAX_ON_DONE_EXITS } from '@/lib/codeNodeExits'
import type { CodeEdgeData, FunnelFlowEdge } from '@/types/funnel'

export function clampOnDoneNumber(raw: unknown): number {
  const n = Number(raw ?? 1)
  return Math.min(
    CODE_NODE_MAX_ON_DONE_EXITS,
    Math.max(1, Math.floor(Number.isFinite(n) ? n : 1)),
  )
}

export function usedOnDoneSlotsForJsPhpSource(
  sourceId: string,
  edges: FunnelFlowEdge[],
): Set<number> {
  const used = new Set<number>()
  for (const edge of edges) {
    if (edge.source !== sourceId) continue
    if (edge.data?.edgeType !== 'code') continue
    used.add(clampOnDoneNumber((edge.data as CodeEdgeData).onDoneNumber))
  }
  return used
}

export function firstFreeOnDoneSlot(
  sourceId: string,
  edges: FunnelFlowEdge[],
): number | null {
  const used = usedOnDoneSlotsForJsPhpSource(sourceId, edges)
  for (let idx = 1; idx <= CODE_NODE_MAX_ON_DONE_EXITS; idx++) {
    if (!used.has(idx)) return idx
  }
  return null
}
