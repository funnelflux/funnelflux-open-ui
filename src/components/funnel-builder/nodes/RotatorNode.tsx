import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function RotatorNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const sub =
    data.label && data.label !== 'Rotator'
      ? data.label
      : undefined

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'amber',
        kind: 'Rotator',
        title: data.label || 'Rotator',
        subtitle: sub,
        icon: <Icon name="shuffle" size="lg" />,
      }}
    />
  )
}

export const RotatorNode = memo(RotatorNodeComponent)
