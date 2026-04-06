import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import type { FunnelNodeData, ConditionNodeParams } from '@/types/funnel'
import { BaseNode } from './BaseNode'

function ConditionNodeComponent({ data, selected }: NodeProps<Node<FunnelNodeData>>) {
  const params = data.params as ConditionNodeParams

  return (
    <BaseNode
      selected={selected}
      isEntrance={data.isEntrance}
      className="border-l-2 border-l-purple-500"
      hideSource
    >
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 shrink-0 text-purple-500" />
        <div className="min-w-0">
          <div className="text-sm font-medium">Condition</div>
          {params.conditionName && (
            <div className="truncate text-xs text-muted-foreground">
              {params.conditionName}
            </div>
          )}
        </div>
      </div>

      {/* Yes handle at 33% vertical on the right */}
      <Handle
        type="source"
        id="yes"
        position={Position.Right}
        style={{ top: '33%' }}
        className="!h-2 !w-2 !border-border !bg-success"
      />
      <span className="absolute right-3 text-xs font-medium text-success" style={{ top: 'calc(33% - 7px)' }}>
        Yes
      </span>

      {/* No handle at 66% vertical on the right */}
      <Handle
        type="source"
        id="no"
        position={Position.Right}
        style={{ top: '66%' }}
        className="!h-2 !w-2 !border-border !bg-error"
      />
      <span className="absolute right-3 text-xs font-medium text-error" style={{ top: 'calc(66% - 7px)' }}>
        No
      </span>
    </BaseNode>
  )
}

export const ConditionNode = memo(ConditionNodeComponent)
