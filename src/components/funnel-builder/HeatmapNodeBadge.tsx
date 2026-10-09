import { useContext } from 'react'
import { HeatmapContext } from './HeatmapContext'
import { getFunnelHeatmapDisplay } from '@/lib/funnelHeatmap'
import { cn } from '@/lib/utils'

// ── Intensity Classification ───────────────────────────────────────────────

function getIntensityClass(value: number, maxValue: number): string {
  if (maxValue <= 0) return 'bg-card text-muted-foreground border-border'

  const ratio = value / maxValue
  if (ratio >= 0.7) {
    return 'bg-primary/95 text-primary-foreground border-primary/70 shadow-xl'
  }
  if (ratio >= 0.35) {
    return 'bg-warning/20 text-card-foreground border-warning/40'
  }
  return 'bg-card text-card-foreground border-border'
}

// ── Component ──────────────────────────────────────────────────────────────

interface HeatmapNodeBadgeProps {
  nodeId: string
  nodeKind?: string
  nodeTitle?: string
}

export function HeatmapNodeBadge({ nodeId, nodeKind, nodeTitle }: HeatmapNodeBadgeProps) {
  const { active, mode, nodeStats, intensityMax } = useContext(HeatmapContext)

  if (!active) return null

  const stats = nodeStats[nodeId]
  if (!stats) return null

  const display = getFunnelHeatmapDisplay({ stats, mode, intensityMax, nodeKind })
  const intensityClass = getIntensityClass(display.intensityValue, display.intensityMax)
  const title = nodeTitle || stats.nodeName || nodeId

  return (
    <div
      className={cn(
        'absolute left-1/2 top-full z-20 mt-2 w-[232px] -translate-x-1/2',
        'rounded-2xl border p-2.5 text-[11px] leading-tight backdrop-blur-md',
        'pointer-events-none',
        intensityClass,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">
            {nodeKind || display.heading}
          </p>
          <p className="truncate text-xs font-semibold">{title}</p>
        </div>
        <span className="max-w-[72px] shrink-0 truncate rounded-full border border-current/20 px-1.5 py-0.5 text-[9px] font-semibold opacity-80">
          {nodeId}
        </span>
      </div>

      <div className="space-y-1 rounded-xl bg-background/20 p-1.5">
        {display.rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <span className="truncate opacity-80">{row.label}</span>
            <span className="font-semibold tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
