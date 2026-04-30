import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  CODE_NODE_MAX_ON_DONE_EXITS,
  CODE_NODE_UNIFIED_SOURCE_HANDLE,
  CODE_NODE_UNIFIED_TARGET_HANDLE,
} from '@/lib/codeNodeExits'

/**
 * Wide invisible strip catches incoming links anywhere along the bottom edge (no top handle).
 */
const IN_STRIP =
  '!absolute !bottom-0 !left-1/2 !z-[4] !h-4 !min-h-4 !w-[calc(100%-20px)] !max-w-none !-translate-x-1/2 !translate-y-0 !rounded-none !border-0 opacity-0 nodrag nopan'

/** Visible egress knob — sits above the inbound strip center for starting connections. */
const OUT_DOT =
  '!absolute !z-[6] !box-border !h-3.5 !w-3.5 !min-h-3.5 !min-w-3.5 !-translate-x-1/2 !translate-y-1/2 !rounded-full !border-2 !border-background !bg-muted-foreground/50 shadow-sm nodrag nopan cursor-crosshair ' +
  'transition-[width,height,background-color] duration-150 ease-out hover:!bg-muted-foreground/70'

/**
 * Bottom only: inbound via full-width invisible `code-in` strip; outbound via centered `code-out` dot.
 */
function CodeExitHandlesComponent() {
  return (
    <>
      <Handle
        id={CODE_NODE_UNIFIED_TARGET_HANDLE}
        type="target"
        position={Position.Bottom}
        title="In"
        isConnectableStart={false}
        isConnectableEnd
        className={IN_STRIP}
      />

      <Handle
        id={CODE_NODE_UNIFIED_SOURCE_HANDLE}
        type="source"
        position={Position.Bottom}
        title={`Out — up to ${CODE_NODE_MAX_ON_DONE_EXITS} links; labels show On Done`}
        isConnectableStart
        isConnectableEnd
        className={OUT_DOT}
        style={{ left: '50%', bottom: 2 }}
      />
    </>
  )
}

export const CodeExitHandles = memo(CodeExitHandlesComponent)
