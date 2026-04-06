import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Globe } from 'lucide-react'
import type { FunnelNodeData, RootNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function RootNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as RootNodeParams

  return (
    <BaseNode selected={selected} isEntrance hideTarget>
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 shrink-0 text-success" />
        <div className="min-w-0">
          <div className="text-sm font-medium">Entrance</div>
          {params.trafficSourceName && (
            <div className="truncate text-xs text-muted-foreground">
              {params.trafficSourceName}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  )
}

export const RootNode = memo(RootNodeComponent)
