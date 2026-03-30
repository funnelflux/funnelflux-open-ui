import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { DollarSign } from 'lucide-react'
import type { FunnelNodeData, OfferNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function OfferNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as OfferNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      className="border-l-2 border-l-orange-500"
    >
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 shrink-0 text-orange-500" />
        <div className="min-w-0">
          <div className="text-sm font-medium">Offer</div>
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

export const OfferNode = memo(OfferNodeComponent)
