import { describe, expect, it } from 'vitest'
import {
  buildNodeHeatmapStatsFromReport,
  FUNNEL_HEATMAP_GROUP_BY,
  FUNNEL_HEATMAP_METRIC,
  getFunnelHeatmapIntensityMax,
} from './funnelHeatmap'
import type { Report, ReportCell, ReportColumn, ReportRow } from '@/types/stats'

const columns: ReportColumn[] = [
  { name: FUNNEL_HEATMAP_GROUP_BY.elementFunnel, type: 'grouping' },
  { name: FUNNEL_HEATMAP_GROUP_BY.elementNodeId, type: 'grouping' },
  { name: FUNNEL_HEATMAP_GROUP_BY.elementNodeName, type: 'grouping' },
  { name: FUNNEL_HEATMAP_METRIC.nodeViews, type: 'metric' },
  { name: FUNNEL_HEATMAP_METRIC.uniqueNodeViews, type: 'metric' },
  { name: FUNNEL_HEATMAP_METRIC.uniqueLanderClicks, type: 'metric' },
  { name: FUNNEL_HEATMAP_METRIC.uniqueOfferClicks, type: 'metric' },
  { name: FUNNEL_HEATMAP_METRIC.revenue, type: 'metric' },
  { name: FUNNEL_HEATMAP_METRIC.conversions, type: 'metric' },
  { name: FUNNEL_HEATMAP_METRIC.lifetimeRevenue, type: 'metric' },
  { name: FUNNEL_HEATMAP_METRIC.lifetimeConversions, type: 'metric' },
]

function cell(raw: string | number): ReportCell {
  return { raw, formatted: String(raw) }
}

function row(cells: Array<string | number>): ReportRow {
  return {
    rowId: String(cells[1]),
    cells: cells.map(cell),
  }
}

function report(rows: ReportRow[]): Report {
  return {
    columns,
    rows,
    totals: { cells: [] },
    rowsReturned: rows.length,
    rowsTotal: rows.length,
  }
}

describe('funnel heatmap report mapping', () => {
  it('matches large string node ids without numeric coercion', () => {
    const largeNodeId = '1713659052351087732'
    const stats = buildNodeHeatmapStatsFromReport(
      report([
        row(['funnel-1', largeNodeId, 'Node A', 10, 8, 1, 0, 12.5, 2, 20, 3]),
      ]),
    )

    expect(Object.keys(stats)).toEqual([largeNodeId])
    expect(stats[largeNodeId]?.nodeId).toBe(largeNodeId)
  })

  it('calculates direct and lifetime EPV from revenue and node views', () => {
    const stats = buildNodeHeatmapStatsFromReport(
      report([
        row(['funnel-1', 'node-1', 'Node A', 20, 18, 0, 0, 10, 2, 30, 4]),
      ]),
    )

    expect(stats['node-1']?.directEpv).toBe(0.5)
    expect(stats['node-1']?.lifetimeEpv).toBe(1.5)
  })

  it('computes max intensity for each selected heatmap mode', () => {
    const stats = buildNodeHeatmapStatsFromReport(
      report([
        row(['funnel-1', 'node-a', 'Node A', 10, 9, 0, 0, 20, 2, 30, 3]),
        row(['funnel-1', 'node-b', 'Node B', 5, 4, 0, 0, 40, 8, 100, 10]),
      ]),
    )

    expect(getFunnelHeatmapIntensityMax(stats, 'trafficFlow')).toBe(10)
    expect(getFunnelHeatmapIntensityMax(stats, 'directValueByRevenue')).toBe(40)
    expect(getFunnelHeatmapIntensityMax(stats, 'directValueByConversions')).toBe(8)
    expect(getFunnelHeatmapIntensityMax(stats, 'directValueByEpv')).toBe(8)
    expect(getFunnelHeatmapIntensityMax(stats, 'lifetimeValueByRevenue')).toBe(100)
    expect(getFunnelHeatmapIntensityMax(stats, 'lifetimeValueByConversions')).toBe(10)
    expect(getFunnelHeatmapIntensityMax(stats, 'lifetimeValueByEpv')).toBe(20)
  })

  it('returns empty stats when required node id grouping is missing', () => {
    const empty = buildNodeHeatmapStatsFromReport({
      ...report([]),
      columns: [{ name: FUNNEL_HEATMAP_METRIC.nodeViews, type: 'metric' }],
    })

    expect(empty).toEqual({})
  })
})
