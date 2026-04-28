import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { SOURCE_HANDLE, TARGET_HANDLE } from '@/lib/funnelEdgeGeometry'

const ACCENT_STYLES = {
  emerald:
    'bg-gradient-to-br from-emerald-500/20 to-teal-600/15 text-emerald-700 shadow-inner dark:from-emerald-500/25 dark:to-teal-900/30 dark:text-emerald-200',
  sky: 'bg-gradient-to-br from-sky-500/20 to-blue-600/15 text-sky-800 shadow-inner dark:from-sky-500/25 dark:to-blue-900/30 dark:text-sky-100',
  violet:
    'bg-gradient-to-br from-violet-500/20 to-fuchsia-600/15 text-violet-800 shadow-inner dark:from-violet-500/25 dark:to-fuchsia-900/30 dark:text-violet-100',
  amber:
    'bg-gradient-to-br from-amber-400/25 to-orange-500/20 text-amber-900 shadow-inner dark:from-amber-500/30 dark:to-orange-900/40 dark:text-amber-100',
  rose: 'bg-gradient-to-br from-rose-400/20 to-pink-600/15 text-rose-900 shadow-inner dark:from-rose-500/25 dark:to-pink-900/30 dark:text-rose-100',
  slate:
    'bg-gradient-to-br from-slate-400/20 to-slate-600/15 text-slate-800 shadow-inner dark:from-slate-500/30 dark:to-slate-800/40 dark:text-slate-100',
  fuchsia:
    'bg-gradient-to-br from-fuchsia-400/20 to-purple-600/15 text-fuchsia-900 shadow-inner dark:from-fuchsia-500/25 dark:to-purple-900/30 dark:text-fuchsia-100',
  orange:
    'bg-gradient-to-br from-orange-400/25 to-amber-600/15 text-orange-950 shadow-inner dark:from-orange-500/30 dark:to-amber-900/40 dark:text-orange-100',
} as const

export type NodeAccent = keyof typeof ACCENT_STYLES

/**
 * Side connectors (geometry picks active handle via edge sync).
 * Larger dots at rest; expand to ~25px radius (~50px box) on hover for connection drawing.
 */
const HANDLE_CLS =
  '!z-10 !h-4 !w-4 !min-h-4 !min-w-4 !rounded-full !border-2 !border-background !bg-muted-foreground/55 shadow-sm ' +
  'transition-[width,height,min-width,min-height,background-color,border-color] duration-150 ease-out ' +
  'hover:!z-20 hover:!h-[50px] hover:!w-[50px] hover:!min-h-[50px] hover:!min-w-[50px] hover:!bg-primary/70 hover:!border-primary/50'

const TARGET_HANDLES: { id: string; position: Position }[] = [
  { id: TARGET_HANDLE.top, position: Position.Top },
  { id: TARGET_HANDLE.right, position: Position.Right },
  { id: TARGET_HANDLE.bottom, position: Position.Bottom },
  { id: TARGET_HANDLE.left, position: Position.Left },
]

const SOURCE_HANDLES: { id: string; position: Position }[] = [
  { id: SOURCE_HANDLE.top, position: Position.Top },
  { id: SOURCE_HANDLE.right, position: Position.Right },
  { id: SOURCE_HANDLE.bottom, position: Position.Bottom },
  { id: SOURCE_HANDLE.left, position: Position.Left },
]

function MultiHandles({ hideTarget, hideSource }: { hideTarget?: boolean; hideSource?: boolean }) {
  return (
    <>
      {!hideTarget &&
        TARGET_HANDLES.map((h) => (
          <Handle
            key={h.id}
            id={h.id}
            type="target"
            position={h.position}
            className={HANDLE_CLS}
          />
        ))}
      {!hideSource &&
        SOURCE_HANDLES.map((h) => (
          <Handle
            key={h.id}
            id={h.id}
            type="source"
            position={h.position}
            className={HANDLE_CLS}
          />
        ))}
    </>
  )
}

interface BaseNodeProps {
  children?: ReactNode
  selected?: boolean
  isEntrance?: boolean
  className?: string
  hideTarget?: boolean
  hideSource?: boolean
  /** Rich card layout (OSS funnel builder). If omitted, legacy `children` layout is used. */
  card?: {
    accent: NodeAccent
    kind: string
    title: string
    subtitle?: string
    icon: ReactNode
  }
}

export function BaseNode({
  children,
  selected,
  isEntrance,
  className,
  hideTarget,
  hideSource,
  card,
}: BaseNodeProps) {
  if (card) {
    const iconWrap = ACCENT_STYLES[card.accent]
    return (
      <div
        className={cn(
          'relative w-[220px] rounded-2xl border bg-card/95 backdrop-blur-sm',
          'shadow-md hover:shadow-lg transition-shadow duration-200',
          'border-border/80',
          isEntrance && 'ring-1 ring-emerald-500/35',
          selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg',
          className,
        )}
      >
        <MultiHandles hideTarget={hideTarget} hideSource={hideSource} />

        <div className="px-3.5 pt-3.5 pb-3">
          <div className="flex gap-3 items-start">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                iconWrap,
              )}
            >
              <span className="[&>svg]:h-5 [&>svg]:w-5">{card.icon}</span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/90">
                {card.kind}
              </p>
              <p className="text-sm font-semibold leading-snug text-foreground line-clamp-3 break-words">
                {card.title || '—'}
              </p>
              {card.subtitle ? (
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{card.subtitle}</p>
              ) : null}
            </div>
          </div>
        </div>

        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative w-[180px] rounded-lg border bg-background shadow-sm',
        isEntrance && 'border-t-2 border-t-green-500',
        selected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
        className,
      )}
    >
      <MultiHandles hideTarget={hideTarget} hideSource={hideSource} />

      <div className="p-3">{children}</div>
    </div>
  )
}
