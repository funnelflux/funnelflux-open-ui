import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { ExternalLink } from 'lucide-react'
import type { FunnelNodeData, ExternalUrlNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function truncateUrl(url: string, maxLength = 28): string {
  if (url.length <= maxLength) return url
  return url.slice(0, maxLength) + '...'
}

function ExternalUrlNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as ExternalUrlNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      className="border-l-2 border-l-gray-400"
    >
      <div className="flex items-center gap-2">
        <ExternalLink className="h-4 w-4 shrink-0 text-gray-500" />
        <div className="min-w-0">
          <div className="text-sm font-medium">External URL</div>
          {params.url && (
            <div className="truncate text-xs text-muted-foreground" title={params.url}>
              {truncateUrl(params.url)}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  )
}

export const ExternalUrlNode = memo(ExternalUrlNodeComponent)
