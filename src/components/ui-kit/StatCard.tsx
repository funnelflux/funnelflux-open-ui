import { Card } from 'antd'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  prefix?: ReactNode
  suffix?: string
  trend?: { value: number; label?: string }
  className?: string
  valueClassName?: string
  /** Smaller padding and value size (e.g. dashboard summary grid). */
  compact?: boolean
}

export function StatCard({
  title,
  value,
  prefix,
  suffix,
  trend,
  className,
  valueClassName,
  compact = false,
}: StatCardProps) {
  return (
    <Card
      className={cn('h-full min-h-0', className)}
      styles={{ body: { padding: compact ? 12 : 20 } }}
    >
      <p className={cn('font-medium text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
        {title}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        {prefix && <span className="text-muted-foreground">{prefix}</span>}
        <span
          className={cn(
            'font-semibold text-foreground',
            compact ? 'text-lg' : 'text-2xl',
            valueClassName,
          )}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
      {trend && (
        <p
          className={cn(
            'text-xs mt-1.5',
            trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-error' : 'text-muted-foreground',
          )}
        >
          {trend.value > 0 ? '+' : ''}
          {trend.value}%{trend.label && ` ${trend.label}`}
        </p>
      )}
    </Card>
  )
}
