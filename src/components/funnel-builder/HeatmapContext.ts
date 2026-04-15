import { createContext } from 'react'

export const HeatmapContext = createContext<{
  active: boolean
  metric: string
  nodeStats: Record<string, Record<string, number>>
}>({ active: false, metric: 'visits', nodeStats: {} })
