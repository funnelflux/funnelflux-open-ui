import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { FileText } from 'lucide-react'
import type { FunnelNodeData, LanderNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function LanderNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as LanderNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      className="border-l-2 border-l-blue-500"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
        <div className="min-w-0">
          <div className="text-sm font-medium">Lander</div>
          {params.pageName && (
            <div className="truncate text-xs text-muted-foreground">
              {params.pageName}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  )
}

export const LanderNode = memo(LanderNodeComponent)
