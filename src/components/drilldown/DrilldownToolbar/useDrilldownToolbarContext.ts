import { createContext, useContext } from 'react'
import type { DrilldownToolbarContextValue } from '@/components/drilldown/DrilldownToolbar/types'

export const DrilldownToolbarContext = createContext<DrilldownToolbarContextValue | null>(null)

export function useDrilldownToolbarContext(): DrilldownToolbarContextValue {
  const contextValue = useContext(DrilldownToolbarContext)
  if (!contextValue) {
    throw new Error('Drilldown toolbar pieces must be used within DrilldownToolbarProvider')
  }
  return contextValue
}
