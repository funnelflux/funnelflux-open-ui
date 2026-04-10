import { useEffect, useRef } from 'react'
import { Trash2, Pencil, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NODE_TYPES } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'

interface NodeContextMenuProps {
  nodeId: string | null
  position: { x: number; y: number } | null
  onClose: () => void
  onEditNode?: (nodeId: string) => void
  /** Legacy “Send Traffic Here” → funnel URL wizard */
  onSendTrafficHere?: (nodeId: string) => void
}

export function NodeContextMenu({
  nodeId,
  position,
  onClose,
  onEditNode,
  onSendTrafficHere,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const node = useFunnelEditorStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
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

  if (!position || !nodeId || !node) return null

  const nodeType = node.data.nodeType
  const isRoot = nodeType === NODE_TYPES.root
  const isPageNode = nodeType === NODE_TYPES.lander || nodeType === NODE_TYPES.offer

  function handleDelete() {
    useFunnelEditorStore.getState().removeNode(nodeId!)
    onClose()
  }

  function handleEditPage() {
    if (nodeId && onEditNode) onEditNode(nodeId)
    onClose()
  }

  function handleSendTrafficHere() {
    if (nodeId && onSendTrafficHere) onSendTrafficHere(nodeId)
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border rounded-md shadow-md py-1 min-w-[180px] text-sm"
      style={{ left: position.x, top: position.y }}
    >
      {onSendTrafficHere && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent"
          onClick={handleSendTrafficHere}
        >
          <Send className="h-4 w-4" />
          <span>Send Traffic Here</span>
        </div>
      )}

      {isPageNode && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent"
          onClick={handleEditPage}
        >
          <Pencil className="h-4 w-4" />
          <span>Edit Page</span>
        </div>
      )}

      {!isRoot && (
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent text-destructive',
          )}
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Node</span>
        </div>
      )}
    </div>
  )
}
