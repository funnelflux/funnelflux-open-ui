import { memo, useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useTrafficSource } from '@/api/hooks/useTrafficSources'
import { Button, Popover, VirtualizedSelect } from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import {
  formatUrlTrackingFieldLabel,
  type UrlTrackingFieldLevelMeta,
} from '@/lib/urlTrackingFieldGrouping'
import { cn } from '@/lib/utils'

type TrafficSourceListRow = {
  id?: string
  name?: string
  categoryId?: string
  idTrafficSource?: string
  trafficSourceName?: string
}

type CategoryRow = { id?: string; name?: string }

const FieldPickRow = memo(function FieldPickRow({
  fieldKey,
  index1Based,
  label,
  disabled,
  onActivate,
}: {
  fieldKey: string
  index1Based: number
  label: string
  disabled: boolean
  onActivate: (fieldKey: string, index1Based: number) => void
}) {
  const handleClick = useCallback(() => {
    if (!disabled) onActivate(fieldKey, index1Based)
  }, [disabled, fieldKey, index1Based, onActivate])

  return (
    <Button
      htmlType="button"
      type="text"
      block
      disabled={disabled}
      className={cn('justify-start h-auto py-2 text-xs', disabled && 'opacity-50')}
      onClick={handleClick}
    >
      {label}
    </Button>
  )
})

export interface UrlTrackingFieldPickerPopoverProps {
  levelIndex: number
  disabled?: boolean
  grouping: string
  currentMeta: UrlTrackingFieldLevelMeta | undefined
  /** All levels' picks — used to hide fields already used at another level. */
  allUrlMeta: Record<number, UrlTrackingFieldLevelMeta>
  levelCount: number
  onPick: (meta: UrlTrackingFieldLevelMeta) => void
}

export function UrlTrackingFieldPickerPopover({
  levelIndex,
  disabled = false,
  grouping,
  currentMeta,
  allUrlMeta,
  levelCount,
  onPick,
}: UrlTrackingFieldPickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const [selectedTsId, setSelectedTsId] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.trafficSources.categories,
    queryFn: () => api.get<CategoryRow[]>('/data/trafficsource/category/list/'),
    enabled: open && !disabled,
    staleTime: 60_000,
  })

  const { data: trafficSources = [] } = useQuery({
    queryKey: queryKeys.trafficSources.list({}),
    queryFn: () => api.get<TrafficSourceListRow[]>('/data/trafficsource/list/'),
    enabled: open && !disabled,
    staleTime: 60_000,
  })

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) {
      const id = c.id != null ? String(c.id) : ''
      m.set(id, c.name != null && String(c.name).trim() !== '' ? String(c.name) : 'Category')
    }
    return m
  }, [categories])

  const trafficSourceOptions = useMemo((): SelectOption[] => {
    const list = Array.isArray(trafficSources) ? trafficSources : []
    const rows: SelectOption[] = []
    for (const t of list) {
      const id = t.idTrafficSource ?? t.id
      if (id == null || String(id).trim() === '') continue
      const sid = String(id)
      const name = t.trafficSourceName ?? t.name ?? sid
      const rawCat = t.categoryId != null ? String(t.categoryId) : ''
      const catLabel = categoryNameById.get(rawCat) ?? 'Uncategorized'
      rows.push({
        label: `${catLabel} — ${name}`,
        value: sid,
        searchId: sid,
      })
    }
    rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
    return rows
  }, [categoryNameById, trafficSources])

  const { data: selectedTrafficSource, isLoading: tsDetailLoading } = useTrafficSource(selectedTsId)

  useEffect(() => {
    if (!open) return
    if (currentMeta?.trafficSourceId) {
      setSelectedTsId(currentMeta.trafficSourceId)
    } else {
      setSelectedTsId('')
    }
  }, [open, currentMeta?.trafficSourceId])

  const usedFieldKeys = useMemo(() => {
    const s = new Set<string>()
    for (let i = 0; i < levelCount; i++) {
      if (i === levelIndex) continue
      const m = allUrlMeta[i]
      if (m) s.add(`${m.trafficSourceId}\t${m.fieldId}`)
    }
    return s
  }, [allUrlMeta, levelCount, levelIndex])

  const fieldRows = useMemo(() => {
    const pairs = selectedTrafficSource?.trackingFields ?? []
    return pairs.map((pair, i) => {
      const fieldKey = String(pair.key ?? '').trim()
      const index1Based = i + 1
      const label = formatUrlTrackingFieldLabel({
        fieldId: fieldKey || `field_${index1Based}`,
        trafficSourceId: selectedTrafficSource?.idTrafficSource ?? selectedTsId,
        trafficSourceName: selectedTrafficSource?.trafficSourceName ?? '',
        index1Based,
      })
      const composite =
        selectedTsId && fieldKey ? `${selectedTsId}\t${fieldKey}` : ''
      const disabledField =
        !fieldKey || (composite !== '' && usedFieldKeys.has(composite))
      return { fieldKey, index1Based, label, disabledField }
    })
  }, [selectedTrafficSource, selectedTsId, usedFieldKeys])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (disabled) return
      setOpen(next)
    },
    [disabled],
  )

  /** Keeps focus inside the Select when nested in a Popover (antd + rc-select). */
  const handlePopoverContentMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault()
  }, [])

  const handleTsChange = useCallback((nextId: string | null | undefined) => {
    setSelectedTsId(nextId ?? '')
  }, [])

  const handleFieldActivate = useCallback(
    (fieldKey: string, index1Based: number) => {
      if (!selectedTsId || !fieldKey) return
      const row = trafficSources.find((t) => String(t.idTrafficSource ?? t.id) === selectedTsId)
      const tsName =
        selectedTrafficSource?.trafficSourceName ??
        row?.trafficSourceName ??
        row?.name ??
        ''
      const meta: UrlTrackingFieldLevelMeta = {
        fieldId: fieldKey,
        trafficSourceId: selectedTsId,
        trafficSourceName: tsName,
        index1Based,
      }
      onPick(meta)
      setOpen(false)
    },
    [onPick, selectedTrafficSource?.trafficSourceName, selectedTsId, trafficSources],
  )

  const isConfigured = Boolean(currentMeta?.fieldId)
  const isActive = isConfigured

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomLeft"
      content={
        <div className="w-[22rem] space-y-3" onMouseDown={handlePopoverContentMouseDown}>
          <div>
            <p className="text-sm font-medium">URL tracking fields</p>
            <p className="text-xs text-muted-foreground">
              Pick a traffic source (scroll or type to filter by name or ID), then choose a field (C1, C2, …).
              Fields already used in another level are disabled.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Traffic source</span>
            <VirtualizedSelect
              allowClear
              showSearch
              placeholder="Search by traffic source name or ID…"
              options={trafficSourceOptions}
              value={selectedTsId || undefined}
              onChange={handleTsChange}
              notFoundContent="No traffic sources match"
              listHeight={240}
              className="text-xs"
              getPopupContainer={() => document.body}
              dropdownStyle={{ zIndex: 2000 }}
            />
          </div>

          {selectedTsId ? (
            <div className="space-y-1 border-t border-border pt-3">
              <span className="text-xs font-medium text-muted-foreground">Field</span>
              {tsDetailLoading ? (
                <p className="text-xs text-muted-foreground py-2">Loading fields…</p>
              ) : fieldRows.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No URL parameters on this source.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded border border-border divide-y divide-border">
                  {fieldRows.map((row) => (
                    <FieldPickRow
                      key={`${row.fieldKey}-${row.index1Based}`}
                      fieldKey={row.fieldKey}
                      index1Based={row.index1Based}
                      label={row.label}
                      disabled={row.disabledField}
                      onActivate={handleFieldActivate}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      }
    >
      <Button
        htmlType="button"
        type="text"
        disabled={disabled}
        className={cn('relative h-[35px] w-8 min-w-8 px-0', isActive && 'text-foreground')}
        iconName="list-tree"
        iconSize="sm"
        title="URL tracking field"
        aria-label={`URL tracking field, level ${levelIndex + 1}${grouping ? `, ${grouping}` : ''}`}
      >
        {!isConfigured ? (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
        ) : null}
        <span className="sr-only">Configure URL tracking field</span>
      </Button>
    </Popover>
  )
}
