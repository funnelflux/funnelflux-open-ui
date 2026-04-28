import { Button, Tooltip } from '@/components/ui-kit'
import type { LucideIcon } from '@/components/ui-kit/icons'

export interface InlineAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  destructive?: boolean
}

interface InlineActionsProps {
  actions: InlineAction[]
}

export function InlineActions({ actions }: InlineActionsProps) {
  return (
    <div className="inline-actions flex items-center gap-0.5">
      {actions.map((action) => (
        <Tooltip key={action.label} title={action.label}>
          <Button
            type="text"
            size="small"
            onClick={(e) => { e.stopPropagation(); action.onClick() }}
            className={action.destructive ? 'text-destructive hover:text-destructive' : ''}
            icon={<action.icon className="h-3.5 w-3.5" />}
          />
        </Tooltip>
      ))}
    </div>
  )
}
