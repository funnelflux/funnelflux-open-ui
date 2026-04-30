import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData, PhpCodeNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'
import { CodeExitHandles } from './CodeExitHandles'

function PhpCodeNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as PhpCodeNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      hideSource
      hideTarget
      card={{
        accent: 'orange',
        kind: 'PHP',
        title: data.label || 'PHP code',
        subtitle: params.snippetName,
        icon: <Icon name="terminal" size="lg" />,
      }}
    >
      <CodeExitHandles />
    </BaseNode>
  )
}

export const PhpCodeNode = memo(PhpCodeNodeComponent)
