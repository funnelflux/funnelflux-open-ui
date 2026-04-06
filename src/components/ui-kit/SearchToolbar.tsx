import type { ReactNode } from 'react'
import { Input } from 'antd'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchToolbarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  filters?: ReactNode
  actions?: ReactNode
  className?: string
}

export function SearchToolbar({
  value,
  onChange,
  placeholder = 'Search...',
  filters,
  actions,
  className,
}: SearchToolbarProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Input
        prefix={<Search className="h-4 w-4 text-muted-foreground" />}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        allowClear
        className="max-w-xs"
      />
      {filters && <div className="flex items-center gap-2">{filters}</div>}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
