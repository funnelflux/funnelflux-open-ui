import { DrilldownToolbarHeaderFilters } from '@/components/drilldown/DrilldownToolbar/HeaderFilters'
import { DrilldownToolbarReportActions } from '@/components/drilldown/DrilldownToolbar/ReportActions'

/** Full control strip (legacy / embedded toolbars): header filters + report actions in one row. */
export function DrilldownToolbarControls() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DrilldownToolbarHeaderFilters />
      <DrilldownToolbarReportActions />
    </div>
  )
}
