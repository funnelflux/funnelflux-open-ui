import { memo, useCallback } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { ConditionEdgeData, FunnelFlowEdge } from '@/types/funnel'
import { cn } from '@/lib/utils'
import { DraggableEdgeLabel } from './DraggableEdgeLabel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { sourceHandleForConditionBranch } from '../validation'

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

  const handleLabelClick = useCallback(() => {
    useFunnelEditorStore.setState((s) => {
      const self = s.edges.find((e) => e.id === id) as FunnelFlowEdge | undefined
      if (!self || self.data?.edgeType !== 'condition') return {}

      const cur = (self.data as ConditionEdgeData).branch ?? 'yes'
      const opp: 'yes' | 'no' = cur === 'yes' ? 'no' : 'yes'

      const sibling = s.edges.find(
        (e) =>
          e.id !== self.id &&
          e.source === self.source &&
          e.data?.edgeType === 'condition' &&
          (e.data as ConditionEdgeData).branch === opp,
      ) as FunnelFlowEdge | undefined

      if (!sibling) {
        const next: FunnelFlowEdge[] = s.edges.map((e) => {
          if (e.id !== self.id) return e
          return {
            ...e,
            sourceHandle: sourceHandleForConditionBranch(opp),
            data: { ...(e.data as ConditionEdgeData), branch: opp },
          }
        })
        return { edges: next, isDirty: true }
      }

      const next: FunnelFlowEdge[] = s.edges.map((e) => {
        if (e.id === self.id) {
          return {
            ...e,
            target: sibling.target,
            targetHandle: sibling.targetHandle,
            sourceHandle: sourceHandleForConditionBranch(cur),
            data: { ...(e.data as ConditionEdgeData), branch: cur },
          }
        }
        if (e.id === sibling.id) {
          return {
            ...e,
            target: self.target,
            targetHandle: self.targetHandle,
            sourceHandle: sourceHandleForConditionBranch(opp),
            data: { ...(e.data as ConditionEdgeData), branch: opp },
          }
        }
        return e
      })

      return { edges: next, isDirty: true }
    })
  }, [id])

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
        onLabelClick={handleLabelClick}
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
