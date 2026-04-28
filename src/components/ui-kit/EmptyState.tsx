import type { ReactNode } from 'react'
import { Button } from 'antd'
import { Icon } from '@/components/ui-kit/icons'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground mb-3">
        {icon || <Icon name="inbox" className="h-10 w-10" />}
      </div>
      {title && (
        <h3 className="text-base font-medium text-foreground mb-1">{title}</h3>
      )}
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
