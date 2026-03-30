import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Code } from 'lucide-react'
import type { FunnelNodeData, JsCodeNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function JsCodeNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as JsCodeNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      className="border-l-2 border-l-yellow-500"
    >
      <div className="flex items-center gap-2">
        <Code className="h-4 w-4 shrink-0 text-yellow-600" />
        <div className="min-w-0">
          <div className="text-sm font-medium">JavaScript</div>
          {params.snippetName && (
            <div className="truncate text-xs text-muted-foreground">
              {params.snippetName}
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  )
}

export const JsCodeNode = memo(JsCodeNodeComponent)
