import { useCallback } from 'react'
import { Drawer } from '@/components/ui-kit'
import { DrilldownFiltersPanel } from '@/components/drilldown/DrilldownFiltersPanel'
import { useDrilldownToolbarContext } from '@/components/drilldown/DrilldownToolbar/useDrilldownToolbarContext'

export function DrilldownFiltersDrawer() {
  const {
    filtersDrawerOpen,
    closeFiltersDrawer,
    groupings,
    groupingFilters,
    setGroupingFilter,
  } = useDrilldownToolbarContext()

  const handleGroupingFilterApply = useCallback(
    (level: number, next: { whitelist: string[]; blacklist: string[] }) => {
      setGroupingFilter(level, 'whitelist', next.whitelist)
      setGroupingFilter(level, 'blacklist', next.blacklist)
    },
    [setGroupingFilter],
  )

  return (
    <Drawer
      title="Grouping filters"
      placement="right"
      width={420}
      open={filtersDrawerOpen}
      onClose={closeFiltersDrawer}
    >
      <DrilldownFiltersPanel
        groupings={groupings}
        groupingFilters={groupingFilters}
        onFilterChange={handleGroupingFilterApply}
      />
    </Drawer>
  )
}
