import { createContext } from 'react'
import type { FunnelHeatmapMode, FunnelHeatmapStatsByNode } from '@/lib/funnelHeatmap'

export type HeatmapContextValue = {
  active: boolean
  mode: FunnelHeatmapMode
  nodeStats: FunnelHeatmapStatsByNode
  intensityMax: number
  isLoading: boolean
}

export const HeatmapContext = createContext<HeatmapContextValue>({
  active: false,
  mode: 'trafficFlow',
  nodeStats: {},
  intensityMax: 0,
  isLoading: false,
})
