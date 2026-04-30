import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
import { normalizeVisitorTagParams, type FunnelNodeData, type VisitorTagNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function VisitorTagNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const { tagId, tagName } = normalizeVisitorTagParams(data.params as VisitorTagNodeParams)
  const subtitle =
    tagId.trim() !== ''
      ? tagName.trim() !== ''
        ? tagName
        : `#${tagId}`
      : undefined

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      card={{
        accent: 'slate',
        kind: 'Visitor tag',
        title: data.label || 'Tag',
        subtitle,
        icon: <Icon name="tags" size="lg" />,
      }}
    />
  )
}

export const VisitorTagNode = memo(VisitorTagNodeComponent)
