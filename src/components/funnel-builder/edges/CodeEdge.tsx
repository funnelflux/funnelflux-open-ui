import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { CodeEdgeData } from '@/types/funnel'
import { cn } from '@/lib/utils'
import { DraggableEdgeLabel } from './DraggableEdgeLabel'

type CodeEdge = Edge<CodeEdgeData, 'code'>

function CodeEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  data,
}: EdgeProps<CodeEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className="stroke-amber-600/55 dark:stroke-amber-400/50"
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
          'nodrag nopan absolute bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-2 text-xs',
          'pointer-events-auto',
          selected && 'ring-1 ring-yellow-400',
        )}
      >
        ON DONE
      </DraggableEdgeLabel>
    </>
  )
}

export const CodeEdge = memo(CodeEdgeComponent)
