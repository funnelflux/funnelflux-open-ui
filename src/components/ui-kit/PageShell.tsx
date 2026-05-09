import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LoadingPage } from '@/components/shared/LoadingPage'
import { Button } from './Button'

export type PageShellBodyState =
  | { status: 'ready' }
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry?: () => void }
  | { status: 'empty'; message: string }

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
  /**
   * Standard loading / error / empty treatment for primary content. When not `ready`, `children`
   * are not rendered (header + actions still visible).
   */
  bodyState?: PageShellBodyState
}

export function PageShell({
  title,
  subtitle,
  actions,
  children,
  className,
  fillHeight,
  density = 'comfortable',
  bodyState,
}: PageShellProps) {
  const gapClass = density === 'dense' ? 'gap-3' : 'gap-6'
  const state = bodyState ?? ({ status: 'ready' } satisfies PageShellBodyState)

  let body: ReactNode = children
  if (state.status === 'loading') {
    body = <LoadingPage />
  } else if (state.status === 'error') {
    body = (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-sm text-destructive">{state.message}</p>
        {state.onRetry ? (
          <Button type="primary" onClick={state.onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    )
  } else if (state.status === 'empty') {
    body = (
      <div className="flex min-h-[400px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {state.message}
      </div>
    )
  }

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
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
      {body}
    </div>
  )
}
