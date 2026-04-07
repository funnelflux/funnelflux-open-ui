import { useState, useEffect, type ReactNode } from 'react'
import { Input } from 'antd'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchToolbarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  filters?: ReactNode
  actions?: ReactNode
  trailing?: ReactNode
  className?: string
}

export function SearchToolbar({
  value,
  onChange,
  placeholder = 'Search...',
  filters,
  actions,
  trailing,
  className,
}: SearchToolbarProps) {
  const [internal, setInternal] = useState(value)

  useEffect(() => {
    setInternal(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (internal !== value) onChange(internal)
    }, 300)
    return () => clearTimeout(timer)
  }, [internal, value, onChange])

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Input
        prefix={<Search className="h-4 w-4 text-muted-foreground" />}
        placeholder={placeholder}
        value={internal}
        onChange={(e) => setInternal(e.target.value)}
        allowClear
        onClear={() => { setInternal(''); onChange('') }}
        className="max-w-xs"
      />
      {filters && <div className="flex items-center gap-2">{filters}</div>}
      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      {actions && <div className={cn(!trailing && 'ml-auto', 'flex items-center gap-2')}>{actions}</div>}
    </div>
  )
}
