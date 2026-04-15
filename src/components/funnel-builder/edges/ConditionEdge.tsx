import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { ConditionEdgeData } from '@/types/funnel'
import { cn } from '@/lib/utils'
import { DraggableEdgeLabel } from './DraggableEdgeLabel'

type ConditionEdge = Edge<ConditionEdgeData, 'condition'>

function ConditionEdgeComponent({
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
}: EdgeProps<ConditionEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const branch = data?.branch ?? 'yes'
  const isYes = branch === 'yes'

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className={isYes ? 'stroke-emerald-600/80 dark:stroke-emerald-400/75' : 'stroke-red-600/80 dark:stroke-red-400/75'}
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
          'nodrag nopan absolute rounded-full px-2 text-xs font-medium border',
          'pointer-events-auto',
          isYes
            ? 'bg-success/10 text-success border-success/20'
            : 'bg-error/10 text-error border-error/20',
          selected && (isYes ? 'ring-1 ring-success' : 'ring-1 ring-error'),
        )}
      >
        {isYes ? 'YES' : 'NO'}
      </DraggableEdgeLabel>
    </>
  )
}

export const ConditionEdge = memo(ConditionEdgeComponent)
