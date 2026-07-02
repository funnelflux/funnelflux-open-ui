import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { EdgeLabelRenderer, useReactFlow } from '@xyflow/react'
import { useFunnelEditorStore } from '@/store/funnelEditor'

function getPointOnPath(pathString: string, t: number): { x: number; y: number } {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathString)
  const totalLength = path.getTotalLength()
  const clampedT = Math.max(0, Math.min(1, t))
  const point = path.getPointAtLength(clampedT * totalLength)
  return { x: point.x, y: point.y }
}

function findClosestT(pathString: string, targetX: number, targetY: number): number {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathString)
  const totalLength = path.getTotalLength()

  let minDist = Infinity
  let bestT = 0.5
  const coarseSteps = 60
  for (let i = 0; i <= coarseSteps; i++) {
    const t = i / coarseSteps
    const point = path.getPointAtLength(t * totalLength)
    const dist = (point.x - targetX) ** 2 + (point.y - targetY) ** 2
    if (dist < minDist) {
      minDist = dist
      bestT = t
    }
  }

  const lo = Math.max(0, bestT - 1 / coarseSteps)
  const hi = Math.min(1, bestT + 1 / coarseSteps)
  const fineSteps = 30
  for (let i = 0; i <= fineSteps; i++) {
    const t = lo + ((hi - lo) * i) / fineSteps
    const point = path.getPointAtLength(t * totalLength)
    const dist = (point.x - targetX) ** 2 + (point.y - targetY) ** 2
    if (dist < minDist) {
      minDist = dist
      bestT = t
    }
  }

  return Math.round(bestT * 100) / 100
}

interface DraggableEdgeLabelProps {
  edgeId: string
  pathString: string
  labelLocation?: number
  /** Fallback position from getBezierPath (used when labelLocation is undefined) */
  fallbackX: number
  fallbackY: number
  className?: string
  children: ReactNode
  /** Fires on mouseup when the interaction was a click (not a drag-reposition). */
  onLabelClick?: (event: MouseEvent) => void
}

export function DraggableEdgeLabel({
  edgeId,
  pathString,
  labelLocation,
  fallbackX,
  fallbackY,
  className,
  children,
  onLabelClick,
}: DraggableEdgeLabelProps) {
  const { screenToFlowPosition } = useReactFlow()
  const isDragging = useRef(false)
  const dragArmed = useRef(false)
  const startClient = useRef<{ x: number; y: number } | null>(null)

  // Derived position — recomputed only when the path/anchor inputs change.
  // No effect/setState round-trip: that doubled renders per frame during drags.
  const derivedPosition = useMemo(() => {
    if (labelLocation != null && pathString) {
      return getPointOnPath(pathString, labelLocation)
    }
    return { x: fallbackX, y: fallbackY }
  }, [pathString, labelLocation, fallbackX, fallbackY])

  // Local override only while actively dragging; null otherwise so the
  // store-backed `labelLocation` stays the source of truth.
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)

  const position = dragPosition ?? derivedPosition

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()
      isDragging.current = true
      dragArmed.current = Boolean(onLabelClick)
      startClient.current = { x: e.clientX, y: e.clientY }

      const onMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return
        if (dragArmed.current && startClient.current) {
          const dx = moveEvent.clientX - startClient.current.x
          const dy = moveEvent.clientY - startClient.current.y
          if (dx * dx + dy * dy > 6 * 6) {
            dragArmed.current = false
          }
        }
        const flowPos = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY })
        const newT = findClosestT(pathString, flowPos.x, flowPos.y)
        setDragPosition(getPointOnPath(pathString, newT))
      }

      const onUp = (upEvent: MouseEvent) => {
        if (!isDragging.current) return
        isDragging.current = false
        const flowPos = screenToFlowPosition({ x: upEvent.clientX, y: upEvent.clientY })
        const newT = findClosestT(pathString, flowPos.x, flowPos.y)
        // Persist the new location and drop the drag override in the same batch —
        // the derived position recomputes from the updated `labelLocation` prop.
        useFunnelEditorStore.getState().updateEdgeData(edgeId, { labelLocation: newT })
        setDragPosition(null)

        if (dragArmed.current && startClient.current && onLabelClick) {
          const dx = upEvent.clientX - startClient.current.x
          const dy = upEvent.clientY - startClient.current.y
          if (dx * dx + dy * dy <= 6 * 6) {
            onLabelClick(upEvent)
          }
        }

        dragArmed.current = false
        startClient.current = null
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [edgeId, onLabelClick, pathString, screenToFlowPosition],
  )

  return (
    <EdgeLabelRenderer>
      <div
        className={className}
        style={{
          transform: `translate(-50%, -50%) translate(${position.x}px,${position.y}px)`,
          cursor: 'grab',
        }}
        role="button"
        tabIndex={0}
        aria-label="Drag edge label"
        onMouseDown={handleMouseDown}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
          }
        }}
      >
        {children}
      </div>
    </EdgeLabelRenderer>
  )
}
