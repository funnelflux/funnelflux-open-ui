import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useTrafficSource } from '@/api/hooks/useTrafficSources'
import { Button, Input, Popover, VirtualizedSelect } from '@/components/ui-kit'
import type { SelectOption } from '@/components/ui-kit'
import {
  formatUrlTrackingFieldLabel,
  nextFreeUrlTrackingFieldSlot,
  trackingFieldConstantForSlot,
  type UrlTrackingFieldLevelMeta,
} from '@/lib/urlTrackingFieldGrouping'
import { MAX_DRILLDOWN_GROUPING_LEVELS } from '@/lib/drilldownGroupings'
import { cn } from '@/lib/utils'

type TrafficSourceListRow = {
  id?: string
  name?: string
  categoryId?: string
  idTrafficSource?: string
  trafficSourceName?: string
}

type CategoryRow = { id?: string; name?: string }

interface UrlTrackingFieldAddProps {
  groupings: string[]
  urlTrackingFieldByLevel: Record<number, UrlTrackingFieldLevelMeta>
  onAdd: (nextGroupings: string[], meta: UrlTrackingFieldLevelMeta, levelIndex: number) => void
  onRemove: (meta: UrlTrackingFieldLevelMeta) => void
  disabled?: boolean
}

export function UrlTrackingFieldAdd({
  groupings,
  urlTrackingFieldByLevel,
  onAdd,
  onRemove,
  disabled = false,
}: UrlTrackingFieldAddProps) {
  const [open, setOpen] = useState(false)
  const [selectedTsId, setSelectedTsId] = useState('')

  const filledCount = groupings.filter((g) => g.trim()).length
  const atMax = filledCount >= MAX_DRILLDOWN_GROUPING_LEVELS

  // Kept fresh by invalidateCategoryData (trafficsource category CRUD).
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.trafficSources.categories,
    queryFn: () => api.get<CategoryRow[]>('/data/trafficsource/category/list/'),
    enabled: open && !disabled,
  })

  // Same key + endpoint as the canonical `useTrafficSources()` fetcher (lazy: only while open).
  // Default staleTime (Infinity) applies; traffic-source CRUD invalidations keep it fresh.
  const { data: trafficSources = [] } = useQuery({
    queryKey: queryKeys.trafficSources.list({}),
    queryFn: () => api.get<TrafficSourceListRow[]>('/data/trafficsource/list/'),
    enabled: open && !disabled,
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

  const usedFieldKeys = useMemo(() => {
    const s = new Set<string>()
    for (const m of Object.values(urlTrackingFieldByLevel)) {
      if (m) s.add(`${m.trafficSourceId}\t${m.fieldId}`)
    }
    return s
  }, [urlTrackingFieldByLevel])

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
      const composite = selectedTsId && fieldKey ? `${selectedTsId}\t${fieldKey}` : ''
      const isSelected = composite !== '' && usedFieldKeys.has(composite)
      return { fieldKey, index1Based, label, isSelected, disabledField: !fieldKey }
    })
  }, [selectedTrafficSource, selectedTsId, usedFieldKeys])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (disabled) return
      if (!next) setSelectedTsId('')
      setOpen(next)
    },
    [disabled],
  )

  const handlePopoverContentMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault()
  }, [])

  const handleFieldToggle = useCallback(
    (fieldKey: string, index1Based: number, isSelected: boolean) => {
      if (!selectedTsId || !fieldKey) return
      const row = trafficSources.find((t) => String(t.idTrafficSource ?? t.id) === selectedTsId)
      const meta: UrlTrackingFieldLevelMeta = {
        fieldId: fieldKey,
        trafficSourceId: selectedTsId,
        trafficSourceName:
          selectedTrafficSource?.trafficSourceName ?? row?.trafficSourceName ?? row?.name ?? '',
        index1Based,
      }
      if (isSelected) {
        onRemove(meta)
        return
      }
      if (atMax) return
      const filled = groupings.filter((g) => g.trim())
      const slot = nextFreeUrlTrackingFieldSlot(filled)
      const token = trackingFieldConstantForSlot(slot)
      const nextGroupings = [...filled, token]
      onAdd(nextGroupings, meta, nextGroupings.length - 1)
    },
    [
      atMax,
      groupings,
      onAdd,
      onRemove,
      selectedTrafficSource?.trafficSourceName,
      selectedTsId,
      trafficSources,
    ],
  )

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomLeft"
      content={
        <div className="w-[22rem] space-y-3" role="presentation" onMouseDown={handlePopoverContentMouseDown}>
          <div>
            <p className="text-sm font-medium">URL tracking field</p>
            <p className="text-xs text-muted-foreground">
              Choose a traffic source, then toggle fields (C1, C2, …). Click outside to close.
            </p>
          </div>
          <VirtualizedSelect
            allowClear
            showSearch
            placeholder="Search traffic source…"
            options={trafficSourceOptions}
            value={selectedTsId || undefined}
            onChange={(v) => setSelectedTsId(v ?? '')}
            listHeight={200}
            className="text-xs w-full"
            getPopupContainer={() => document.body}
            dropdownStyle={{ zIndex: 2000 }}
          />
          {selectedTsId ? (
            <div className="space-y-1 border-t border-border pt-3 max-h-56 overflow-y-auto">
              {tsDetailLoading ? (
                <p className="text-xs text-muted-foreground py-2">Loading fields…</p>
              ) : fieldRows.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No URL parameters on this source.</p>
              ) : (
                fieldRows.map((row) => (
                  <Button
                    key={`${row.fieldKey}-${row.index1Based}`}
                    htmlType="button"
                    type="text"
                    block
                    disabled={row.disabledField}
                    className={cn(
                      'justify-start h-auto py-2 text-xs',
                      row.isSelected && 'bg-primary/10 text-primary font-medium',
                      row.disabledField && 'opacity-50',
                    )}
                    onClick={() => handleFieldToggle(row.fieldKey, row.index1Based, row.isSelected)}
                  >
                    <span className="mr-2 inline-block w-3 text-center" aria-hidden>
                      {row.isSelected ? '✓' : ''}
                    </span>
                    {row.label}
                  </Button>
                ))
              )}
            </div>
          ) : null}
        </div>
      }
    >
      <Input
        readOnly
        placeholder={atMax ? 'Max groupings reached' : 'Add Tracking Field…'}
        className="text-xs cursor-pointer"
        disabled={disabled || atMax}
        onClick={() => !disabled && setOpen(true)}
      />
    </Popover>
  )
}
