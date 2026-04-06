import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { ConditionEdgeData } from '@/types/funnel'
import { cn } from '@/lib/utils'

type ConditionEdge = Edge<ConditionEdgeData, 'condition'>

function ConditionEdgeComponent({
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
      <EdgeLabelRenderer>
        <div
          className={cn(
            'nodrag nopan absolute rounded-full px-2 text-xs font-medium border',
            'pointer-events-auto',
            isYes
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200',
            selected && (isYes ? 'ring-1 ring-green-400' : 'ring-1 ring-red-400'),
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          {isYes ? 'YES' : 'NO'}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const ConditionEdge = memo(ConditionEdgeComponent)
