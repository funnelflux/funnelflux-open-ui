import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import type { FunnelNodeData, ExternalUrlNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function truncateUrl(url: string, maxLength = 36): string {
  if (url.length <= maxLength) return url
  return `${url.slice(0, maxLength)}…`
}

function ExternalUrlNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as ExternalUrlNodeParams
  const url = params.url ?? ''

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'slate',
        kind: 'External URL',
        title: data.label || 'External URL',
        subtitle: url ? truncateUrl(url) : undefined,
        icon: <Icon name="link-2" size="lg" />,
      }}
    />
  )
}

export const ExternalUrlNode = memo(ExternalUrlNodeComponent)
