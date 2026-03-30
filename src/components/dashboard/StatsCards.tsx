import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
    // API may return "0.00%" already formatted — don't add extra %
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
        <Card key={key}>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : !stats ? (
              <p className="text-xl font-bold tabular-nums">0</p>
            ) : (
              <p className="text-xl font-bold tabular-nums">
                {formatValue(key, format, stats)}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
