import { Dropdown, Button } from 'antd'
import type { MenuProps } from 'antd'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'

export interface RowAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  destructive?: boolean
}

interface RowActionsMenuProps {
  actions: RowAction[]
}

export function RowActionsMenu({ actions }: RowActionsMenuProps) {
  const normal = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  const items: MenuProps['items'] = [
    ...normal.map((action, i) => ({
      key: `normal-${i}`,
      label: (
        <span className="flex items-center gap-2">
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </span>
      ),
      onClick: action.onClick,
    })),
    ...(destructive.length > 0 && normal.length > 0
      ? [{ key: 'sep', type: 'divider' as const }]
      : []),
    ...destructive.map((action, i) => ({
      key: `destructive-${i}`,
      label: (
        <span className="flex items-center gap-2 text-destructive">
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </span>
      ),
      danger: true,
      onClick: action.onClick,
    })),
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button type="text" className="h-8 w-8" icon={<MoreHorizontal className="h-4 w-4" />} />
    </Dropdown>
  )
}
