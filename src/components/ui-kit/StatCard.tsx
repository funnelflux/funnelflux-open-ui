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
}

export function StatCard({
  title,
  value,
  prefix,
  suffix,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('', className)} styles={{ body: { padding: 20 } }}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        {prefix && <span className="text-muted-foreground">{prefix}</span>}
        <span className="text-2xl font-semibold text-foreground">{value}</span>
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
