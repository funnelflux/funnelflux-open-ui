import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { useFunnelEditorStore } from '@/store/funnelEditor'

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

  // Close on outside click
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

  // Close on Escape
  useEffect(() => {
    if (!position) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [position, onClose])

  if (!position || !edgeId || !edge) return null

  const isWeighted = edge.data?.edgeType === 'weighted'
  const currentWeight = isWeighted && edge.data?.edgeType === 'weighted' ? edge.data.weight : 100

  function handleDelete() {
    useFunnelEditorStore.getState().removeEdge(edgeId!)
    onClose()
  }

  function handleWeightChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    const weight = Number.isNaN(raw) ? 0 : Math.min(100, Math.max(0, raw))
    useFunnelEditorStore.getState().updateEdgeData(edgeId!, { weight })
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border rounded-md shadow-md py-1 min-w-[180px] text-sm"
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
        </div>
      )}

      <div
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent text-destructive"
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete Connection</span>
      </div>
    </div>
  )
}
