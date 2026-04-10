import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Sparkles } from 'lucide-react'
import type { FunnelNodeData, OfferNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function OfferNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as OfferNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'violet',
        kind: 'Offer',
        title: data.label || 'Offer',
        subtitle: params.pageName || (params.pageId ? `Page ${params.pageId}` : undefined),
        icon: <Sparkles className="h-5 w-5" />,
      }}
    />
  )
}

export const OfferNode = memo(OfferNodeComponent)
