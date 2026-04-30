import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData, VisitorTagNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function VisitorTagNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as VisitorTagNodeParams
  const pair =
    params.tagKey || params.tagValue ? `${params.tagKey ?? ''}=${params.tagValue ?? ''}` : undefined

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'slate',
        kind: 'Visitor tag',
        title: data.label || 'Tag',
        subtitle: pair,
        icon: <Icon name="tags" size="lg" />,
      }}
    />
  )
}

export const VisitorTagNode = memo(VisitorTagNodeComponent)
