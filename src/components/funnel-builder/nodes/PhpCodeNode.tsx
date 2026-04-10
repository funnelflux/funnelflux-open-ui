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
      hideSource
      card={{
        accent: 'orange',
        kind: 'PHP',
        title: data.label || 'PHP code',
        icon: <Terminal className="h-5 w-5" />,
      }}
    >
      <Handle
        type="source"
        id="onDone"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-background !bg-amber-600/90"
      />
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground">
        On done
      </span>
    </BaseNode>
  )
}

export const PhpCodeNode = memo(PhpCodeNodeComponent)
