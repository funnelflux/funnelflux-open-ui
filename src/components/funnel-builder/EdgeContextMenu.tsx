import { useEffect, useMemo, useRef } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { cn } from '@/lib/utils'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { Checkbox } from '@/components/ui-kit'
import { NODE_TYPES } from '@/types/funnel'
import { CODE_NODE_MAX_ON_DONE_EXITS } from '@/lib/codeNodeExits'
import {
  clampOnDoneNumber,
  firstFreeOnDoneSlot,
  usedOnDoneSlotsForJsPhpSource,
} from '@/lib/funnel-graph/codeEdgeSlots'
import {
  computeDisplayedWeights,
  formatWeight,
  getSiblingWeightedEdges,
  maxAllowedWeight,
  WEIGHT_EPSILON,
} from '@/lib/rotatorWeights'

interface EdgeContextMenuProps {
  edgeId: string | null
  position: { x: number; y: number } | null
  onClose: () => void
}

export function EdgeContextMenu({ edgeId, position, onClose }: EdgeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const edge = useFunnelEditorStore((s) =>
    edgeId ? s.edges.find((e) => e.id === edgeId) : undefined,
  )
  const allNodes = useFunnelEditorStore((s) => s.nodes)
  const allEdges = useFunnelEditorStore((s) => s.edges)

  useEffect(() => {
    if (!position) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [position, onClose])

  useEffect(() => {
    if (!position) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [position, onClose])

  // Weighted-edge derived state — siblings, displayed weight, allowed range.
  // Must be declared before any early return to satisfy rules of hooks.
  const weightInfo = useMemo(() => {
    if (!edge || !edgeId || edge.data?.edgeType !== 'weighted') return null
    const siblings = getSiblingWeightedEdges(allEdges, edge.source)
    const dist = computeDisplayedWeights(siblings)
    const entry = dist.byEdgeId.get(edgeId)
    return {
      displayed: entry?.weight ?? edge.data.weight ?? 0,
      isLocked: Boolean(edge.data.locked),
      max: maxAllowedWeight(siblings, edgeId),
      total: dist.total,
      allLocked: dist.allLocked,
      hasError: dist.allLocked && dist.errorDrift > WEIGHT_EPSILON,
      siblingCount: siblings.length,
    }
  }, [edge, edgeId, allEdges])

  if (!position || !edgeId || !edge) return null

  const data = edge.data
  const isWeighted = data?.edgeType === 'weighted'
  const isAction = data?.edgeType === 'action'
  const isCode = data?.edgeType === 'code'
  const sourceNode = allNodes.find((n) => n.id === edge.source)
  const codeRole =
    isCode ?
      (data.codeEdgeRole ?? (sourceNode?.data.nodeType === NODE_TYPES.visitorTag ? 'visitorTag' : 'snippet'))
    : 'snippet'
  const currentActionNumber = isAction ? data.actionNumber : 1
  const currentIsConversion = isAction ? data.isConversion ?? false : false
  const currentOnDoneNumber = isCode ? data.onDoneNumber ?? 1 : 1

  function handleDelete() {
    useFunnelEditorStore.getState().removeEdge(edgeId!)
    onClose()
  }

  function handleWeightChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!weightInfo) return
    const raw = parseFloat(e.target.value)
    const clamped = Number.isNaN(raw) ? 0 : Math.min(weightInfo.max, Math.max(0, raw))
    useFunnelEditorStore.getState().updateEdgeData(edgeId!, { weight: clamped, locked: true })
  }

  function handleResetAuto() {
    useFunnelEditorStore.getState().updateEdgeData(edgeId!, { weight: 0, locked: false })
  }

  function handleActionNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    const actionNumber = Number.isNaN(raw) ? 1 : Math.max(1, raw)
    useFunnelEditorStore.getState().updateEdgeData(edgeId!, { actionNumber })
  }

  function handleConversionToggle(checked: boolean) {
    useFunnelEditorStore.getState().updateEdgeData(edgeId!, { isConversion: checked })
  }

  function handleOnDoneNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!edge) return
    const raw = parseInt(e.target.value, 10)
    const requested = clampOnDoneNumber(Number.isNaN(raw) ? 1 : raw)
    const edgesWithoutSelf = allEdges.filter((candidate) => candidate.id !== edgeId)
    const sourceId = edge.source
    let onDoneNumber = requested

    // JS/PHP nodes must keep unique On Done slots across all outgoing code edges.
    if (sourceNode && (sourceNode.data.nodeType === NODE_TYPES.jsCode || sourceNode.data.nodeType === NODE_TYPES.phpCode)) {
      const used = usedOnDoneSlotsForJsPhpSource(sourceId, edgesWithoutSelf)
      if (used.has(onDoneNumber)) {
        const free = firstFreeOnDoneSlot(sourceId, edgesWithoutSelf)
        // No free slot means we cannot satisfy uniqueness for the requested value.
        // Keep the existing edge value instead of silently writing a duplicate.
        if (free === null) return
        onDoneNumber = free
      }
    }

    useFunnelEditorStore.getState().updateEdgeData(edgeId!, { onDoneNumber })
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-zinc-900 border rounded-md shadow-lg py-1 min-w-[200px] text-sm"
      style={{ left: position.x, top: position.y }}
    >
      {isWeighted && weightInfo && (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <label htmlFor="edge-weight" className="text-muted-foreground whitespace-nowrap">
              Weight
            </label>
            <input
              id="edge-weight"
              type="number"
              min={0}
              max={weightInfo.max}
              step={1}
              value={formatWeight(weightInfo.displayed)}
              onChange={handleWeightChange}
              className="w-16 rounded border bg-background px-2 py-0.5 text-sm text-right"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-muted-foreground">%</span>
            {weightInfo.isLocked ? (
              <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Locked</span>
            ) : (
              <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Auto</span>
            )}
          </div>
          {weightInfo.siblingCount > 1 && (
            <div
              className={cn(
                'px-3 pb-1.5 text-[11px]',
                weightInfo.hasError ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              Total: {formatWeight(weightInfo.total)}%
              {weightInfo.hasError && ' — must equal 100%'}
            </div>
          )}
          {weightInfo.isLocked && (
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 border-0 bg-transparent px-3 py-1.5 text-left text-sm',
                'cursor-pointer rounded-sm transition-colors',
                'hover:bg-muted dark:hover:bg-zinc-800',
              )}
              onClick={handleResetAuto}
            >
              <Icon name="rotate-ccw" size="md" />
              <span>Reset to auto</span>
            </button>
          )}
        </>
      )}

      {isAction && (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <label htmlFor="edge-action" className="text-muted-foreground whitespace-nowrap">
              Action #
            </label>
            <input
              id="edge-action"
              type="number"
              min={1}
              max={99}
              value={currentActionNumber}
              onChange={handleActionNumberChange}
              className="w-14 rounded border bg-background px-2 py-0.5 text-sm text-right"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Checkbox
              checked={currentIsConversion}
              onChange={(e) => handleConversionToggle(e.target.checked)}
            />
            <span className="text-muted-foreground text-xs">Is conversion</span>
          </div>
        </>
      )}

      {isCode && (
        <div className="flex items-center gap-2 px-3 py-1.5">
          <label htmlFor="edge-ondone" className="text-muted-foreground whitespace-nowrap">
            {codeRole === 'visitorTag' ? 'Tag route #' : 'On Done #'}
          </label>
          <input
            id="edge-ondone"
            type="number"
            min={1}
            max={CODE_NODE_MAX_ON_DONE_EXITS}
            value={currentOnDoneNumber}
            onChange={handleOnDoneNumberChange}
            className="w-14 rounded border bg-background px-2 py-0.5 text-sm text-right"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="-mx-0 my-1 h-px bg-muted" />

      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 border-0 bg-transparent px-3 py-1.5 text-left text-sm',
          'cursor-pointer rounded-sm transition-colors text-destructive',
          'hover:bg-muted dark:hover:bg-zinc-800',
        )}
        onClick={handleDelete}
      >
        <Icon name="trash-2" size="md" />
        <span>Delete Connection</span>
      </button>
    </div>
  )
}
