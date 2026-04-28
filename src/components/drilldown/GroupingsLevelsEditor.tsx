import { memo, useCallback, useMemo } from 'react'
import { GroupingFilterPopover } from '@/components/drilldown/GroupingFilterPopover'
import { UrlTrackingFieldPickerPopover } from '@/components/drilldown/UrlTrackingFieldPickerPopover'
import { Button, GroupedSelect } from '@/components/ui-kit'
import {
  MAX_DRILLDOWN_GROUPING_LEVELS,
  buildDrilldownGroupingSelectOptions,
  removeLevelFromRecord,
  reorderGroupingLevels,
  reorderLevelRecord,
} from '@/lib/drilldownGroupings'
import {
  URL_TRACKING_FIELD_GROUP_BY,
  formatUrlTrackingFieldLabel,
  isUrlTrackingFieldGroupingToken,
  nextFreeUrlTrackingFieldSlot,
  trackingFieldConstantForSlot,
  type UrlTrackingFieldLevelMeta,
} from '@/lib/urlTrackingFieldGrouping'
import { useDrilldownStore } from '@/store/drilldown'

export interface GroupingsLevelsEditorProps {
  groupings: string[]
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
  availableGroupings: string[]
  onGroupingsChange: (next: string[]) => void
  onReplaceStack: (
    nextGroupings: string[],
    nextFilters: Record<number, { whitelist: string[]; blacklist: string[] }>,
    nextUrlTracking?: Record<number, UrlTrackingFieldLevelMeta>,
  ) => void
  onFilterChange: (level: number, next: { whitelist: string[]; blacklist: string[] }) => void
}

const GroupingLevelEditorRow = memo(function GroupingLevelEditorRow({
  index,
  totalLevels,
  grouping,
  groupedOptions,
  levelFilters,
  urlTrackingMeta,
  allUrlTrackingMeta,
  onLevelValueChange,
  onRemoveLevel,
  onMoveLevel,
  onFilterChangeAtLevel,
  onUrlTrackingPick,
}: {
  index: number
  totalLevels: number
  grouping: string
  groupedOptions: ReturnType<typeof buildDrilldownGroupingSelectOptions>
  levelFilters: { whitelist: string[]; blacklist: string[] }
  urlTrackingMeta: UrlTrackingFieldLevelMeta | undefined
  allUrlTrackingMeta: Record<number, UrlTrackingFieldLevelMeta>
  onLevelValueChange: (index: number, value: string) => void
  onRemoveLevel: (index: number) => void
  onMoveLevel: (from: number, to: number) => void
  onFilterChangeAtLevel: (level: number, next: { whitelist: string[]; blacklist: string[] }) => void
  onUrlTrackingPick: (level: number, meta: UrlTrackingFieldLevelMeta) => void
}) {
  const handleSelectChange = useCallback(
    (v: string | null | undefined) => {
      onLevelValueChange(index, v ?? '')
    },
    [index, onLevelValueChange],
  )

  const handleRemoveClick = useCallback(() => {
    onRemoveLevel(index)
  }, [index, onRemoveLevel])

  const handleMoveUp = useCallback(() => {
    onMoveLevel(index, index - 1)
  }, [index, onMoveLevel])

  const handleMoveDown = useCallback(() => {
    onMoveLevel(index, index + 1)
  }, [index, onMoveLevel])

  const handleFilterApply = useCallback(
    (next: { whitelist: string[]; blacklist: string[] }) => {
      onFilterChangeAtLevel(index, next)
    },
    [index, onFilterChangeAtLevel],
  )

  const handleUrlPick = useCallback(
    (meta: UrlTrackingFieldLevelMeta) => {
      onUrlTrackingPick(index, meta)
    },
    [index, onUrlTrackingPick],
  )

  const canRemove = totalLevels > 1
  const canMoveUp = index > 0
  const canMoveDown = index < totalLevels - 1
  const showUrlPicker = isUrlTrackingFieldGroupingToken(grouping)

  return (
    <div className="flex gap-3 w-full items-start border-b border-border pb-4 last:border-0 last:pb-0">
      <span className="text-xs font-medium text-muted-foreground w-8 shrink-0 pt-2 tabular-nums">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <GroupedSelect
          value={grouping.trim() ? grouping : undefined}
          onChange={handleSelectChange}
          placeholder="Select grouping"
          allowClear
          size="middle"
          className="w-full max-w-full text-xs"
          optionGroups={groupedOptions}
        />
        <div className="flex flex-wrap items-center gap-1">
          <Button
            htmlType="button"
            type="text"
            size="small"
            className="h-8 w-8 min-w-8 px-0"
            iconName="chevron-up"
            iconSize="md"
            onClick={handleMoveUp}
            disabled={!canMoveUp}
            aria-label="Move level up"
          />
          <Button
            htmlType="button"
            type="text"
            size="small"
            className="h-8 w-8 min-w-8 px-0"
            iconName="chevron-down"
            iconSize="md"
            onClick={handleMoveDown}
            disabled={!canMoveDown}
            aria-label="Move level down"
          />
          <GroupingFilterPopover
            grouping={grouping}
            filters={levelFilters}
            onApply={handleFilterApply}
            filterDisabled={!grouping.trim()}
          />
          {showUrlPicker ? (
            <UrlTrackingFieldPickerPopover
              levelIndex={index}
              grouping={grouping}
              disabled={!grouping.trim()}
              currentMeta={urlTrackingMeta}
              allUrlMeta={allUrlTrackingMeta}
              levelCount={totalLevels}
              onPick={handleUrlPick}
            />
          ) : null}
          {canRemove ? (
            <Button
              htmlType="button"
              type="text"
              size="small"
              className="h-8 w-8 min-w-8 px-0"
              iconName="x"
              iconSize="sm"
              onClick={handleRemoveClick}
              aria-label="Remove level"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
})

export function GroupingsLevelsEditor({
  groupings,
  groupingFilters,
  availableGroupings,
  onGroupingsChange,
  onReplaceStack,
  onFilterChange,
}: GroupingsLevelsEditorProps) {
  const urlTrackingFieldByLevel = useDrilldownStore((s) => s.urlTrackingFieldByLevel)
  const setUrlTrackingFieldLevel = useDrilldownStore((s) => s.setUrlTrackingFieldLevel)

  const usedAtOtherLevels = useCallback(
    (currentIndex: number) => {
      const used = new Set<string>()
      groupings.forEach((g, i) => {
        if (i !== currentIndex && g.trim()) used.add(g)
      })
      return used
    },
    [groupings],
  )

  const handleLevelValueChange = useCallback(
    (idx: number, value: string) => {
      const prev = groupings[idx] ?? ''
      let resolved = value
      if (value.trim() === URL_TRACKING_FIELD_GROUP_BY) {
        const others = groupings.map((g, i) => (i === idx ? '' : g))
        const slot = nextFreeUrlTrackingFieldSlot(others)
        resolved = trackingFieldConstantForSlot(slot)
      }
      const next = [...groupings]
      next[idx] = resolved
      onGroupingsChange(next)

      const wasUrl = isUrlTrackingFieldGroupingToken(prev)
      const isUrl = isUrlTrackingFieldGroupingToken(resolved)
      if (!isUrl) {
        setUrlTrackingFieldLevel(idx, null)
      } else if (!wasUrl || resolved !== prev) {
        setUrlTrackingFieldLevel(idx, null)
      }
    },
    [groupings, onGroupingsChange, setUrlTrackingFieldLevel],
  )

  const handleUrlTrackingPick = useCallback(
    (level: number, meta: UrlTrackingFieldLevelMeta) => {
      setUrlTrackingFieldLevel(level, meta)
    },
    [setUrlTrackingFieldLevel],
  )

  const handleAdd = useCallback(() => {
    if (groupings.length >= MAX_DRILLDOWN_GROUPING_LEVELS) return
    onGroupingsChange([...groupings, ''])
  }, [groupings, onGroupingsChange])

  const handleRemoveLevel = useCallback(
    (index: number) => {
      const nextGroupings = groupings.filter((_, i) => i !== index)
      const reindexed: Record<number, { whitelist: string[]; blacklist: string[] }> = {}
      for (let old = 0; old < groupings.length; old++) {
        if (old === index) continue
        const newIdx = old < index ? old : old - 1
        const f = groupingFilters[old]
        if (f) reindexed[newIdx] = f
      }
      const reindexedUrl = removeLevelFromRecord(urlTrackingFieldByLevel, index, groupings.length)
      onReplaceStack(nextGroupings, reindexed, reindexedUrl)
    },
    [groupingFilters, groupings, onReplaceStack, urlTrackingFieldByLevel],
  )

  const handleMoveLevel = useCallback(
    (fromIndex: number, toIndex: number) => {
      const r = reorderGroupingLevels(groupings, groupingFilters, fromIndex, toIndex)
      if (!r) return
      const urlR = reorderLevelRecord(urlTrackingFieldByLevel, groupings.length, fromIndex, toIndex)
      if (!urlR) return
      onReplaceStack(r.groupings, r.groupingFilters, urlR)
    },
    [groupingFilters, groupings, onReplaceStack, urlTrackingFieldByLevel],
  )

  const handleFilterAtLevel = useCallback(
    (level: number, next: { whitelist: string[]; blacklist: string[] }) => {
      onFilterChange(level, next)
    },
    [onFilterChange],
  )

  const rowGroupedOptions = useMemo(() => {
    return groupings.map((g, index) => {
      const meta = urlTrackingFieldByLevel[index]
      const urlSlot =
        isUrlTrackingFieldGroupingToken(g) && g.trim()
          ? {
              value: g.trim(),
              label: meta ? formatUrlTrackingFieldLabel(meta) : 'URL tracking field',
            }
          : null
      return buildDrilldownGroupingSelectOptions(
        availableGroupings,
        usedAtOtherLevels(index),
        urlSlot,
      )
    })
  }, [availableGroupings, groupings, usedAtOtherLevels, urlTrackingFieldByLevel])

  const canAddLevel = groupings.length < MAX_DRILLDOWN_GROUPING_LEVELS

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Add up to {MAX_DRILLDOWN_GROUPING_LEVELS} levels. Order matters for the report hierarchy. For{' '}
        <span className="font-medium">URL tracking field</span>, use the list button beside the filter to
        choose C1, C2, etc.
      </p>
      <div className="flex flex-col gap-4">
        {groupings.map((grouping, index) => (
          <GroupingLevelEditorRow
            key={index}
            index={index}
            totalLevels={groupings.length}
            grouping={grouping}
            groupedOptions={rowGroupedOptions[index] ?? []}
            levelFilters={groupingFilters[index] ?? { whitelist: [], blacklist: [] }}
            urlTrackingMeta={urlTrackingFieldByLevel[index]}
            allUrlTrackingMeta={urlTrackingFieldByLevel}
            onLevelValueChange={handleLevelValueChange}
            onRemoveLevel={handleRemoveLevel}
            onMoveLevel={handleMoveLevel}
            onFilterChangeAtLevel={handleFilterAtLevel}
            onUrlTrackingPick={handleUrlTrackingPick}
          />
        ))}
      </div>
      {canAddLevel ? (
        <Button className="text-xs w-fit" onClick={handleAdd} iconName="plus" iconSize="sm">
          Add level
        </Button>
      ) : null}
    </div>
  )
}
