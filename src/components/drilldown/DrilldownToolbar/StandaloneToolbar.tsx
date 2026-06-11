import { DrilldownToolbarProvider } from '@/components/drilldown/DrilldownToolbar/Provider'
import { DrilldownToolbarReportActions } from '@/components/drilldown/DrilldownToolbar/ReportActions'
import type { DrilldownToolbarProps } from '@/components/drilldown/DrilldownToolbar/types'

/** Standalone layout (legacy); matches `PageShell` + split rows when not using the shell. */
export function DrilldownToolbar(props: DrilldownToolbarProps) {
  return (
    <DrilldownToolbarProvider {...props}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-2 w-full">
          <DrilldownToolbarReportActions />
        </div>
      </div>
    </DrilldownToolbarProvider>
  )
}
