import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FileText,
  Gift,
  Shuffle,
  GitBranch,
  ExternalLink,
  ChevronRight,
  Code,
  FileCode,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NODE_TYPES, type NodeTypeValue } from '@/types/funnel'
import { useFunnelEditorStore } from '@/store/funnelEditor'
import { EntityPickerDialog, type EntityPickerDialogProps } from './EntityPickerDialog'

interface CanvasContextMenuProps {
  screenPosition: { x: number; y: number } | null
  flowPosition: { x: number; y: number } | null
  onClose: () => void
}

export function CanvasContextMenu({ screenPosition, flowPosition, onClose }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [pickerState, setPickerState] = useState<{
    open: boolean
    entityType: EntityPickerDialogProps['entityType']
  }>({ open: false, entityType: 'lander' })

  // Close on outside click
  useEffect(() => {
    if (!screenPosition) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as globalThis.Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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

  // Reset submenu state when menu closes. This intentionally sets state from
  // an effect that reads a prop — the alternative (keying the whole menu on
  // position) would remount EntityPickerDialog mid-interaction.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!screenPosition) setShowAdvanced(false)
  }, [screenPosition])

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
      } else if (entityType === 'jsCode') {
        store.addNode(NODE_TYPES.jsCode, flowPosition, {
          label: entity.name,
          params: { snippetId: entity.id, snippetName: entity.name },
        })
      } else if (entityType === 'phpCode') {
        store.addNode(NODE_TYPES.phpCode, flowPosition, {
          label: entity.name,
          params: { snippetId: entity.id, snippetName: entity.name },
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
        className="fixed z-50 bg-popover border rounded-md shadow-md py-1 min-w-[180px] text-sm"
        style={{ left: screenPosition.x, top: screenPosition.y }}
      >
        <MenuItem
          icon={<FileText className="h-4 w-4" />}
          label="Add Lander"
          onClick={() => openPicker('lander')}
        />
        <MenuItem
          icon={<Gift className="h-4 w-4" />}
          label="Add Offer"
          onClick={() => openPicker('offer')}
        />
        <MenuItem
          icon={<Shuffle className="h-4 w-4" />}
          label="Add Rotator"
          onClick={() => addNodeDirect(NODE_TYPES.rotator, 'Rotator')}
        />
        <MenuItem
          icon={<GitBranch className="h-4 w-4" />}
          label="Add Condition"
          onClick={() => openPicker('condition')}
        />
        <MenuItem
          icon={<ExternalLink className="h-4 w-4" />}
          label="Add External URL"
          onClick={() => addNodeDirect(NODE_TYPES.externalUrl, 'External URL')}
        />

        <div className="-mx-0 my-1 h-px bg-muted" />

        {/* Advanced submenu */}
        <div
          className="relative"
          onMouseEnter={() => setShowAdvanced(true)}
          onMouseLeave={() => setShowAdvanced(false)}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent">
            <ChevronRight className="h-4 w-4" />
            <span>Advanced</span>
            <ChevronRight className="h-4 w-4 ml-auto" />
          </div>

          {showAdvanced && (
            <div className="absolute left-full top-0 bg-popover border rounded-md shadow-md py-1 min-w-[160px] text-sm">
              <MenuItem
                icon={<Code className="h-4 w-4" />}
                label="Add JS Code"
                onClick={() => openPicker('jsCode')}
              />
              <MenuItem
                icon={<FileCode className="h-4 w-4" />}
                label="Add PHP Code"
                onClick={() => openPicker('phpCode')}
              />
              <MenuItem
                icon={<Tag className="h-4 w-4" />}
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
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent',
        className,
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}
