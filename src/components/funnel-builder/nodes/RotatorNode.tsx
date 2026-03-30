import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Shuffle } from 'lucide-react'
import type { FunnelNodeData } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function RotatorNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  return (
    <BaseNode selected={selected} isEntrance={data.isEntrance}>
      <div className="flex items-center gap-2">
        <Shuffle className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="text-sm font-medium">Rotator</div>
          {data.label && data.label !== 'Rotator' && (
            <div className="truncate text-xs text-muted-foreground">
              {data.label}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  )
}

export const RotatorNode = memo(RotatorNodeComponent)
