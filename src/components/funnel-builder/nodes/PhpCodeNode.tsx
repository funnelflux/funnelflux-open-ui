import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
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
        icon: <Icon name="terminal" className="h-5 w-5" />,
      }}
    >
      <Handle
        type="source"
        id="onDone"
        position={Position.Bottom}
        className={
          '!z-10 !h-4 !w-4 !min-h-4 !min-w-4 !rounded-full !border-2 !border-background !bg-amber-600/90 shadow-sm ' +
          'transition-[width,height,min-width,min-height,background-color] duration-150 ease-out ' +
          'hover:!z-20 hover:!h-[50px] hover:!w-[50px] hover:!min-h-[50px] hover:!min-w-[50px] hover:!bg-amber-500'
        }
      />
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground">
        On done
      </span>
    </BaseNode>
  )
}

export const PhpCodeNode = memo(PhpCodeNodeComponent)
