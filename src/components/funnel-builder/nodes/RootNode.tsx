import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData, RootNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function RootNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as RootNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      hideTarget
      card={{
        accent: 'emerald',
        kind: 'Traffic',
        title: data.label || 'Entrance',
        subtitle: params.trafficSourceName,
        icon: <Icon name="globe" className="h-5 w-5" />,
      }}
    />
  )
}

export const RootNode = memo(RootNodeComponent)
