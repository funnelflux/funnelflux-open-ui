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
      hideSource
      card={{
        accent: 'fuchsia',
        kind: 'Condition',
        title: data.label || 'Condition',
        subtitle: params.conditionName,
        icon: <GitBranch className="h-5 w-5" />,
      }}
    >
      <Handle
        type="source"
        id="yes"
        position={Position.Right}
        style={{ top: '33%' }}
        className="!h-2.5 !w-2.5 !border-2 !border-background !bg-emerald-500"
      />
      <span
        className="absolute right-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400"
        style={{ top: 'calc(33% - 8px)' }}
      >
        Yes
      </span>

      <Handle
        type="source"
        id="no"
        position={Position.Right}
        style={{ top: '66%' }}
        className="!h-2.5 !w-2.5 !border-2 !border-background !bg-red-500"
      />
      <span
        className="absolute right-2 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400"
        style={{ top: 'calc(66% - 8px)' }}
      >
        No
      </span>
    </BaseNode>
  )
}

export const ConditionNode = memo(ConditionNodeComponent)
