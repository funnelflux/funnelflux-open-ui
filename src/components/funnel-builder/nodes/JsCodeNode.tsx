import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData, JsCodeNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function JsCodeNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as JsCodeNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'rose',
        kind: 'JavaScript',
        title: data.label || 'JS',
        subtitle: params.snippetName,
        icon: <Icon name="braces" size="lg" />,
      }}
    />
  )
}

export const JsCodeNode = memo(JsCodeNodeComponent)
