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
  /** Standard vertical rhythm for page content wrappers. */
  density?: 'comfortable' | 'dense'
}

export function PageShell({
  title,
  subtitle,
  actions,
  children,
  className,
  fillHeight,
  density = 'comfortable',
}: PageShellProps) {
  const gapClass = density === 'dense' ? 'gap-3' : 'gap-6'

  return (
    <div className={cn('flex flex-col', gapClass, fillHeight && 'flex-1 min-h-0 overflow-hidden', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
