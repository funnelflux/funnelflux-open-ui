import { memo, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { GroupingFilterPopover } from '@/components/drilldown/GroupingFilterPopover'
import { Button, GroupedSelect } from '@/components/ui-kit'
import {
  MAX_DRILLDOWN_GROUPING_LEVELS,
  buildDrilldownGroupingSelectOptions,
  reorderGroupingLevels,
} from '@/lib/drilldownGroupings'

export interface GroupingsLevelsEditorProps {
  groupings: string[]
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
  availableGroupings: string[]
  onGroupingsChange: (next: string[]) => void
  onReplaceStack: (
    nextGroupings: string[],
    nextFilters: Record<number, { whitelist: string[]; blacklist: string[] }>,
  ) => void
  onFilterChange: (level: number, next: { whitelist: string[]; blacklist: string[] }) => void
}

const GroupingLevelEditorRow = memo(function GroupingLevelEditorRow({
  index,
  totalLevels,
  grouping,
  groupedOptions,
  levelFilters,
  onLevelValueChange,
  onRemoveLevel,
  onMoveLevel,
  onFilterChangeAtLevel,
}: {
  index: number
  totalLevels: number
  grouping: string
  groupedOptions: ReturnType<typeof buildDrilldownGroupingSelectOptions>
  levelFilters: { whitelist: string[]; blacklist: string[] }
  onLevelValueChange: (index: number, value: string) => void
  onRemoveLevel: (index: number) => void
  onMoveLevel: (from: number, to: number) => void
  onFilterChangeAtLevel: (level: number, next: { whitelist: string[]; blacklist: string[] }) => void
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

  const canRemove = totalLevels > 1
  const canMoveUp = index > 0
  const canMoveDown = index < totalLevels - 1

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
            icon={<ChevronUp className="h-4 w-4" />}
            onClick={handleMoveUp}
            disabled={!canMoveUp}
            aria-label="Move level up"
          />
          <Button
            htmlType="button"
            type="text"
            size="small"
            className="h-8 w-8 min-w-8 px-0"
            icon={<ChevronDown className="h-4 w-4" />}
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
          {canRemove ? (
            <Button
              htmlType="button"
              type="text"
              size="small"
              className="h-8 w-8 min-w-8 px-0"
              icon={<X className="h-3.5 w-3.5" />}
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
      const next = [...groupings]
      next[idx] = value
      onGroupingsChange(next)
    },
    [groupings, onGroupingsChange],
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
      onReplaceStack(nextGroupings, reindexed)
    },
    [groupingFilters, groupings, onReplaceStack],
  )

  const handleMoveLevel = useCallback(
    (fromIndex: number, toIndex: number) => {
      const r = reorderGroupingLevels(groupings, groupingFilters, fromIndex, toIndex)
      if (!r) return
      onReplaceStack(r.groupings, r.groupingFilters)
    },
    [groupingFilters, groupings, onReplaceStack],
  )

  const handleFilterAtLevel = useCallback(
    (level: number, next: { whitelist: string[]; blacklist: string[] }) => {
      onFilterChange(level, next)
    },
    [onFilterChange],
  )

  const rowGroupedOptions = useMemo(() => {
    return groupings.map((_, index) =>
      buildDrilldownGroupingSelectOptions(availableGroupings, usedAtOtherLevels(index)),
    )
  }, [availableGroupings, groupings, usedAtOtherLevels])

  const canAddLevel = groupings.length < MAX_DRILLDOWN_GROUPING_LEVELS

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Add up to {MAX_DRILLDOWN_GROUPING_LEVELS} levels. Order matters for the report hierarchy.
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
            onLevelValueChange={handleLevelValueChange}
            onRemoveLevel={handleRemoveLevel}
            onMoveLevel={handleMoveLevel}
            onFilterChangeAtLevel={handleFilterAtLevel}
          />
        ))}
      </div>
      {canAddLevel ? (
        <Button className="text-xs w-fit" onClick={handleAdd} icon={<Plus className="h-3.5 w-3.5" />}>
          Add level
        </Button>
      ) : null}
    </div>
  )
}
