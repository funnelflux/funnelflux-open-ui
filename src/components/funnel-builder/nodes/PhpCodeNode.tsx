import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { Terminal } from 'lucide-react'
import type { FunnelNodeData } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function PhpCodeNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      className="border-l-2 border-l-yellow-500"
      hideSource
    >
      <div className="flex items-center gap-2">
        <Terminal className="h-4 w-4 shrink-0 text-yellow-600" />
        <div className="min-w-0">
          <div className="text-sm font-medium">PHP Code</div>
        </div>
      </div>

      {/* "On Done" source handle at the bottom */}
      <Handle
        type="source"
        id="onDone"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-border !bg-muted-foreground"
      />
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
        On Done
      </span>
    </BaseNode>
  )
}

export const PhpCodeNode = memo(PhpCodeNodeComponent)
