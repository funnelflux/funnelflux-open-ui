import type { ReactNode } from 'react'
import { DrilldownToolbarContext } from '@/components/drilldown/DrilldownToolbar/useDrilldownToolbarContext'
import { useDrilldownToolbarState } from '@/components/drilldown/DrilldownToolbar/state'
import type { DrilldownToolbarProps } from '@/components/drilldown/DrilldownToolbar/types'

export function DrilldownToolbarProvider({
  children,
  ...props
}: DrilldownToolbarProps & { children: ReactNode }) {
  const value = useDrilldownToolbarState(props)
  return (
    <DrilldownToolbarContext.Provider value={value}>
      {children}
    </DrilldownToolbarContext.Provider>
  )
}
