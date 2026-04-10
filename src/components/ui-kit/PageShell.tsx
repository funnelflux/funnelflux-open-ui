import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** When true the shell fills the remaining viewport height and its last child (the table) stretches. */
  fillHeight?: boolean
}

export function PageShell({
  title,
  subtitle,
  actions,
  children,
  className,
  fillHeight,
}: PageShellProps) {
  return (
    <div className={cn('flex flex-col gap-6', fillHeight && 'flex-1 min-h-0 overflow-hidden', className)}>
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
