import { Skeleton } from '@/components/ui-kit'
import { StatCard } from '@/components/ui-kit'
import type { LiveStats } from '@/types/ui'
import { cn } from '@/lib/utils'

/** Summary metrics for the dashboard (extends API live stats with lander/offer views). */
export type DashboardSummaryStats = LiveStats & {
  landerViews?: number
  offerViews?: number
}

interface StatsCardsProps {
  stats?: DashboardSummaryStats
  isLoading: boolean
  /** `dashboard`: 2×4 grid next to the chart; `legacy`: wider 7-column toolbar layout. */
  layout?: 'dashboard' | 'legacy'
  className?: string
}

const DASHBOARD_CARDS = [
  { key: 'visits', label: 'Visits', format: 'number' },
  { key: 'landerViews', label: 'Lander Views', format: 'number' },
  { key: 'offerViews', label: 'Offer Views', format: 'number' },
  { key: 'conversions', label: 'Conversions', format: 'number' },
  { key: 'cost', label: 'Cost', format: 'currency' },
  { key: 'revenue', label: 'Revenue', format: 'currency' },
  { key: 'net', label: 'P&L', format: 'currency' },
  { key: 'roi', label: 'ROI', format: 'percent' },
] as const

const LEGACY_CARDS = [
  { key: 'visits', label: 'Visits', format: 'number' },
  { key: 'clicks', label: 'Clicks', format: 'number' },
  { key: 'conversions', label: 'Conversions', format: 'number' },
  { key: 'revenue', label: 'Revenue', format: 'currency' },
  { key: 'cost', label: 'Cost', format: 'currency' },
  { key: 'net', label: 'Net', format: 'currency' },
  { key: 'roi', label: 'ROI', format: 'percent' },
] as const

function formatValue(
  key: string,
  format: string,
  stats: DashboardSummaryStats,
): string {
  if (key === 'net') {
    const net = (stats.revenue ?? 0) - (stats.cost ?? 0)
    return `$${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (key === 'roi') {
    const roiVal = stats.roi ?? '0'
    return roiVal.includes('%') ? roiVal : `${roiVal}%`
  }

  const raw = stats[key as keyof DashboardSummaryStats]
  if (format === 'currency') {
    const num = typeof raw === 'number' ? raw : 0
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  const num = typeof raw === 'number' ? raw : 0
  return num.toLocaleString()
}

function numericMetricValue(key: string, stats: DashboardSummaryStats | undefined): number | null {
  if (!stats) return null
  if (key === 'net') return (stats.revenue ?? 0) - (stats.cost ?? 0)
  if (key === 'roi') {
    const raw = stats.roi
    if (typeof raw === 'number') return raw
    if (typeof raw !== 'string') return null
    const parsed = Number(raw.replace('%', '').replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function metricToneClass(key: string, stats: DashboardSummaryStats | undefined): string | undefined {
  if (key !== 'net' && key !== 'roi') return undefined
  const value = numericMetricValue(key, stats)
  if (value == null) return undefined
  if (value > 0) return 'text-profit'
  if (value < 0) return 'text-loss'
  return 'text-muted-foreground'
}

export function StatsCards({ stats, isLoading, layout = 'dashboard', className }: StatsCardsProps) {
  const cards = layout === 'dashboard' ? DASHBOARD_CARDS : LEGACY_CARDS
  const compact = layout === 'dashboard'

  return (
    <div
      className={cn(
        'grid gap-2',
        layout === 'dashboard'
          ? 'grid-cols-2 grid-rows-4 auto-rows-fr h-full min-h-0 content-stretch'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3',
        className,
      )}
    >
      {cards.map(({ key, label, format }) => (
        isLoading ? (
          <div
            key={key}
            className={cn(
              'ff-stat-card relative overflow-hidden rounded-lg border border-border-strong bg-surface-secondary',
              compact ? 'p-3' : 'p-5',
            )}
          >
            <p className={cn('font-medium text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>{label}</p>
            <Skeleton.Input active size="small" style={{ width: 80, height: compact ? 22 : 28, marginTop: 4 }} />
          </div>
        ) : (
          <StatCard
            key={key}
            title={label}
            value={stats ? formatValue(key, format, stats) : '0'}
            compact={compact}
            className={cn(
              'min-h-0',
              key === 'net' || key === 'roi' ? (
                stats && Number(stats[key]) < 0 ? 'ff-stat-card--loss' : 'ff-stat-card--profit'
              ) : undefined,
            )}
            valueClassName={metricToneClass(key, stats)}
          />
        )
      ))}
    </div>
  )
}
