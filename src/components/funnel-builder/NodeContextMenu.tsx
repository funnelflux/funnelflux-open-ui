import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { cn } from '@/lib/utils'
import { NODE_TYPES, NODE_TYPE_LABELS, type NodeTypeValue } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { generateId } from '@/lib/id-generator'
import { useClampedFixedMenu } from '@/hooks/useClampedFixedMenu'

interface NodeContextMenuProps {
  nodeId: string | null
  position: { x: number; y: number } | null
  onClose: () => void
  onEditNode?: (nodeId: string) => void
  onSendTrafficHere?: (nodeId: string) => void
  onAdvancedNode?: (nodeId: string) => void
}

export function NodeContextMenu({
  nodeId,
  position,
  onClose,
  onEditNode,
  onSendTrafficHere,
  onAdvancedNode,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const node = useFunnelEditorStore((s) =>
    nodeId ? s.nodes.find((n) => n.id === nodeId) : undefined,
  )
  const nodeType = node?.data.nodeType
  const isRoot = nodeType === NODE_TYPES.root
  useClampedFixedMenu(
    position,
    menuRef,
    `${nodeId ?? ''}:${nodeType ?? ''}:${isRoot}:${Boolean(onSendTrafficHere)}`,
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

  if (!position || !nodeId || !node) return null

  function handleDelete() {
    useFunnelEditorStore.getState().removeNode(nodeId!)
    onClose()
  }

  function handleEdit() {
    if (nodeId && onEditNode) onEditNode(nodeId)
    onClose()
  }

  function handleSendTrafficHere() {
    if (nodeId && onSendTrafficHere) onSendTrafficHere(nodeId)
    onClose()
  }

  function handleAdvancedSettings() {
    if (nodeId && onAdvancedNode) onAdvancedNode(nodeId)
    onClose()
  }

  const showAdvancedSettings =
    onAdvancedNode != null &&
    (nodeType === NODE_TYPES.lander || nodeType === NODE_TYPES.offer)

  function handleDuplicate() {
    if (!node) return
    const store = useFunnelEditorStore.getState()
    const newId = generateId()
    const offset = 30
    const newNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + offset, y: node.position.y + offset },
      data: { ...node.data, isEntrance: false },
    }
    store.setNodes([...store.nodes, newNode])
    onClose()
  }

  const editLabel = getEditLabel(node.data.nodeType)

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-zinc-900 border rounded-md shadow-lg py-1 min-w-[180px] text-sm"
      style={{
        left: position.x,
        top: position.y,
        visibility: 'hidden',
      }}
    >
      {onSendTrafficHere && (
        <MenuItem icon={<Icon name="send" size="md" />} label="Send Traffic Here" onClick={handleSendTrafficHere} />
      )}

      {!isRoot && editLabel && (
        <MenuItem icon={<Icon name="pencil" size="md" />} label={editLabel} onClick={handleEdit} />
      )}

      {showAdvancedSettings && (
        <MenuItem
          icon={<Icon name="settings" size="md" />}
          label="Advanced Settings"
          onClick={handleAdvancedSettings}
        />
      )}

      {!isRoot && (
        <MenuItem icon={<Icon name="copy" size="md" />} label="Duplicate" onClick={handleDuplicate} />
      )}

      {!isRoot && (
        <>
          <div className="-mx-0 my-1 h-px bg-muted" />
          <MenuItem
            icon={<Icon name="trash-2" size="md" />}
            label="Delete Node"
            onClick={handleDelete}
            className="text-destructive"
          />
        </>
      )}
    </div>
  )
}

function getEditLabel(nodeType: NodeTypeValue): string {
  switch (nodeType) {
    case NODE_TYPES.lander:
    case NODE_TYPES.offer:
      return `Edit ${NODE_TYPE_LABELS[nodeType]}`
    case NODE_TYPES.externalUrl:
      return 'Edit URL'
    case NODE_TYPES.condition:
      return 'Edit Condition'
    case NODE_TYPES.jsCode:
    case NODE_TYPES.phpCode:
      return 'Edit Code'
    case NODE_TYPES.visitorTag:
      return 'Edit Tag'
    case NODE_TYPES.rotator:
      return 'Edit Properties'
    default:
      return 'Edit'
  }
}

function MenuItem({
  icon,
  label,
  onClick,
  className,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 border-0 bg-transparent px-3 py-1.5 text-left text-sm text-inherit',
        'cursor-pointer rounded-sm transition-colors',
        'hover:bg-muted dark:hover:bg-zinc-800',
        className,
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
