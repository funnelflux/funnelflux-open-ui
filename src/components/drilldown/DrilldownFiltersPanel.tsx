import { useMemo } from 'react'
import { GroupingFilterInline } from '@/components/drilldown/GroupingFilterInline'
import { Switch } from '@/components/ui-kit'
import { drilldownGroupingShortLabel } from '@/lib/drilldownGroupings'
import {
  formatUrlTrackingFieldLabel,
  isUrlTrackingFieldGroupingToken,
  type UrlTrackingFieldLevelMeta,
} from '@/lib/urlTrackingFieldGrouping'
import { useDrilldownStore } from '@/store/drilldown'

export interface DrilldownFiltersPanelProps {
  groupings: string[]
  groupingFilters: Record<number, { whitelist: string[]; blacklist: string[] }>
  onFilterChange: (level: number, next: { whitelist: string[]; blacklist: string[] }) => void
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

export function DrilldownFiltersPanel({
  groupings,
  groupingFilters,
  onFilterChange,
}: DrilldownFiltersPanelProps) {
  const filtersEnabled = useDrilldownStore((s) => s.filtersEnabled)
  const setFiltersEnabled = useDrilldownStore((s) => s.setFiltersEnabled)
  const urlTrackingFieldByLevel = useDrilldownStore((s) => s.urlTrackingFieldByLevel)

  const filledValues = useMemo(() => groupings.filter((g) => g.trim()), [groupings])

  const filterLevels = useMemo(
    () =>
      filledValues.map((value, index) => ({
        index,
        grouping: value,
        label: labelForGrouping(value, index, urlTrackingFieldByLevel),
      })),
    [filledValues, urlTrackingFieldByLevel],
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Enable filters</div>
          <p className="text-xs text-muted-foreground">
            When off, whitelist and blacklist values are kept but not sent on Apply or export.
          </p>
        </div>
        <Switch checked={filtersEnabled} onChange={setFiltersEnabled} />
      </div>

      {filtersEnabled && filterLevels.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filterLevels.map(({ index, grouping, label }) => (
            <div key={index} className="space-y-2">
              <div className="text-sm font-medium">{label}</div>
              <GroupingFilterInline
                grouping={grouping}
                filters={groupingFilters[index] ?? { whitelist: [], blacklist: [] }}
                onApply={(next) => onFilterChange(index, next)}
              />
            </div>
          ))}
        </div>
      ) : filtersEnabled ? (
        <p className="text-xs text-muted-foreground">Add groupings in the report bar, then configure filters per level.</p>
      ) : null}
    </div>
  )
}
