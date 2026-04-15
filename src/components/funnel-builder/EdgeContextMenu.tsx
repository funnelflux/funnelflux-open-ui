import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { Checkbox } from '@/components/ui-kit'

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

  if (!position || !edgeId || !edge) return null

  const data = edge.data
  const isWeighted = data?.edgeType === 'weighted'
  const isAction = data?.edgeType === 'action'
  const isCode = data?.edgeType === 'code'
  const currentWeight = isWeighted ? data.weight : 100
  const currentActionNumber = isAction ? data.actionNumber : 1
  const currentIsConversion = isAction ? data.isConversion ?? false : false
  const currentOnDoneNumber = isCode ? data.onDoneNumber ?? 1 : 1

  function handleDelete() {
    useFunnelEditorStore.getState().removeEdge(edgeId!)
    onClose()
  }

  function handleWeightChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    const weight = Number.isNaN(raw) ? 0 : Math.min(100, Math.max(0, raw))
    useFunnelEditorStore.getState().updateEdgeData(edgeId!, { weight })
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
    const raw = parseInt(e.target.value, 10)
    const onDoneNumber = Number.isNaN(raw) ? 1 : Math.max(1, raw)
    useFunnelEditorStore.getState().updateEdgeData(edgeId!, { onDoneNumber })
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-zinc-900 border rounded-md shadow-lg py-1 min-w-[200px] text-sm"
      style={{ left: position.x, top: position.y }}
    >
      {isWeighted && (
        <div className="flex items-center gap-2 px-3 py-1.5">
          <label htmlFor="edge-weight" className="text-muted-foreground whitespace-nowrap">
            Weight
          </label>
          <input
            id="edge-weight"
            type="number"
            min={0}
            max={100}
            value={currentWeight}
            onChange={handleWeightChange}
            className="w-16 rounded border bg-background px-2 py-0.5 text-sm text-right"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-muted-foreground">%</span>
        </div>
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
            On Done #
          </label>
          <input
            id="edge-ondone"
            type="number"
            min={1}
            max={99}
            value={currentOnDoneNumber}
            onChange={handleOnDoneNumberChange}
            className="w-14 rounded border bg-background px-2 py-0.5 text-sm text-right"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="-mx-0 my-1 h-px bg-muted" />

      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent text-destructive',
        )}
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete Connection</span>
      </div>
    </div>
  )
}
