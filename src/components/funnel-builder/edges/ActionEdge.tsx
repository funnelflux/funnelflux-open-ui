import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { ActionEdgeData } from '@/types/funnel'
import { cn } from '@/lib/utils'
import { DraggableEdgeLabel } from './DraggableEdgeLabel'

type ActionEdge = Edge<ActionEdgeData, 'action'>

function ActionEdgeComponent({
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
      <DraggableEdgeLabel
        edgeId={id}
        pathString={edgePath}
        labelLocation={data?.labelLocation}
        fallbackX={labelX}
        fallbackY={labelY}
        className={cn(
          'nodrag nopan absolute bg-primary-subtle text-primary border border-primary/20 rounded-full px-2 text-xs',
          'pointer-events-auto',
          selected && 'ring-1 ring-primary',
        )}
      >
        ACTION {actionNumber}
      </DraggableEdgeLabel>
    </>
  )
}

export const ActionEdge = memo(ActionEdgeComponent)
