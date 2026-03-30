import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Tag } from 'lucide-react'
import type { FunnelNodeData, VisitorTagNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function VisitorTagNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as VisitorTagNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      className="border-l-2 border-l-teal-500"
    >
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 shrink-0 text-teal-500" />
        <div className="min-w-0">
          <div className="text-sm font-medium">Visitor Tag</div>
          {params.tagKey && (
            <div className="truncate text-xs text-muted-foreground">
              {params.tagKey}={params.tagValue}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  )
}

export const VisitorTagNode = memo(VisitorTagNodeComponent)
