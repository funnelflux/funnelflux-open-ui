import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { ActionEdgeData } from '@/types/funnel'
import { cn } from '@/lib/utils'

type ActionEdge = Edge<ActionEdgeData, 'action'>

function ActionEdgeComponent({
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
}: EdgeProps<ActionEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const actionNumber = data?.actionNumber ?? 1

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className="stroke-primary/65"
        style={{
          ...style,
          strokeWidth: selected ? 2.75 : 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={cn(
            'nodrag nopan absolute bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 text-xs',
            'pointer-events-auto',
            selected && 'ring-1 ring-blue-400',
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          ACTION {actionNumber}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const ActionEdge = memo(ActionEdgeComponent)
