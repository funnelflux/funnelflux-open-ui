import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function OfferNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'violet',
        kind: 'Offer',
        title: data.label || 'Offer',
        icon: <Icon name="sparkles" size="lg" />,
      }}
    />
  )
}

export const OfferNode = memo(OfferNodeComponent)
