import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'

interface BaseNodeProps {
  children: ReactNode
  selected?: boolean
  isEntrance?: boolean
  className?: string
  /** Hide the target handle (e.g. for root/entrance nodes) */
  hideTarget?: boolean
  /** Hide the default source handle (e.g. for condition nodes with custom handles) */
  hideSource?: boolean
}

export function BaseNode({
  children,
  selected,
  isEntrance,
  className,
  hideTarget,
  hideSource,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        'relative w-[180px] rounded-lg border bg-background shadow-sm',
        isEntrance && 'border-t-2 border-t-green-500',
        selected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
        className,
      )}
    >
      {!hideTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2 !w-2 !border-border !bg-muted-foreground"
        />
      )}

      <div className="p-3">{children}</div>

      {!hideSource && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2 !w-2 !border-border !bg-muted-foreground"
        />
      )}
    </div>
  )
}
