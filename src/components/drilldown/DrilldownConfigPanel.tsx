import { useCallback, useMemo, type ReactNode } from 'react'
import { UrlTrackingFieldAdd } from '@/components/drilldown/UrlTrackingFieldAdd'
import { GroupedSelect, Tag } from '@/components/ui-kit'
import {
  MAX_DRILLDOWN_GROUPING_LEVELS,
  buildDrilldownGroupingSelectOptions,
  drilldownGroupingShortLabel,
  removeLevelFromRecord,
} from '@/lib/drilldownGroupings'
import {
  formatUrlTrackingFieldLabel,
  isUrlTrackingFieldGroupingToken,
  type UrlTrackingFieldLevelMeta,
} from '@/lib/urlTrackingFieldGrouping'
import { useDrilldownStore } from '@/store/drilldown'

export interface DrilldownConfigPanelProps {
  groupings: string[]
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
  availableGroupings: string[]
  onGroupingsChange: (next: string[]) => void
  onReplaceStack: (
    nextGroupings: string[],
    nextFilters: Record<number, { whitelist: string[]; blacklist: string[] }>,
    nextUrlTracking?: Record<number, UrlTrackingFieldLevelMeta>,
  ) => void
}

function labelForGrouping(
  grouping: string,
  index: number,
  urlTrackingFieldByLevel: Record<number, UrlTrackingFieldLevelMeta>,
): string {
  if (isUrlTrackingFieldGroupingToken(grouping)) {
    const meta = urlTrackingFieldByLevel[index]
    return meta ? formatUrlTrackingFieldLabel(meta) : 'URL tracking field'
  }
  return drilldownGroupingShortLabel(grouping)
}

export function DrilldownConfigPanel({
  groupings,
  groupingFilters,
  availableGroupings,
  onGroupingsChange,
  onReplaceStack,
}: DrilldownConfigPanelProps) {
  const urlTrackingFieldByLevel = useDrilldownStore((s) => s.urlTrackingFieldByLevel)
  const setUrlTrackingFieldLevel = useDrilldownStore((s) => s.setUrlTrackingFieldLevel)

  const filledValues = useMemo(() => groupings.filter((g) => g.trim()), [groupings])

  const groupingOptionGroups = useMemo(
    () => buildDrilldownGroupingSelectOptions(availableGroupings, new Set(), null),
    [availableGroupings],
  )

  const handleGroupingsMultiChange = useCallback(
    (next: string[]) => {
      if (next.length > MAX_DRILLDOWN_GROUPING_LEVELS) return
      const newFilters: Record<number, { whitelist: string[]; blacklist: string[] }> = {}
      const newUrl: Record<number, UrlTrackingFieldLevelMeta> = {}
      for (let newIdx = 0; newIdx < next.length; newIdx++) {
        const value = next[newIdx]!
        const oldIdx = groupings.findIndex((g) => g.trim() === value)
        if (oldIdx < 0) continue
        const f = groupingFilters[oldIdx]
        if (f) newFilters[newIdx] = f
        const u = urlTrackingFieldByLevel[oldIdx]
        if (u) newUrl[newIdx] = u
      }
      onReplaceStack(next, newFilters, newUrl)
    },
    [groupingFilters, groupings, onReplaceStack, urlTrackingFieldByLevel],
  )

  const tagRender = useCallback(
    (props: { label: ReactNode; value: string | number; closable?: boolean; onClose?: () => void }) => {
      const { label, value, closable, onClose } = props
      const idx = filledValues.indexOf(String(value))
      const text =
        idx >= 0
          ? labelForGrouping(String(value), idx, urlTrackingFieldByLevel)
          : String(label ?? value)
      return (
        <Tag
          closable={closable}
          onClose={onClose}
          className="max-w-[200px] truncate text-xs font-medium [&_.ant-tag-close-icon]:ml-2 [&_.ant-tag-close-icon]:-mr-1 [&_.ant-tag-close-icon]:inline-flex [&_.ant-tag-close-icon]:h-5 [&_.ant-tag-close-icon]:w-5 [&_.ant-tag-close-icon]:items-center [&_.ant-tag-close-icon]:justify-center [&_.ant-tag-close-icon]:rounded-sm [&_.ant-tag-close-icon]:text-muted-foreground [&_.ant-tag-close-icon]:transition-colors [&_.ant-tag-close-icon:hover]:bg-muted [&_.ant-tag-close-icon:hover]:text-foreground"
          style={{
            alignItems: 'center',
            backgroundColor: 'color-mix(in srgb, var(--foreground) 11%, var(--background))',
            borderColor: 'color-mix(in srgb, var(--foreground) 22%, var(--background))',
            color: 'var(--foreground)',
            display: 'inline-flex',
            lineHeight: '20px',
            margin: '0 6px 0 0',
            minHeight: 29,
            padding: '3px 8px',
          }}
        >
          {text}
        </Tag>
      )
    },
    [filledValues, urlTrackingFieldByLevel],
  )

  const handleTrackingFieldAdd = useCallback(
    (nextGroupings: string[], meta: UrlTrackingFieldLevelMeta, levelIndex: number) => {
      onGroupingsChange(nextGroupings)
      setUrlTrackingFieldLevel(levelIndex, meta)
    },
    [onGroupingsChange, setUrlTrackingFieldLevel],
  )

  const handleTrackingFieldRemove = useCallback(
    (meta: UrlTrackingFieldLevelMeta) => {
      const levelIndex = Object.entries(urlTrackingFieldByLevel).find(
        ([, levelMeta]) =>
          levelMeta?.trafficSourceId === meta.trafficSourceId && levelMeta?.fieldId === meta.fieldId,
      )?.[0]
      if (levelIndex === undefined) return
      const index = Number(levelIndex)
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

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Groupings:</span>
          <GroupedSelect
            mode="multiple"
            allowClear
            placeholder="Select groupings…"
            className="w-full text-xs [&_.ant-select-selection-overflow]:flex-nowrap [&_.ant-select-selection-overflow-item]:py-0.5 [&_.ant-select-selector]:!py-1"
            optionGroups={groupingOptionGroups}
            value={filledValues}
            onChange={handleGroupingsMultiChange}
            maxCount={MAX_DRILLDOWN_GROUPING_LEVELS}
            tagRender={tagRender}
            maxTagCount="responsive"
          />
        </div>

        <div className="flex w-full shrink-0 flex-col gap-1.5 lg:w-72">
          <span className="text-xs font-semibold text-foreground">Add Tracking Field:</span>
          <UrlTrackingFieldAdd
            groupings={groupings}
            urlTrackingFieldByLevel={urlTrackingFieldByLevel}
            onAdd={handleTrackingFieldAdd}
            onRemove={handleTrackingFieldRemove}
            disabled={false}
          />
        </div>
      </div>
    </div>
  )
}
