import { useContext, useMemo } from 'react'
import { HeatmapContext } from './HeatmapOverlay'
import { cn } from '@/lib/utils'

// ── Formatting ─────────────────────────────────────────────────────────────

function formatMetricValue(metric: string, value: number): string {
  if (metric === 'revenue' || metric === 'cost') {
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (metric === 'roi') {
    return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
  }
  return value.toLocaleString()
}

// ── Intensity Classification ───────────────────────────────────────────────

function getIntensityClass(metric: string, value: number, allValues: number[]): string {
  if (allValues.length === 0) return 'bg-muted text-muted-foreground'

  const sorted = [...allValues].sort((a, b) => a - b)
  const lowerThird = sorted[Math.floor(sorted.length / 3)] ?? 0
  const upperThird = sorted[Math.floor((sorted.length * 2) / 3)] ?? 0

  const isNegativeMetric = metric === 'cost'

  if (value <= lowerThird) {
    // Low values
    return isNegativeMetric
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }

  if (value <= upperThird) {
    // Medium values
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
  }

  // High values
  return isNegativeMetric
    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
}

// ── Component ──────────────────────────────────────────────────────────────

interface HeatmapNodeBadgeProps {
  nodeId: string
}

export function HeatmapNodeBadge({ nodeId }: HeatmapNodeBadgeProps) {
  const { active, metric, nodeStats } = useContext(HeatmapContext)

  const allValues = useMemo(() => {
    return Object.values(nodeStats).map((s) => s[metric] ?? 0)
  }, [nodeStats, metric])

  if (!active) return null

  const stats = nodeStats[nodeId]
  if (!stats) return null

  const value = stats[metric] ?? 0
  const formattedValue = formatMetricValue(metric, value)
  const intensityClass = getIntensityClass(metric, value, allValues)

  return (
    <div
      className={cn(
        'absolute -top-2 -right-2 z-10',
        'inline-flex items-center rounded-full px-1.5 py-0.5',
        'text-[10px] font-semibold leading-none shadow-sm border',
        intensityClass,
      )}
    >
      {formattedValue}
    </div>
  )
}
