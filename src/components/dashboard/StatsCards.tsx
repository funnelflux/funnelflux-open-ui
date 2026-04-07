import { Skeleton } from 'antd'
import { StatCard } from '@/components/ui-kit'
import type { LiveStats } from '@/types/ui'

interface StatsCardsProps {
  stats?: LiveStats
  isLoading: boolean
}

const CARDS = [
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
  stats: LiveStats,
): string {
  if (key === 'net') {
    const net = (stats.revenue ?? 0) - (stats.cost ?? 0)
    return `$${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (key === 'roi') {
    const roiVal = stats.roi ?? '0'
    return roiVal.includes('%') ? roiVal : `${roiVal}%`
  }

  const raw = stats[key as keyof LiveStats]
  if (format === 'currency') {
    const num = typeof raw === 'number' ? raw : 0
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  const num = typeof raw === 'number' ? raw : 0
  return num.toLocaleString()
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {CARDS.map(({ key, label, format }) => (
        isLoading ? (
          <div key={key} className="rounded-lg border bg-background p-5">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <Skeleton.Input active size="small" style={{ width: 80, height: 28, marginTop: 4 }} />
          </div>
        ) : (
          <StatCard
            key={key}
            title={label}
            value={stats ? formatValue(key, format, stats) : '0'}
          />
        )
      ))}
    </div>
  )
}
