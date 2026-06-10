import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function LanderNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'sky',
        kind: 'Lander',
        title: data.label || 'Lander',
        icon: <Icon name="file-text" size="lg" />,
      }}
    />
  )
}

export const LanderNode = memo(LanderNodeComponent)
