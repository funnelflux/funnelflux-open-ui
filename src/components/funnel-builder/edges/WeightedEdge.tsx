import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { WeightedEdgeData } from '@/types/funnel'
import { cn } from '@/lib/utils'
import { DraggableEdgeLabel } from './DraggableEdgeLabel'

type WeightedEdge = Edge<WeightedEdgeData, 'weighted'>

function WeightedEdgeComponent({
  id,
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

  const weight = data?.weight ?? 100

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
        )}
      >
        {weight}%
      </DraggableEdgeLabel>
    </>
  )
}

export const WeightedEdge = memo(WeightedEdgeComponent)
