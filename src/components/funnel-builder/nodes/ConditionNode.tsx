import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData, ConditionNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function ConditionNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as ConditionNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'fuchsia',
        kind: 'Condition',
        title: data.label || 'Condition',
        subtitle: params.conditionName,
        icon: <Icon name="git-branch" size="lg" />,
      }}
    />
  )
}

export const ConditionNode = memo(ConditionNodeComponent)
