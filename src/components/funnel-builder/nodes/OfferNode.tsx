import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
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
        icon: <Icon name="sparkles" className="h-5 w-5" />,
      }}
    />
  )
}

export const OfferNode = memo(OfferNodeComponent)
