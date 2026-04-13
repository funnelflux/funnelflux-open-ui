import { createContext } from 'react'

export type HeatmapContextValue = {
  active: boolean
  metric: string
  nodeStats: Record<string, Record<string, number>>
}

export const HeatmapContext = createContext<HeatmapContextValue>({
  active: false,
  metric: 'visits',
  nodeStats: {},
})
