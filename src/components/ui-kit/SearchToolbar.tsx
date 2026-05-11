import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Icon } from '@/components/ui-kit/icons'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { Input } from './Input'
import { Tooltip } from './Tooltip'

interface SearchToolbarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  filters?: ReactNode
  actions?: ReactNode
  trailing?: ReactNode
  /** Reload list/stats (e.g. invalidate queries). */
  onRefresh?: () => void
  /** Spin refresh while a refetch is in flight. */
  refreshLoading?: boolean
  className?: string
}

export function SearchToolbar({
  value,
  onChange,
  placeholder = 'Search...',
  filters,
  actions,
  trailing,
  onRefresh,
  refreshLoading = false,
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

  const handleRefreshClick = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  const endBar = onRefresh || trailing || actions

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <Input
        prefix={
          <span className="text-muted-foreground inline-flex">
            <Icon name="search" size="md" />
          </span>
        }
        placeholder={placeholder}
        value={internal}
        onChange={(e) => setInternal(e.target.value)}
        allowClear
        onClear={() => { setInternal(''); onChange('') }}
        className="max-w-xs shrink-0"
      />
      {filters && <div className="flex items-center gap-2">{filters}</div>}
      {endBar ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {onRefresh ? (
            <Tooltip title="Refresh">
              <Button
                type="default"
                htmlType="button"
                iconName="refresh-cw"
                loading={refreshLoading}
                onClick={handleRefreshClick}
                aria-label="Refresh"
              />
            </Tooltip>
          ) : null}
          {trailing}
          {actions}
        </div>
      ) : null}
    </div>
  )
}
