import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { cn } from '@/lib/utils'
import { NODE_TYPES, NODE_TYPE_LABELS, type NodeTypeValue } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { EntityPickerDialog, type EntityPickerDialogProps } from './EntityPickerDialog'
import { useClampedFixedMenu } from '@/hooks/useClampedFixedMenu'
import { computeSubmenuPlacement } from '@/lib/clampFixedPositionToViewport'

interface CanvasContextMenuProps {
  screenPosition: { x: number; y: number } | null
  flowPosition: { x: number; y: number } | null
  onClose: () => void
  /** After placing a node from the menu, open the funnel node editor (condition, JS/PHP code). */
  onPlacedNodeOpenEditor?: (nodeId: string) => void
}

export function CanvasContextMenu({
  screenPosition,
  flowPosition,
  onClose,
  onPlacedNodeOpenEditor,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const advancedTriggerRef = useRef<HTMLDivElement>(null)
  const advancedMenuRef = useRef<HTMLDivElement>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  useClampedFixedMenu(screenPosition, menuRef, showAdvanced ? 'advanced-open' : 'advanced-closed')

  useLayoutEffect(() => {
    if (!showAdvanced) return
    const trigger = advancedTriggerRef.current
    const submenu = advancedMenuRef.current
    if (!trigger || !submenu) return

    function applyPlacement() {
      const triggerEl = advancedTriggerRef.current
      const submenuEl = advancedMenuRef.current
      if (!triggerEl || !submenuEl) return
      const submenuSize = submenuEl.getBoundingClientRect()
      const placement = computeSubmenuPlacement(triggerEl.getBoundingClientRect(), {
        width: submenuSize.width,
        height: submenuSize.height,
      })
      submenuEl.classList.toggle('left-full', placement.horizontal === 'end')
      submenuEl.classList.toggle('right-full', placement.horizontal === 'start')
      submenuEl.style.top = `${placement.top}px`
    }

    applyPlacement()
    window.addEventListener('resize', applyPlacement)
    return () => window.removeEventListener('resize', applyPlacement)
  }, [showAdvanced, screenPosition])

  const [pickerState, setPickerState] = useState<{
    open: boolean
    entityType: EntityPickerDialogProps['entityType']
  }>({ open: false, entityType: 'lander' })

  // Close on outside click (menu only). EntityPickerDialog is portaled under
  // `.ant-modal-wrap`, so it is not inside menuRef — ignore those mousedowns
  // so list selection can fire; otherwise we clear the menu before click runs.
  useEffect(() => {
    if (!screenPosition) return
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as globalThis.Node
      if (menuRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('.ant-modal-wrap')) return
      onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [screenPosition, onClose])

  // Close on Escape
  useEffect(() => {
    if (!screenPosition) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [screenPosition, onClose])

  const addNodeDirect = useCallback(
    (nodeType: NodeTypeValue, label: string) => {
      if (!flowPosition) return
      useFunnelEditorStore.getState().addNode(nodeType, flowPosition, { label })
      onClose()
    },
    [flowPosition, onClose],
  )

  const openPicker = useCallback(
    (entityType: EntityPickerDialogProps['entityType']) => {
      setPickerState({ open: true, entityType })
    },
    [],
  )

  const handleAddConditionNode = useCallback(() => {
    if (!flowPosition) return
    const store = useFunnelEditorStore.getState()
    const nodeId = store.addNode(NODE_TYPES.condition, flowPosition, {
      label: 'Condition',
      params: { conditionName: 'Condition' },
    })
    onClose()
    onPlacedNodeOpenEditor?.(nodeId)
  }, [flowPosition, onPlacedNodeOpenEditor, onClose])

  const handleAddJsCodeNode = useCallback(() => {
    if (!flowPosition) return
    const nodeId = useFunnelEditorStore.getState().addNode(NODE_TYPES.jsCode, flowPosition, {
      label: NODE_TYPE_LABELS[NODE_TYPES.jsCode],
      params: {},
    })
    onClose()
    onPlacedNodeOpenEditor?.(nodeId)
  }, [flowPosition, onClose, onPlacedNodeOpenEditor])

  const handleAddPhpCodeNode = useCallback(() => {
    if (!flowPosition) return
    const nodeId = useFunnelEditorStore.getState().addNode(NODE_TYPES.phpCode, flowPosition, {
      label: NODE_TYPE_LABELS[NODE_TYPES.phpCode],
      params: {},
    })
    onClose()
    onPlacedNodeOpenEditor?.(nodeId)
  }, [flowPosition, onClose, onPlacedNodeOpenEditor])

  const handlePickerSelect = useCallback(
    (entity: { id: string; name: string }) => {
      if (!flowPosition) return
      const { entityType } = pickerState
      const store = useFunnelEditorStore.getState()

      if (entityType === 'lander') {
        store.addNode(NODE_TYPES.lander, flowPosition, {
          label: entity.name,
          params: { pageId: entity.id, pageName: entity.name },
        })
      } else if (entityType === 'offer') {
        store.addNode(NODE_TYPES.offer, flowPosition, {
          label: entity.name,
          params: { pageId: entity.id, pageName: entity.name },
        })
      } else if (entityType === 'condition') {
        store.addNode(NODE_TYPES.condition, flowPosition, {
          label: entity.name,
          params: { conditionId: entity.id, conditionName: entity.name },
        })
      }

      onClose()
    },
    [flowPosition, pickerState, onClose],
  )

  if (!screenPosition) return null

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 bg-white dark:bg-zinc-900 border rounded-md shadow-lg py-1 min-w-[180px] text-sm"
        style={{
          left: screenPosition.x,
          top: screenPosition.y,
          visibility: 'hidden',
        }}
      >
        <MenuItem
          icon={<Icon name="file-text" size="md" />}
          label="Add Lander"
          onClick={() => openPicker('lander')}
        />
        <MenuItem
          icon={<Icon name="gift" size="md" />}
          label="Add Offer"
          onClick={() => openPicker('offer')}
        />
        <MenuItem
          icon={<Icon name="shuffle" size="md" />}
          label="Add Rotator"
          onClick={() => addNodeDirect(NODE_TYPES.rotator, 'Rotator')}
        />
        <MenuItem
          icon={<Icon name="git-branch" size="md" />}
          label="Add Condition"
          onClick={handleAddConditionNode}
        />
        <MenuItem
          icon={<Icon name="external-link" size="md" />}
          label="Add External URL"
          onClick={() => addNodeDirect(NODE_TYPES.externalUrl, 'External URL')}
        />

        <div className="-mx-0 my-1 h-px bg-muted" />

        {/* Advanced submenu */}
        <div
          ref={advancedTriggerRef}
          className="relative"
          onMouseEnter={() => setShowAdvanced(true)}
          onMouseLeave={() => setShowAdvanced(false)}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent">
            <Icon name="chevron-right" size="md" />
            <span>Advanced</span>
            <span className="ml-auto">
              <Icon name="chevron-right" size="md" />
            </span>
          </div>

          {showAdvanced && (
            <div
              ref={advancedMenuRef}
              className="absolute left-full bg-white dark:bg-zinc-900 border rounded-md shadow-lg py-1 min-w-[160px] text-sm"
            >
              <MenuItem
                icon={<Icon name="code" size="md" />}
                label="Add JS Code"
                onClick={handleAddJsCodeNode}
              />
              <MenuItem
                icon={<Icon name="file-code" size="md" />}
                label="Add PHP Code"
                onClick={handleAddPhpCodeNode}
              />
              <MenuItem
                icon={<Icon name="tag" size="md" />}
                label="Add Visitor Tag"
                onClick={() =>
                  addNodeDirect(NODE_TYPES.visitorTag, 'Visitor Tag')
                }
              />
            </div>
          )}
        </div>
      </div>

      <EntityPickerDialog
        open={pickerState.open}
        onClose={() => setPickerState((s) => ({ ...s, open: false }))}
        entityType={pickerState.entityType}
        onSelect={handlePickerSelect}
      />
    </>
  )
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
