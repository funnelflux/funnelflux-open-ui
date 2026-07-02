import type { ReactNode } from 'react'
import { DrilldownToolbarContext } from '@/components/drilldown/DrilldownToolbar/useDrilldownToolbarContext'
import { useDrilldownToolbarState } from '@/components/drilldown/DrilldownToolbar/state'
import type { DrilldownToolbarProps } from '@/components/drilldown/DrilldownToolbar/types'

export function DrilldownToolbarProvider({
  children,
  ...props
}: DrilldownToolbarProps & { children: ReactNode }) {
  // `useDrilldownToolbarState` returns a useMemo-stable object, so the context value only
  // changes identity when one of its fields does — consumers don't re-render on unrelated renders.
  const value = useDrilldownToolbarState(props)
  return (
    <DrilldownToolbarContext.Provider value={value}>
      {children}
    </DrilldownToolbarContext.Provider>
  )
}
