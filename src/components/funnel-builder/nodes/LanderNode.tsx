import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { FileText } from 'lucide-react'
import type { FunnelNodeData, LanderNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function LanderNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as LanderNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'sky',
        kind: 'Lander',
        title: data.label || 'Lander',
        subtitle: params.pageName || (params.pageId ? `Page ${params.pageId}` : undefined),
        icon: <FileText className="h-5 w-5" />,
      }}
    />
  )
}

export const LanderNode = memo(LanderNodeComponent)
