import { memo, useMemo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { WeightedEdgeData } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import {
  computeDisplayedWeights,
  formatWeight,
  getSiblingWeightedEdges,
  WEIGHT_EPSILON,
} from '@/lib/rotatorWeights'
import { cn } from '@/lib/utils'
import { DraggableEdgeLabel } from './DraggableEdgeLabel'

type WeightedEdge = Edge<WeightedEdgeData, 'weighted'>

function WeightedEdgeComponent({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}: EdgeProps<WeightedEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const allEdges = useFunnelEditorStore((s) => s.edges)

  const { displayed, locked, hasError } = useMemo(() => {
    const siblings = getSiblingWeightedEdges(allEdges, source)
    const dist = computeDisplayedWeights(siblings)
    const entry = dist.byEdgeId.get(id)
    return {
      displayed: entry?.weight ?? data?.weight ?? 0,
      locked: entry?.locked ?? Boolean(data?.locked),
      hasError: dist.allLocked && dist.errorDrift > WEIGHT_EPSILON,
    }
  }, [allEdges, source, id, data?.weight, data?.locked])

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className="stroke-muted-foreground/75"
        style={{
          ...style,
          strokeWidth: selected ? 2.75 : 2,
        }}
      />
      <DraggableEdgeLabel
        edgeId={id}
        pathString={edgePath}
        labelLocation={data?.labelLocation}
        fallbackX={labelX}
        fallbackY={labelY}
        className={cn(
          'nodrag nopan absolute bg-background border rounded-full px-2 text-xs',
          'pointer-events-auto',
          selected && 'border-primary',
          hasError && 'border-destructive text-destructive',
          locked && 'font-semibold',
        )}
      >
        {formatWeight(displayed)}%{locked && !hasError ? '*' : ''}
      </DraggableEdgeLabel>
    </>
  )
}

export const WeightedEdge = memo(WeightedEdgeComponent)
