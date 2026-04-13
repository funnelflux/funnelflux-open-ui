import { useContext, useMemo } from 'react'
import { HeatmapContext } from './HeatmapContext'
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
      ? 'bg-success/15 text-success'
      : 'bg-muted text-muted-foreground'
  }

  if (value <= upperThird) {
    // Medium values
    return 'bg-warning/15 text-warning'
  }

  // High values
  return isNegativeMetric
    ? 'bg-error/15 text-error'
    : 'bg-success/15 text-success'
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
