import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData, ConditionNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function ConditionNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as ConditionNodeParams
  const title = (params.conditionName || data.label || 'Condition').trim()
  const subtitle =
    data.label && data.label !== title && data.label !== 'Condition'
      ? data.label
      : undefined

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'fuchsia',
        kind: 'Condition',
        title,
        subtitle,
        icon: <Icon name="git-branch" size="lg" />,
      }}
    />
  )
}

export const ConditionNode = memo(ConditionNodeComponent)
