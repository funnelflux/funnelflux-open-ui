import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { WeightedEdgeData } from '@/types/funnel'
import { cn } from '@/lib/utils'

type WeightedEdge = Edge<WeightedEdgeData, 'weighted'>

function WeightedEdgeComponent({
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
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={cn(
            'nodrag nopan absolute bg-background border rounded-full px-2 text-xs',
            'pointer-events-auto',
            selected && 'border-primary',
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {weight}%
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const WeightedEdge = memo(WeightedEdgeComponent)
