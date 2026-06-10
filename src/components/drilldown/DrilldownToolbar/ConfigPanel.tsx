import { DrilldownConfigPanel } from '@/components/drilldown/DrilldownConfigPanel'
import { useDrilldownStore } from '@/store/drilldown'
import { useDrilldownToolbarContext } from '@/components/drilldown/DrilldownToolbar/useDrilldownToolbarContext'

/** Groupings + tracking field strip above the table. */
export function DrilldownToolbarConfigPanel() {
  const {
    groupings,
    groupingFilters,
    availableGroupings,
    setGroupings,
  } = useDrilldownToolbarContext()
  const replaceGroupingsStack = useDrilldownStore((s) => s.replaceGroupingsStack)

  return (
    <DrilldownConfigPanel
      groupings={groupings}
      groupingFilters={groupingFilters}
      availableGroupings={availableGroupings ?? []}
      onGroupingsChange={setGroupings}
      onReplaceStack={replaceGroupingsStack}
    />
  )
}

/** @deprecated Use {@link DrilldownToolbarConfigPanel} above the table. */
export function DrilldownToolbarGroupings() {
  return <DrilldownToolbarConfigPanel />
}
