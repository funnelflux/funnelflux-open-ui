import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { Icon } from '@/components/ui-kit/icons'
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
        icon: <Icon name="git-branch" className="h-5 w-5" />,
      }}
    >
      <Handle
        type="source"
        id="yes"
        position={Position.Right}
        style={{ top: '33%' }}
        className={
          '!z-10 !h-4 !w-4 !min-h-4 !min-w-4 !rounded-full !border-2 !border-background !bg-emerald-500 shadow-sm ' +
          'transition-[width,height,min-width,min-height,background-color] duration-150 ease-out ' +
          'hover:!z-20 hover:!h-[50px] hover:!w-[50px] hover:!min-h-[50px] hover:!min-w-[50px] hover:!bg-emerald-400'
        }
      />
      <span
        className="absolute right-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400"
        style={{ top: 'calc(33% - 10px)' }}
      >
        Yes
      </span>

      <Handle
        type="source"
        id="no"
        position={Position.Right}
        style={{ top: '66%' }}
        className={
          '!z-10 !h-4 !w-4 !min-h-4 !min-w-4 !rounded-full !border-2 !border-background !bg-red-500 shadow-sm ' +
          'transition-[width,height,min-width,min-height,background-color] duration-150 ease-out ' +
          'hover:!z-20 hover:!h-[50px] hover:!w-[50px] hover:!min-h-[50px] hover:!min-w-[50px] hover:!bg-red-400'
        }
      />
      <span
        className="absolute right-2 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400"
        style={{ top: 'calc(66% - 10px)' }}
      >
        No
      </span>
    </BaseNode>
  )
}

export const ConditionNode = memo(ConditionNodeComponent)
