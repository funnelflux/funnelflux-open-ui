import { useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { computeOptimalHandles, mergeNodeMeasurements } from '@/lib/funnelEdgeGeometry'
import type { FunnelFlowEdge, FunnelFlowNode } from '@/types/funnel'

/**
 * Keeps edge source/target handles aligned with node positions so connections use
 * the best side of each node (inside <ReactFlow> so useReactFlow() is valid).
 */
export function EdgeHandleSync() {
  const nodes = useFunnelEditorStore((s) => s.nodes)
  const edges = useFunnelEditorStore((s) => s.edges)
  const setEdges = useFunnelEditorStore((s) => s.setEdges)
  const { getNodes } = useReactFlow()

  useEffect(() => {
    const rfNodes = getNodes() as FunnelFlowNode[]
    const enriched = mergeNodeMeasurements(nodes, rfNodes)
    const prev = useFunnelEditorStore.getState().edges

    let changed = false
    const next: FunnelFlowEdge[] = prev.map((edge) => {
      const { sourceHandle: sh, targetHandle: th } = computeOptimalHandles(enriched, edge)
      if (sh === edge.sourceHandle && th === edge.targetHandle) return edge
      changed = true
      return { ...edge, sourceHandle: sh ?? undefined, targetHandle: th ?? undefined }
    })

    if (changed) {
      setEdges(next, false)
    }
  }, [nodes, edges, getNodes, setEdges])

  return null
}
