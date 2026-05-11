import { beforeEach, describe, expect, it } from 'vitest'
import {
  apiMetricNameForColumnId,
  apiMetricNamesForColumnIds,
  defaultApiMetricNames,
  resolveApiColumnId,
  visibleMetricColumnIdsFromHidden,
} from '@/lib/drilldownMetrics'

describe('drilldown metric mapping', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('maps registry ids to backend metric names', () => {
    expect(apiMetricNameForColumnId('visits')).toBe('Entrances')
    expect(apiMetricNameForColumnId('profitAndLoss')).toBe('P/L')
    expect(apiMetricNameForColumnId('returnOnInvestment')).toBe('ROI')
  })

  it('maps ordered selected ids and ignores non-metric columns', () => {
    expect(apiMetricNamesForColumnIds(['name', 'select', 'visits', 'revenue', 'returnOnInvestment'])).toEqual([
      'Entrances',
      'Revenue',
      'ROI',
    ])
  })

  it('dedupes metrics while preserving first-seen order', () => {
    expect(apiMetricNamesForColumnIds(['revenue', 'visits', 'revenue'])).toEqual([
      'Revenue',
      'Entrances',
    ])
  })

  it('returns undefined for a known but unmapped metric column', () => {
    expect(apiMetricNamesForColumnIds(['visits', 'offerURL'])).toBeUndefined()
  })

  it('has a usable default metric set', () => {
    expect(defaultApiMetricNames()).toContain('Entrances')
    expect(defaultApiMetricNames()).toContain('Revenue')
  })

  it('resolves API aliases and custom event metric names to registry ids', () => {
    expect(resolveApiColumnId('Entrances')).toBe('visits')
    expect(resolveApiColumnId('Unique Entrances')).toBe('visitors')
    expect(resolveApiColumnId('CPCE1')).toBe('costPerEvent1')
    expect(resolveApiColumnId('RPCE2')).toBe('revenuePerEvent2')
    expect(resolveApiColumnId('CE3')).toBe('customEvent3Count')
    expect(resolveApiColumnId('CE4 Rev')).toBe('customEvent4Revenue')
    expect(resolveApiColumnId('CE5 %')).toBe('customEvent5PerVisit')
  })

  it('reads hidden metric ids from shared ff_columns storage', () => {
    localStorage.setItem('ff_columns_report-grid', JSON.stringify(['revenue']))

    const visible = visibleMetricColumnIdsFromHidden('report-grid', {
      defaultVisibleColumnIds: ['visits', 'revenue'],
    })

    expect(visible).toContain('visits')
    expect(visible).not.toContain('revenue')
  })
})
